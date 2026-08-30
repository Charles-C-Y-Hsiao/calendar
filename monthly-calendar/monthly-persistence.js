/* Monthly Persistence / Sync boundary.
 * Owns the complete CalendarData map, REST round-trips, save debounce,
 * WebSocket refresh and the account-dependent labels/links used by Monthly.
 */
let user_name = initCalendarUserId('00000003');
const CALENDAR_CLIENT_ID = `month-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let dayTasks = {};
let saveTimer = null;
let pendingSave = false;

function updateUserNameUI(name) {
  const span = document.querySelector('.user_name_popup .btn-word');
  if (span) span.textContent = `Hi, ${name}`;
  updateModeLinks(name);
}

function updateModeLinks(name) {
  const q = `?userId=${encodeURIComponent(name)}`;
  document.querySelectorAll('.week-link').forEach(link => { link.href = `/week/${q}`; });
  document.querySelectorAll('.day-link').forEach(link => { link.href = `/day/${q}`; });
}

function setStatus(text, cls = '') {
  const statusEl = document.getElementById('save-status');
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `status ${cls}`;
}

async function fetchFromServer({ year, month } = {}) {
  const url = new URL('/calendar', location.origin);
  if (Number.isInteger(year)) url.searchParams.set('year', String(year));
  if (Number.isInteger(month)) url.searchParams.set('month', String(month + 1));
  const res = await fetch(url.toString(), { headers: { 'X-User-Id': user_name } });
  if (!res.ok) throw new Error('GET /calendar failed');
  const data = await res.json();
  if (!data || typeof data !== 'object') throw new Error('Invalid CalendarData payload');
  return data;
}

async function postToServer(payload) {
  setStatus('Saving...', 'saving');
  const res = await fetch('/calendar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user_name,
      'X-Client-Id': CALENDAR_CLIENT_ID
    },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || 'POST /calendar failed');
  setStatus('Saved ✓');
}

function persist() {
  pendingSave = true;
  setStatus('Saving...', 'saving');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await postToServer(dayTasks);
      pendingSave = false;
    } catch (error) {
      console.error(error);
      setStatus(`Save failed: ${error.message}`, 'error');
    }
  }, 500);
}

async function rerenderFromDayTasks() {
  try {
    setStatus('Loading...');
    dayTasks = await fetchFromServer();
    setStatus('Loaded ✓');
    initTaskUIsFromStorage();
  } catch (error) {
    console.error(error);
    setStatus(`Load failed: ${error.message}`, 'error');
    dayTasks = {};
  }
}

function rerenderFromMemory() {
  setStatus('Loaded ✓');
  initTaskUIsFromStorage();
}

function connectCalendarWS() {
  const ws = window.createMonthlyCalendarWebSocket(user_name);

  ws.addEventListener('open', () => console.log('[Monthly WS] connected'));
  ws.addEventListener('message', (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch (error) {
      console.warn('[Monthly WS] parse error', error);
      return;
    }
    if (message.type === 'calendar-init') {
      dayTasks = message.payload || {};
      rerenderFromDayTasks();
    } else if (message.type === 'calendar-updated') {
      if (message.sourceClientId && message.sourceClientId === CALENDAR_CLIENT_ID) return;
      dayTasks = message.payload || {};
      rerenderFromMemory();
    }
  });
  ws.addEventListener('close', () => {
    console.log('[Monthly WS] disconnected, retry in 3s...');
    setTimeout(connectCalendarWS, 3000);
  });
  ws.addEventListener('error', error => console.error('[Monthly WS] error', error));
}

document.addEventListener('DOMContentLoaded', () => {
  updateModeLinks(user_name);
  connectCalendarWS();
});

bindCalendarUserStorageSync((nextUserId) => {
  if (nextUserId === user_name) return;
  user_name = nextUserId;
  location.reload();
});

window.addEventListener('beforeunload', () => {
  if (pendingSave) {
    navigator.sendBeacon('/calendar', new Blob([JSON.stringify(dayTasks)], { type: 'application/json' }));
  }
});
