 function calcGaps(myTrain) {
      const myPos = myTrain.pos;
      const myDir = myTrain.dir;
      const sameDir = simTrains.filter(t => String(t.id).trim() !== String(myTrain.id).trim() && t.dir === myDir);

      let realFront = null, realFrontD = Infinity;
      let realRear = null, realRearD = Infinity;

      sameDir.forEach(t => {
        let dFront, dRear;
        if (myDir === 'up') {
          dFront = t.pos - myPos; if (dFront <= 0) dFront += N;
          dRear = myPos - t.pos; if (dRear <= 0) dRear += N;
        } else {
          dFront = myPos - t.pos; if (dFront <= 0) dFront += N;
          dRear = t.pos - myPos; if (dRear <= 0) dRear += N;
        }
        if (dFront < realFrontD) { realFrontD = dFront; realFront = t; }
        if (dRear < realRearD) { realRearD = dRear; realRear = t; }
      });

      return {
        front: realFront ? { train: realFront, sec: Math.round(realFrontD * 120), stns: Math.max(0, Math.round(realFrontD)) } : null,
        rear: realRear ? { train: realRear, sec: Math.round(realRearD * 120), stns: Math.max(0, Math.round(realRearD)) } : null
      };
    }

    function secToStr(sec) {
      if (sec < 60) return sec + '초';
      const m = Math.floor(sec / 60), s = sec % 60;
      return s > 0 ? `${m}분${s}초` : `${m}분`;
    }

    function timeClass(sec) {
      if (sec < 90) return 'warn';
      if (sec < 180) return 'caution';
      return 'ok';
    }

    function updateGapPanel() {
      const els = ['myTrainNo', 'myStnName', 'frontTrainNo', 'frontTime', 'frontStn', 'frontStns', 'rearTrainNo', 'rearTime', 'rearStn', 'rearStns'];
      if (!MY_TRAIN_ID) {
        els.forEach(id => document.getElementById(id).textContent = id.includes('No') || id.includes('Time') || id.includes('Stn') ? '----' : '미설정');
        return;
      }

      const my = simTrains.find(t => String(t.id).trim() === MY_TRAIN_ID || String(t.num).trim() === MY_TRAIN_ID);
      if (!my) {
        document.getElementById('myTrainNo').textContent = MY_TRAIN_ID;
        document.getElementById('myStnName').textContent = '미운행';
        return;
      }

      document.getElementById('myTrainNo').textContent = my.num || my.id || MY_TRAIN_ID;
      document.getElementById('myStnName').textContent = STATIONS[Math.min(Math.round(my.pos), N - 1)].n;

      const g = calcGaps(my);

      if (g.front) {
        const cls = timeClass(g.front.sec);
        document.getElementById('frontTrainNo').textContent = g.front.train.num || g.front.train.id;
        document.getElementById('frontBox').className = 'gap-box ' + cls;
        document.getElementById('frontTime').className = 'gap-time ' + cls;
        document.getElementById('frontTime').textContent = secToStr(g.front.sec);
        document.getElementById('frontStn').textContent = STATIONS[Math.min(Math.round(g.front.train.pos), N - 1)].n;
        document.getElementById('frontStns').textContent = g.front.stns + '역 앞';
        document.getElementById('sumFront').textContent = secToStr(g.front.sec);
        document.getElementById('sumFront').className = 's-val ' + cls;
      }
      if (g.rear) {
        const cls = timeClass(g.rear.sec);
        document.getElementById('rearTrainNo').textContent = g.rear.train.num || g.rear.train.id;
        document.getElementById('rearBox').className = 'gap-box ' + cls;
        document.getElementById('rearTime').className = 'gap-time ' + cls;
        document.getElementById('rearTime').textContent = secToStr(g.rear.sec);
        document.getElementById('rearStn').textContent = STATIONS[Math.min(Math.round(g.rear.train.pos), N - 1)].n;
        document.getElementById('rearStns').textContent = g.rear.stns + '역 뒤';
        document.getElementById('sumRear').textContent = secToStr(g.rear.sec);
        document.getElementById('sumRear').className = 's-val blue';
      }
    }

    function renderGapPage() {
      const list = document.getElementById('gapList');
      const warnBar = document.getElementById('gapWarnBar');
      let warnCount = 0;

      list.innerHTML = simTrains.map(t => {
        const isMy = MY_TRAIN_ID && (String(t.id).trim() === MY_TRAIN_ID || String(t.num).trim() === MY_TRAIN_ID);
        const g = calcGaps(t);
        const fSec = g.front ? g.front.sec : 999;
        const rSec = g.rear ? g.rear.sec : 999;
        const fStns = g.front ? g.front.stns : 0;

        if (fSec < 90 || rSec < 90) warnCount++;

        return `<div class="gap-train-card" style="${isMy ? 'border:2px solid var(--gold);background:var(--gold-bg);' : ''}">
      <div class="gtc-head">
        <div class="gtc-num">${isMy ? '🚇 내 열차 — ' : ''}${t.num}호 (${STATIONS[Math.min(Math.round(t.pos), N - 1)].n})</div>
        <span class="gtc-type ${t.dir} ${t.express ? 'express' : ''}">${t.dir === 'up' ? '상행' : '하행'}${t.express ? ' 급행' : ' 일반'}</span>
      </div>
      <div class="gap-metrics">
        <div class="gm-box">
          <div class="gm-val" style="color:${fSec < 90 ? 'var(--red)' : fSec < 180 ? 'var(--orange)' : 'var(--green)'}">${fSec >= 999 ? '-' : secToStr(fSec)}</div>
          <div class="gm-lab">전방 시간</div>
        </div>
        <div class="gm-box">
          <div class="gm-val" style="color:${fSec < 90 ? 'var(--red)' : fSec < 180 ? 'var(--orange)' : 'var(--green)'}">${fSec >= 999 ? '-' : fStns + '역'}</div>
          <div class="gm-lab">전방 간격</div>
        </div>
        <div class="gm-box">
          <div class="gm-val" style="color:var(--down)">${rSec >= 999 ? '-' : secToStr(rSec)}</div>
          <div class="gm-lab">후방 시간</div>
        </div>
      </div>
    </div>`;
      }).join('');

      if (warnCount > 0) {
        warnBar.classList.add('show');
        document.getElementById('gapWarnMsg').textContent = `간격 주의 열차 ${warnCount}대 — 90초 미만 근접 운행`;
      } else {
        warnBar.classList.remove('show');
      }
    }
