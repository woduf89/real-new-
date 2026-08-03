// ── PDF 엔진 및 DB 안정화 로직 ──
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    let pdfFiles = [], selectedFileIdx = -1, lastSearchTerm = '', viewerDoc = null, viewerPage = 1, viewerTotalPages = 1;
    const DB_NAME = 'line9manual_db', DB_VER = 1, STORE = 'pdfs';
    let db = null;

    function openDB() {
      return new Promise((res, rej) => {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { keyPath: 'name' });
        req.onsuccess = e => { db = e.target.result; res(db); };
        req.onerror = e => rej(e);
      });
    }

    async function saveToDB(name, data) {
      if (!db) await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ name, data });
        tx.oncomplete = res;
        tx.onerror = rej;
      });
    }

    async function getAllFromDB() {
      if (!db) await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = e => res(e.target.result);
        req.onerror = rej;
      });
    }

    async function loadPdfHeaderOnly(name, arrayBuffer) {
      const data = new Uint8Array(arrayBuffer.slice(0));
      const doc = await pdfjsLib.getDocument({ data }).promise;
      return {
        name,
        doc,
        pages: null,
        data: arrayBuffer
      };
    }

    async function handlePdfUpload(event) {
      const files = [...event.target.files];
      if (!files.length) return;

      document.getElementById('loadingText').textContent = 'PDF 저장 중...';
      document.getElementById('loadingOverlay').classList.add('show');

      try {
        for (const file of files) {
          if (pdfFiles.find(p => p.name === file.name)) continue;
          const ab = await file.arrayBuffer();
          const pdfObj = await loadPdfHeaderOnly(file.name, ab);
          pdfFiles.push(pdfObj);
          await saveToDB(file.name, ab);
        }
      } catch (e) {
        alert('PDF 저장 중 오류가 발생했습니다.');
      } finally {
        document.getElementById('loadingOverlay').classList.remove('show');
        event.target.value = '';
        rebuildFileTabs();
        updatePdfResultsArea();
      }
    }

    async function loadSavedPdfs() {
      try {
        const saved = await getAllFromDB();
        if (!saved || !saved.length) return;

        document.getElementById('loadingText').textContent = '저장된 PDF 로딩 중...';
        document.getElementById('loadingOverlay').classList.add('show');

        for (const item of saved) {
          const pdfObj = await loadPdfHeaderOnly(item.name, item.data);
          pdfFiles.push(pdfObj);
        }
      } catch (e) {
        console.error(e);
      } finally {
        document.getElementById('loadingOverlay').classList.remove('show');
        rebuildFileTabs();
        updatePdfResultsArea();
      }
    }

    function rebuildFileTabs() {
      const tabs = document.getElementById('pdfFileTabs');
      tabs.innerHTML = `<div class="pdf-ftab ${selectedFileIdx === -1 ? 'active' : ''}" data-idx="-1" onclick="selectPdfFile(-1)">전체</div>`
        + pdfFiles.map((p, i) => `
      <div class="pdf-ftab ${selectedFileIdx === i ? 'active' : ''}" data-idx="${i}" onclick="selectPdfFile(${i})">
        📄 ${p.name.replace('.pdf', '')}
      </div>`).join('')
        + `<div class="pdf-add-btn" onclick="document.getElementById('pdfUpload').click()">+ 추가</div>`;
    }

    function selectPdfFile(idx) {
      selectedFileIdx = idx;
      rebuildFileTabs();
      if (lastSearchTerm) searchPdf();
      else updatePdfResultsArea();
    }

    function updatePdfResultsArea() {
      const res = document.getElementById('pdfResults');
      if (!pdfFiles.length) {
        res.innerHTML = `<div class="pdf-empty">
      <div class="pdf-empty-icon">📄</div>
      <div class="pdf-empty-title">PDF 매뉴얼을 등록하세요</div>
      <div class="pdf-empty-desc">+ 추가 버튼으로 고장 조치 매뉴얼 PDF를 추가하면<br>자동으로 저장되어 검색할 수 있습니다</div>
      <br><button class="search-btn" onclick="document.getElementById('pdfUpload').click()">+ PDF 추가</button>
    </div>`;
      } else {
        res.innerHTML = `<div class="pdf-empty">
      <div class="pdf-empty-icon">🔍</div>
      <div class="pdf-empty-title">${pdfFiles.length}개 파일 로드됨</div>
      <div class="pdf-empty-desc">키워드를 입력해서 매뉴얼 내용을 검색하세요</div>
    </div>`;
      }
    }

    async function ensurePdfIndexed(pf) {
      if (pf.pages) return;

      if (!pf.doc && pf.data) {
        const data = new Uint8Array(pf.data.slice(0));
        pf.doc = await pdfjsLib.getDocument({ data }).promise;
      }

      const pages = [];
      for (let i = 1; i <= pf.doc.numPages; i++) {
        const pg = await pf.doc.getPage(i);
        const content = await pg.getTextContent();
        const text = content.items.map(it => it.str).join(' ');
        pages.push({ num: i, text });
      }
      pf.pages = pages;
    }

    async function searchPdf() {
      const term = document.getElementById('pdfSearchInput').value.trim();
      if (!term) { updatePdfResultsArea(); return; }
      lastSearchTerm = term;
      const res = document.getElementById('pdfResults');

      if (!pdfFiles.length) {
        res.innerHTML = `<div class="no-results">등록된 PDF가 없습니다.</div>`;
        return;
      }

      document.getElementById('loadingText').textContent = '매뉴얼 검색 중...';
      document.getElementById('loadingOverlay').classList.add('show');

      try {
        const targetFiles = selectedFileIdx === -1 ? pdfFiles : [pdfFiles[selectedFileIdx]].filter(Boolean);

        for (const pf of targetFiles) {
          await ensurePdfIndexed(pf);
        }

        const keywords = term.split(/\s+/).filter(Boolean);
        const results = [];

        targetFiles.forEach(pf => {
          pf.pages.forEach(pg => {
            const txt = pg.text;
            const lower = txt.toLowerCase();
            if (keywords.every(kw => lower.includes(kw.toLowerCase()))) {
              const kw = keywords[0].toLowerCase();
              const idx = lower.indexOf(kw);
              const start = Math.max(0, idx - 60);
              const end = Math.min(txt.length, idx + 120);
              let snippet = txt.substring(start, end).trim();
              keywords.forEach(k => {
                const re = new RegExp('(' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                snippet = snippet.replace(re, '<mark>$1</mark>');
              });
              if (start > 0) snippet = '...' + snippet;
              if (end < txt.length) snippet += '...';
              results.push({ file: pf.name, page: pg.num, snippet, pf });
            }
          });
        });

        if (!results.length) {
          res.innerHTML = `<div class="no-results">"${term}"에 대한 검색 결과가 없습니다.</div>`;
          return;
        }

        res.innerHTML = `<div class="result-count">"${term}" 검색결과 ${results.length}건</div>`
          + results.map((r, ri) => `
      <div class="result-card" onclick="openPdfViewer(${ri})">
        <div class="rc-head">
          <span class="rc-file">📄 ${r.file.replace('.pdf', '')}</span>
          <span class="rc-page">p.${r.page}</span>
        </div>
        <div class="rc-text">${r.snippet}</div>
      </div>`).join('');

        window._searchResults = results;
      } catch (e) {
        alert('검색 수행 중 오류가 발생했습니다.');
      } finally {
        document.getElementById('loadingOverlay').classList.remove('show');
      }
    }

    async function openPdfViewer(resultIdx) {
      const r = window._searchResults[resultIdx];
      if (!r) return;

      const pf = r.pf;
      document.getElementById('loadingText').textContent = 'PDF 불러오는 중...';
      document.getElementById('loadingOverlay').classList.add('show');

      try {
        if (!pf.doc && pf.data) {
          const data = new Uint8Array(pf.data.slice(0));
          pf.doc = await pdfjsLib.getDocument({ data }).promise;
        }

        viewerDoc = pf.doc;
        viewerPage = r.page;
        viewerTotalPages = pf.doc.numPages;
        document.getElementById('pdfViewerTitle').textContent = r.file.replace('.pdf', '');
        document.getElementById('pdfViewer').classList.add('show');
        await renderPdfPage();
      } catch (e) {
        alert('PDF를 불러올 수 없습니다.');
      } finally {
        document.getElementById('loadingOverlay').classList.remove('show');
      }
    }

    function closePdfViewer() {
      document.getElementById('pdfViewer').classList.remove('show');
    }

    async function renderPdfPage() {
      if (!viewerDoc) return;
      const wrap = document.getElementById('pdfCanvasWrap');
      wrap.innerHTML = '<div style="color:var(--txt3);padding:20px;text-align:center">페이지 로딩 중...</div>';
      document.getElementById('pdfPageLabel').textContent = `${viewerPage} / ${viewerTotalPages}`;
      document.getElementById('prevPageBtn').disabled = viewerPage <= 1;
      document.getElementById('nextPageBtn').disabled = viewerPage >= viewerTotalPages;

      const page = await viewerDoc.getPage(viewerPage);

      // [수정] 화면 폭 축소 대신 원본 고배율(1.8배)로 렌더링하여 크고 선명하게 표시
      const DESIRED_SCALE = 1.8; // 필요시 2.0 이상으로 올려 더 크게 조정 가능
      const viewport = page.getViewport({ scale: DESIRED_SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 스크롤 및 터치 조작이 원활하도록 스타일 지정
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = 'auto';
      canvas.style.maxWidth = 'none'; // 자동 축소 방지

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      wrap.innerHTML = '';
      wrap.appendChild(canvas);
      wrap.scrollTop = 0;
      wrap.scrollLeft = 0;
    }

    function changePdfPage(delta) {
      const newPage = viewerPage + delta;
      if (newPage < 1 || newPage > viewerTotalPages) return;
      viewerPage = newPage;
      renderPdfPage();
    }
