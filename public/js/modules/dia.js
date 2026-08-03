function updateDiaNumberOptions() {
      const typeSelect = document.getElementById('diaTypeSelect');
      const numSelect = document.getElementById('diaNumSelect');
      const selectedType = typeSelect.value;

      numSelect.innerHTML = '<option value="">-- 다이아 번호 선택 --</option>';

      if (!selectedType || !DIA_MAP[selectedType]) {
        numSelect.disabled = true;
        return;
      }

      const diaList = DIA_MAP[selectedType];
      for (const diaNum in diaList) {
        const option = document.createElement('option');
        option.value = diaList[diaNum];
        option.textContent = diaNum;
        numSelect.appendChild(option);
      }
      numSelect.disabled = false;
    }

    async function jumpToDiaPage() {
      const numSelect = document.getElementById('diaNumSelect');
      const targetPage = parseInt(numSelect.value, 10);

      if (!targetPage) {
        alert('조회할 다이아 번호를 선택해 주세요.');
        return;
      }

      if (!pdfFiles.length) {
        alert('등록된 PDF 문서가 없습니다. [매뉴얼] 탭에서 다이아 PDF를 먼저 등록해 주세요.');
        return;
      }

      const diaPdf = pdfFiles.find(p => /다이아|dia|시간표|도표/i.test(p.name)) || pdfFiles[0];

      if (diaPdf) {
        document.getElementById('loadingText').textContent = '다이아 PDF 로딩 중...';
        document.getElementById('loadingOverlay').classList.add('show');
        try {
          if (!diaPdf.doc && diaPdf.data) {
            const data = new Uint8Array(diaPdf.data.slice(0));
            diaPdf.doc = await pdfjsLib.getDocument({ data }).promise;
          }
          if (diaPdf.doc) {
            viewerDoc = diaPdf.doc;
            viewerPage = Math.min(targetPage, diaPdf.doc.numPages);
            viewerTotalPages = diaPdf.doc.numPages;
            document.getElementById('pdfViewerTitle').textContent = diaPdf.name.replace('.pdf', '') + ' (자동 연동)';
            document.getElementById('pdfViewer').classList.add('show');
            await renderPdfPage();
          }
        } catch (e) {
          alert('PDF 문서를 불러오는 중 오류가 발생했습니다.');
        } finally {
          document.getElementById('loadingOverlay').classList.remove('show');
        }
      }
    }
