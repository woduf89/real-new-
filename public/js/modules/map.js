 function promptTrainNo() {
      const v = window.prompt('지금 몰고 있는 열차번호를 입력하세요 (예: 9116)', MY_TRAIN_MANUAL);
      if (v === null) return;
      MY_TRAIN_MANUAL = v.trim();
      localStorage.setItem('myTrainNo', MY_TRAIN_MANUAL);
      updateMyTrainId();
      renderMap();
      updateGapPanel();
    }

    function updateMyTrainId() {
      const badge = document.getElementById('myTrainBadge');
      const statusEl = document.getElementById('myTrainStatus');

      if (MY_TRAIN_MANUAL) {
        MY_TRAIN_ID = String(MY_TRAIN_MANUAL).trim();
        const found = simTrains.some(t => String(t.id).trim() === MY_TRAIN_ID || String(t.num).trim() === MY_TRAIN_ID);
        if (badge) badge.textContent = `내 열차 ${MY_TRAIN_MANUAL}`;
        if (statusEl) {
          statusEl.textContent = found ? '실시간 위치 추적 중 ✓' : `⚠ 실시간 목록에 ${MY_TRAIN_MANUAL}호 없음`;
        }
      } else {
        MY_TRAIN_ID = apiMode ? null : 'U1';
        if (badge) badge.textContent = '내 열차 설정';
        if (statusEl) statusEl.textContent = '"내 열차 설정"을 눌러 열차번호를 입력하세요';
      }
    }

    function initSim() {
      simTrains = [];
      [0, 4, 8, 12, 16, 20, 24, 28, 33].forEach((pos, i) => {
        simTrains.push({
          id: 'U' + (i + 1), dir: 'up', pos: pos + Math.random() * .5,
          express: i % 3 === 0, num: `90${10 + i}`, speed: i % 3 === 0 ? .065 : .038
        });
      });
      [2, 6, 10, 14, 18, 22, 26, 30, 35].forEach((pos, i) => {
        simTrains.push({
          id: 'D' + (i + 1), dir: 'down', pos: pos + Math.random() * .5,
          express: i % 3 === 0, num: `91${10 + i}`, speed: i % 3 === 0 ? .065 : .038
        });
      });
    }

    function stepSim() {
      simTrains.forEach(t => {
        if (t.dir === 'up') {
          t.pos += t.speed;
          if (t.pos >= N - 1) t.pos = 0;
        } else {
          t.pos -= t.speed;
          if (t.pos <= 0) t.pos = N - 1;
        }
      });
      renderMap();
      updateGapPanel();
      if (document.getElementById('gapPage').classList.contains('active')) renderGapPage();
      document.getElementById('lastUpd').textContent = '갱신: ' + new Date().toLocaleTimeString('ko-KR');
    }

    function renderStations() {
      const makeHtml = (s, i) => `
    <div class="stn ${s.e ? 'express' : ''}" id="stn_${i}">
      <div class="stn-name ${s.e ? 'express' : ''}">${s.n}</div>
      <div class="stn-icon">&nbsp;</div>
      <div class="stn-circle up"></div>
      <div class="stn-bottom"></div>
      <div class="stn-circle down"></div>
      <div class="stn-name-down ${s.e ? 'express' : ''}">${s.n}</div>
    </div>`;

      document.getElementById('stationsRow1').innerHTML = STATIONS.slice(0, CUT_IDX + 1).map((s, i) => makeHtml(s, i)).join('');
      document.getElementById('stationsRow2').innerHTML = STATIONS.slice(CUT_IDX + 1).map((s, i) => makeHtml(s, i + CUT_IDX + 1)).join('');
    }

    function getStationX(secIdx, stnIdx) {
      const sec = document.getElementById('sec' + secIdx);
      const nodes = sec.querySelectorAll('.stn');
      const relIdx = secIdx === 1 ? stnIdx : stnIdx - (CUT_IDX + 1);
      if (!nodes[relIdx]) return 0;
      const sr = sec.getBoundingClientRect();
      const nr = nodes[relIdx].getBoundingClientRect();
      return nr.left - sr.left + nr.width / 2;
    }

    function renderMap() {
      const m1 = document.getElementById('trainMarkers1');
      const m2 = document.getElementById('trainMarkers2');
      m1.innerHTML = ''; m2.innerHTML = '';

      simTrains.forEach(t => {
        const idxF = Math.floor(t.pos);
        const idxC = Math.min(idxF + 1, N - 1);
        const secIdx = idxF <= CUT_IDX ? 1 : 2;

        if (secIdx === 1 && idxC > CUT_IDX) return;

        const frac = t.pos - idxF;
        const x = getStationX(secIdx, idxF) + (getStationX(secIdx, idxC) - getStationX(secIdx, idxF)) * frac;
        const isUp = t.dir === 'up';
        const topPx = isUp ? 80 : 180;
        const isMy = MY_TRAIN_ID && (String(t.id).trim() === MY_TRAIN_ID || String(t.num).trim() === MY_TRAIN_ID);

        const div = document.createElement('div');
        div.className = 'train-marker';
        div.style.left = x + 'px';
        div.style.top = topPx + 'px';
        div.innerHTML = `
      <div class="train-body ${isUp ? 'up' : 'down'} ${t.express ? 'express-t' : ''} ${isMy ? 'my' : ''}">
        ${t.express ? '급행' : '일반'}
      </div>
      <div class="train-num ${isMy ? 'my' : ''}">${isMy ? '🚇' + t.num : t.num}</div>`;

        if (secIdx === 1) m1.appendChild(div);
        else m2.appendChild(div);
      });
    }
