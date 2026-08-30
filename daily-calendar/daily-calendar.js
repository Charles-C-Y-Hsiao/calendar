const DAILY_CLIENT_ID = `daily-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_USER_ID = '00666888';

let userId = initCalendarUserId(DEFAULT_USER_ID);
let currentDate = startOfToday();
let dayItems = [];
let evergreenItems = [];
let activeFilter = 'all';
let ws = null;
let editingItemId = null;
let editingEvergreenId = null;
let draggingItemId = null;
let draggingEvergreenId = null;
let todoPointerDrag = null;
let evergreenPointerDrag = null;
let isEditMode = false;
let isEvergreenEditMode = false;
window.dailyUserId = userId;

const els = {
  weekLink: document.getElementById('weekLink'),
  monthLink: document.getElementById('monthLink'),
  dateTitleButton: document.getElementById('dateTitleButton'),
  datePicker: document.getElementById('datePicker'),
  dateTitle: document.getElementById('dateTitle'),
  weekdayLabel: document.getElementById('weekdayLabel'),
  status: document.getElementById('save-status'),
  userButton: document.getElementById('show-user-name'),
  userName: document.querySelector('#show-user-name .btn-word'),
  form: document.getElementById('todoForm'),
  evergreenForm: document.getElementById('evergreenForm'),
  evergreenAdd: document.getElementById('evergreenAdd'),
  evergreenEditModeToggle: document.getElementById('evergreenEditModeToggle'),
  evergreenQuickInput: document.getElementById('evergreenQuickInput'),
  evergreenList: document.getElementById('evergreenList'),
  evergreenEmpty: document.getElementById('evergreenEmpty'),
  evergreenDialog: document.getElementById('evergreenDialog'),
  evergreenDialogTitle: document.getElementById('evergreenDialogTitle'),
  evergreenClose: document.getElementById('evergreenClose'),
  evergreenCancel: document.getElementById('evergreenCancel'),
  evergreenSave: document.getElementById('evergreenSave'),
  evergreenInput: document.getElementById('evergreenInput'),
  evergreenPriority: document.getElementById('evergreenPriority'),
  evergreenStatus: document.getElementById('evergreenStatus'),
  startTime: document.getElementById('startTime'),
  endTime: document.getElementById('endTime'),
  taskInput: document.getElementById('taskInput'),
  filters: Array.from(document.querySelectorAll('.filter')),
  editModeToggle: document.getElementById('editModeToggle'),
  deleteAll: document.getElementById('deleteAll'),
  todos: document.getElementById('todos'),
  emptyState: document.getElementById('emptyState'),
  overlay: document.getElementById('user-dialog-overlay'),
  userDialog: document.getElementById('userDialog'),
  userInput: document.getElementById('textInput'),
  loginUser: document.getElementById('loginUser'),
  clearUser: document.getElementById('clearUser'),
  closeDialog: document.getElementById('dialog-close-btn'),
  taskEditDialog: document.getElementById('taskEditDialog'),
  taskEditClose: document.getElementById('taskEditClose'),
  taskEditCancel: document.getElementById('taskEditCancel'),
  taskEditSave: document.getElementById('taskEditSave'),
  editTaskDate: document.getElementById('editTaskDate'),
  editStartTime: document.getElementById('editStartTime'),
  editEndTime: document.getElementById('editEndTime'),
  editTaskInput: document.getElementById('editTaskInput'),
};

init();

function init() {
  fillTimeOptions(els.startTime, '08:00');
  fillTimeOptions(els.endTime, '09:00');
  fillTimeOptions(els.editStartTime, '08:00');
  fillTimeOptions(els.editEndTime, '09:00');
  updateUserDisplay();
  updateModeLinks();
  bindEvents();
  connectWs();
  loadEvergreen();
  loadCurrentDay();
}

function bindEvents() {
  els.dateTitleButton.addEventListener('click', () => {
    if (typeof els.datePicker.showPicker === 'function') els.datePicker.showPicker();
    else els.datePicker.focus();
  });
  els.datePicker.addEventListener('change', () => {
    const next = parseDateKey(els.datePicker.value);
    if (!next) return;
    currentDate = next;
    loadCurrentDay();
  });

  els.form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = els.taskInput.value.trim();
    if (!text) return;
    const start = els.startTime.value;
    const end = els.endTime.value;
    if (hhmmToTotal(start) >= hhmmToTotal(end)) {
      setStatus('時間錯誤', 'error');
      return;
    }

    dayItems.push({
      id: uid(),
      start_time: start,
      end_time: end,
      text,
      completed: false,
    });
    sortItems();
    els.taskInput.value = '';
    renderTodos();
    await saveCurrentDay();
  });
  els.evergreenForm.addEventListener('submit', addEvergreenFromForm);
  els.evergreenEditModeToggle.addEventListener('click', () => {
    setEvergreenEditMode(!isEvergreenEditMode);
  });
  els.evergreenClose.addEventListener('click', closeEvergreenEditor);
  els.evergreenCancel.addEventListener('click', closeEvergreenEditor);
  els.evergreenSave.addEventListener('click', saveEvergreenEditor);
  els.evergreenInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') saveEvergreenEditor();
    if (event.key === 'Escape') closeEvergreenEditor();
  });

  els.filters.forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter || 'all';
      els.filters.forEach(item => item.classList.toggle('active', item === button));
      renderTodos();
    });
  });

  els.editModeToggle.addEventListener('click', async () => {
    if (isEditMode) {
      setEditMode(false);
      return;
    }
    const ok = await openDailyConfirmDialog({
      title: 'Enter edit mode?',
      message: 'Edit mode shows batch delete and drag controls for this day.',
      okText: 'Enter',
      autoConfirm: window.calendarRuntimeConfig?.editModeAutoConfirm,
    });
    if (ok) setEditMode(true);
  });

  els.deleteAll.addEventListener('click', async () => {
    if (!dayItems.length) return;
    const verified = await openDeleteAllUserCheckDialogV2();
    if (!verified) return;
    const dateKey = formatDate(currentDate);
    const ok = await openDailyConfirmDialog({
      title: 'Delete current day?',
      message: `Account ${userId} matched. Delete all tasks on ${dateKey}?`,
      okText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    dayItems = [];
    renderTodos();
    await saveCurrentDay();
  });

  els.taskEditClose.addEventListener('click', closeTaskEditor);
  els.taskEditCancel.addEventListener('click', closeTaskEditor);
  els.taskEditSave.addEventListener('click', saveTaskEditor);
  els.editStartTime.addEventListener('change', () => {
    els.editEndTime.value = getOneHourEndTime(els.editStartTime.value);
  });
  els.editTaskInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') saveTaskEditor();
    if (event.key === 'Escape') closeTaskEditor();
  });

  window.addEventListener('storage', event => {
    if (event.key !== CALENDAR_USER_STORAGE_KEY) return;
    if (!isValidCalendarUserId(event.newValue)) return;
    userId = event.newValue;
    updateUserDisplay();
    updateModeLinks();
    connectWs();
    loadEvergreen();
    loadCurrentDay();
  });
}


function openDailyConfirmDialog({ title, message, okText = 'OK', cancelText = 'Cancel', danger = false, autoConfirm = null }) {
  if (window.actionDialogs?.confirm) {
    return window.actionDialogs.confirm({ title, message, okText, cancelText, danger, autoConfirm });
  }
  return new Promise(resolve => {
    document.querySelectorAll('.daily-confirm-overlay').forEach(node => node.remove());

    const overlay = document.createElement('div');
    overlay.className = 'daily-confirm-overlay';
    overlay.innerHTML = `
      <div class="daily-confirm-dialog" role="dialog" aria-modal="true">
        <div class="daily-confirm-title">${escapeHtml(title)}</div>
        <div class="daily-confirm-message">${escapeHtml(message)}</div>
        <div class="daily-confirm-actions">
          <button type="button" class="daily-confirm-ok ${danger ? 'is-danger' : ''}">${escapeHtml(okText)}</button>
          <button type="button" class="daily-confirm-cancel">${escapeHtml(cancelText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = value => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('.daily-confirm-ok').addEventListener('click', () => close(true));
    overlay.querySelector('.daily-confirm-cancel').addEventListener('click', () => close(false));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(false);
    });
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Enter') close(true);
    });
    overlay.tabIndex = -1;
    overlay.focus();
  });
}

function openDeleteAllUserCheckDialogV2() {
  return new Promise(resolve => {
    document.querySelectorAll('.daily-confirm-overlay').forEach(node => node.remove());
    const expectedUserId = String(userId || '').trim();

    const overlay = document.createElement('div');
    overlay.className = 'daily-confirm-overlay';
    overlay.innerHTML = `
      <div class="daily-confirm-dialog daily-account-confirm" role="dialog" aria-modal="true">
        <button type="button" class="daily-confirm-close" aria-label="Close">
          <i class="fa-regular fa-circle-xmark"></i>
        </button>
        <div class="daily-confirm-title">Verify account</div>
        <div class="daily-confirm-message daily-account-progress counter counter-yellow">Entered 0 / 8 digits</div>
        <label class="daily-account-field">
          <input class="daily-account-input" type="text" inputmode="numeric" maxlength="8" autocomplete="off" placeholder=" ">
          <span class="daily-account-label">login-in name</span>
        </label>
        <div class="daily-confirm-message daily-account-error" aria-live="polite"></div>
        <div class="daily-confirm-actions">
          <button type="button" class="daily-confirm-clear">Clear</button>
          <button type="button" class="daily-confirm-ok" disabled>Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.daily-account-input');
    const progress = overlay.querySelector('.daily-account-progress');
    const error = overlay.querySelector('.daily-account-error');
    const continueButton = overlay.querySelector('.daily-confirm-ok');

    const close = value => {
      overlay.remove();
      resolve(value);
    };

    const update = () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 8);
      const isComplete = input.value.length === 8;
      const isMatched = input.value === expectedUserId;
      progress.textContent = `Entered ${input.value.length} / 8 digits`;
      progress.className = 'daily-confirm-message daily-account-progress counter';
      error.textContent = '';
      input.classList.toggle('is-account-complete', isComplete);
      input.classList.toggle('is-valid', isMatched);
      input.classList.toggle('is-invalid', isComplete && !isMatched);
      continueButton.disabled = !isMatched;
      if (isComplete && !isMatched) {
        progress.classList.add('counter-red', 'weight');
        error.textContent = 'Account does not match the current user.';
      } else if (isComplete) {
        progress.classList.add('counter-blue-strong', 'weight');
      } else if (input.value.length > 0) {
        progress.classList.add('counter-green');
      } else {
        progress.classList.add('counter-yellow');
      }
    };

    const submit = event => {
      event?.preventDefault();
      update();
      if (continueButton.disabled) {
        input.focus();
        return;
      }
      close(true);
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit(event);
      if (event.key === 'Escape') close(false);
    });
    continueButton.addEventListener('click', submit);
    continueButton.addEventListener('pointerup', submit);
    overlay.querySelector('.daily-confirm-close').addEventListener('click', () => close(false));
    overlay.querySelector('.daily-confirm-clear').addEventListener('click', () => {
      input.value = '';
      update();
      input.focus();
    });
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(false);
    });
    input.focus();
    update();
  });
}

function openDeleteAllUserCheckDialog() {
  return new Promise(resolve => {
    document.querySelectorAll('.daily-confirm-overlay').forEach(node => node.remove());
    const expectedUserId = String(userId || '').trim();

    const overlay = document.createElement('div');
    overlay.className = 'daily-confirm-overlay';
    overlay.innerHTML = `
      <div class="daily-confirm-dialog daily-account-confirm" role="dialog" aria-modal="true">
        <button type="button" class="daily-confirm-close" aria-label="Close">
          <i class="fa fa-times"></i>
        </button>
        <div class="daily-confirm-title">Verify account</div>
        <div class="daily-confirm-message daily-account-progress">已輸入 0 / 8 碼</div>
        <label class="daily-account-field">
          <input class="daily-account-input" type="text" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="00000000">
          <i class="fa-regular fa-user daily-account-icon"></i>
        </label>
        <div class="daily-confirm-message daily-account-error" aria-live="polite"></div>
        <div class="daily-confirm-actions">
          <button type="button" class="daily-confirm-clear">
            <i class="fa-solid fa-broom"></i>
            <span>Clear</span>
          </button>
          <button type="button" class="daily-confirm-ok" disabled>Continue</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('.daily-account-input');
    const progress = overlay.querySelector('.daily-account-progress');
    const error = overlay.querySelector('.daily-account-error');
    const login = overlay.querySelector('.daily-confirm-ok');

    const close = value => {
      overlay.remove();
      resolve(value);
    };

    const update = () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 8);
      progress.textContent = `已輸入 ${input.value.length} / 8 碼`;
      error.textContent = '';
      const isComplete = input.value.length === 8;
      const isMatched = input.value === expectedUserId;
      input.classList.toggle('is-valid', isMatched);
      input.classList.toggle('is-invalid', isComplete && !isMatched);
      login.disabled = !isMatched;
      if (isMatched) {
        progress.textContent = '帳號正確，可以繼續刪除確認。';
      } else if (isComplete) {
        error.textContent = '帳號不符合目前使用者。';
      }
    };

    const submit = () => {
      update();
      if (input.value.length !== 8) {
        error.textContent = '請輸入 8 位數帳號。';
        input.focus();
        return;
      }
      if (input.value !== expectedUserId) {
        error.textContent = '帳號不符合目前登入使用者。';
        input.select();
        return;
      }
      close(true);
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') submit();
      if (event.key === 'Escape') close(false);
    });
    overlay.querySelector('.daily-confirm-close').addEventListener('click', () => close(false));
    overlay.querySelector('.daily-confirm-clear').addEventListener('click', () => {
      input.value = '';
      update();
      input.focus();
    });
    login.addEventListener('click', submit);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(false);
    });
    overlay.tabIndex = -1;
    input.focus();
    update();
  });
}


async function loadEvergreen() {
  try {
    const res = await fetch('/evergreen', {
      headers: { 'X-User-Id': userId },
    });
    if (!res.ok) throw new Error('load evergreen failed');
    const data = await res.json();
    evergreenItems = normalizeEvergreenItems(data);
    sortEvergreen();
    normalizeEvergreenOrder();
    renderEvergreen();
  } catch (error) {
    console.error('[daily] evergreen load error', error);
    evergreenItems = [];
    renderEvergreen();
    setStatus('Long-term load failed', 'error');
  }
}

async function loadCurrentDay() {
  updateDateHeader();
  setStatus('載入中', 'saving');
  try {
    const dateKey = formatDate(currentDate);
    const res = await fetch(`/schedule?from=${dateKey}&to=${dateKey}`, {
      headers: { 'X-User-Id': userId },
    });
    if (!res.ok) throw new Error('load failed');
    const data = await res.json();
    dayItems = normalizeItems(data[dateKey] || []);
    sortItems();
    renderTodos();
    setStatus('已載入 ✓');
  } catch (error) {
    console.error('[daily] load error', error);
    dayItems = [];
    renderTodos();
    setStatus('載入失敗', 'error');
  }
}

async function saveEvergreen() {
  setStatus('Saving', 'saving');
  try {
    const res = await fetch('/evergreen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-Client-Id': DAILY_CLIENT_ID,
      },
      body: JSON.stringify(evergreenItems),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.error || 'save evergreen failed');
    setStatus('Saved');
  } catch (error) {
    console.error('[daily] evergreen save error', error);
    setStatus('Long-term save failed', 'error');
  }
}

async function saveCurrentDay() {
  setStatus('儲存中', 'saving');
  try {
    const dateKey = formatDate(currentDate);
    const res = await fetch(`/schedule/${dateKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-Client-Id': DAILY_CLIENT_ID,
      },
      body: JSON.stringify(dayItems),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.error || 'save failed');
    setStatus('已儲存 ✓');
  } catch (error) {
    console.error('[daily] save error', error);
    setStatus('儲存失敗', 'error');
  }
}

async function loadItemsForDate(dateKey) {
  const res = await fetch(`/schedule?from=${dateKey}&to=${dateKey}`, {
    headers: { 'X-User-Id': userId },
  });
  if (!res.ok) throw new Error('load failed');
  const data = await res.json();
  return normalizeItems(data[dateKey] || []);
}

async function saveItemsForDate(dateKey, items) {
  const res = await fetch(`/schedule/${dateKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Client-Id': DAILY_CLIENT_ID,
    },
    body: JSON.stringify(items),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || 'save failed');
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      ...item,
      id: item.id || uid(),
      start_time: isHhmm(item.start_time) ? item.start_time : '08:00',
      end_time: isHhmm(item.end_time) ? item.end_time : '09:00',
      text: String(item.text || ''),
      completed: Boolean(item.completed),
    }));
}

function normalizeEvergreenItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const status = normalizeEvergreenStatus(item.status, item.completed);
      return {
        ...item,
        id: item.id || `e${uid()}`,
        text: String(item.text || ''),
        priority: normalizePriority(item.priority),
        status,
        completed: status === 'done' || Boolean(item.completed),
        createdAt: item.createdAt || new Date().toISOString(),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : null,
      };
    })
    .filter(item => item.text);
}

function sortItems() {
  sortItemList(dayItems);
}

function sortItemList(items) {
  return items.sort(compareItemsByTime);
}

function isAvailabilityItem(item) {
  if (!item || typeof item !== 'object') return false;
  const itemType = String(item.type || item.itemType || '').toLowerCase();
  return itemType === 'availability';
}

function compareItemsByTime(a, b) {
  const time = String(a.start_time || '').localeCompare(String(b.start_time || ''));
  if (time !== 0) return time;
  return String(a.text || '').localeCompare(String(b.text || ''));
}

function renderAvailabilityPeople(item) {
  const people = Array.isArray(item?.availabilityPeople)
    ? item.availabilityPeople.filter(person => person && typeof person === 'object' && String(person.name || '').trim())
    : [];
  if (!people.length) return '<span class="availability-empty">Set people</span>';

  return people.map(person => {
    const status = String(person.status || '').toLowerCase() === 'not-free' ? 'not-free' : 'free';
    const label = status === 'not-free' ? 'not free' : 'free';
    return `<span class="availability-person is-${status}">${escapeHtml(person.name)} ${label}</span>`;
  }).join(' ');
}

function updateDateHeader() {
  const dateKey = formatDate(currentDate);
  els.datePicker.value = dateKey;
  els.dateTitle.textContent = dateKey;
  els.weekdayLabel.textContent = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][currentDate.getDay()];
}

function moveDay(offset) {
  const next = new Date(currentDate);
  next.setDate(next.getDate() + offset);
  currentDate = next;
  loadCurrentDay();
}

function fillTimeOptions(select, selectedValue) {
  let html = '';
  for (let minutes = 7 * 60; minutes <= 19 * 60; minutes += 30) {
    const value = totalToHhmm(minutes);
    html += `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${value}</option>`;
  }
  select.innerHTML = html;
}

function getOneHourEndTime(startValue) {
  if (!isHhmm(startValue)) return '09:00';
  const endTotal = Math.min(hhmmToTotal(startValue) + 60, 19 * 60);
  return totalToHhmm(endTotal);
}

function applyUserIdFromDialog(next = els.userInput.value.trim()) {
  if (!isValidCalendarUserId(next)) {
    els.userInput.focus();
    setStatus('帳號需 8 碼', 'error');
    return;
  }
  userId = next;
  window.dailyUserId = userId;
  setStoredCalendarUserId(userId);
  updateUserDisplay();
  updateModeLinks();
  if (typeof window.closeAccountUserDialog === 'function') window.closeAccountUserDialog();
  connectWs();
  loadCurrentDay();
}

function updateUserDisplay() {
  els.userName.textContent = `Hi, ${userId}`;
}

function updateModeLinks() {
  const q = `?userId=${encodeURIComponent(userId)}`;
  els.weekLink.href = `/week/${q}`;
  els.monthLink.href = `/month/${q}`;
}

function connectWs() {
  if (ws) ws.close();
  ws = window.createDailyCalendarWebSocket(userId);
  ws.addEventListener('message', event => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (error) {
      return;
    }
    if (msg.sourceClientId === DAILY_CLIENT_ID) return;
    if (msg.type !== 'calendar-updated' && msg.type !== 'calendar-init') return;
    const payload = msg.payload || {};
    const dateKey = formatDate(currentDate);
    evergreenItems = normalizeEvergreenItems(payload._evergreen || []);
    sortEvergreen();
    normalizeEvergreenOrder();
    dayItems = normalizeItems(payload[dateKey] || []);
    sortItems();
    renderEvergreen();
    renderTodos();
    setStatus(msg.type === 'calendar-init' ? '已載入 ✓' : '已同步 ✓');
  });
}

function setStatus(text, cls = '') {
  els.status.textContent = text;
  els.status.className = `status ${cls}`.trim();
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isHhmm(value) {
  return /^\d{2}:\d{2}$/.test(String(value || ''));
}

function normalizePriority(value) {
  const priority = String(value || 'high').toLowerCase();
  if (priority === 'medium' || priority === 'low') return priority;
  return 'high';
}

function normalizeEvergreenStatus(value, completed = false) {
  const status = String(value || '').toLowerCase();
  if (status === 'paused' || status === 'done' || status === 'archived') return status;
  if (completed) return 'done';
  return 'active';
}

function hhmmToTotal(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function totalToHhmm(total) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function uid() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
