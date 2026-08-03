let apiMode = false;
let apiTimer = null;

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const pageEl = document.getElementById(name + 'Page');
  if (pageEl) pageEl.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');

  if (name === 'gap') renderGapPage();
}

async function fetchRealTrains() { /* ... */ }
function setModeBadge(mode) { /* ... */ }
function applyRealTrains(trains) { /* ... */ }

async function init() {
  renderStations();
  initSim();
  updateMyTrainId();
  renderMap();
  updateGapPanel();

  const trains = await fetchRealTrains();
  if (trains && trains.length > 0) {
    apiMode = true;
    applyRealTrains(trains);
    setModeBadge('real');
    apiTimer = setInterval(async () => {
      const fresh = await fetchRealTrains();
      if (fresh && fresh.length > 0) {
        applyRealTrains(fresh);
        setModeBadge('real');
      }
    }, 30000);
  } else {
    setModeBadge('sim');
    simTimer = setInterval(() => { stepSim(); }, 900);
  }

  await openDB();
  await loadSavedPdfs();
}

// 앱 실행
init();
