const CALENDAR_USER_STORAGE_KEY = 'calendar.currentUserId';
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

  els.userButton.addEventListener('click', openUserDialog);
  els.overlay.addEventListener('click', closeUserDialog);
  els.closeDialog.addEventListener('click', closeUserDialog);
  els.clearUser.addEventListener('click', () => {
    els.userInput.value = '';
    els.userInput.focus();
  });
  els.loginUser.addEventListener('click', applyUserIdFromDialog);
  els.userInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') applyUserIdFromDialog();
    if (event.key === 'Escape') closeUserDialog();
  });
  els.taskEditClose.addEventListener('click', closeTaskEditor);
  els.taskEditCancel.addEventListener('click', closeTaskEditor);
  els.taskEditSave.addEventListener('click', saveTaskEditor);
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

function renderEvergreen() {
  const visibleItems = evergreenItems.filter(item => item.status !== 'archived');

  els.evergreenList.innerHTML = visibleItems.map(item => {
    const done = item.status === 'done' || item.completed;
    const priority = normalizePriority(item.priority);
    const status = normalizeEvergreenStatus(item.status, item.completed);
    return `
      <li class="evergreen-item ${done ? 'is-done' : ''} ${status === 'archived' ? 'is-archived' : ''}" data-id="${escapeHtml(item.id)}">
        <button class="evergreen-drag row-action" type="button" title="Move">
          <i class="fa-solid fa-grip-vertical"></i>
        </button>
        <input class="evergreen-check" type="checkbox" title="Done" ${done ? 'checked' : ''}>
        <span class="evergreen-main">
          <span class="evergreen-title">${escapeHtml(item.text || '')}</span>
          <span class="evergreen-meta">
            <span class="evergreen-chip priority-${escapeHtml(priority)}">${escapeHtml(priority)}</span>
            <span class="evergreen-chip">${escapeHtml(status)}</span>
          </span>
        </span>
        <span class="evergreen-actions">
          <button class="evergreen-schedule" type="button" title="Schedule today">
            <i class="fa-regular fa-calendar-plus"></i>
          </button>
          <button class="evergreen-edit" type="button" title="Edit">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="evergreen-delete" type="button" title="Archive">
            <i class="fa fa-times"></i>
          </button>
        </span>
      </li>
    `;
  }).join('');

  els.evergreenEmpty.classList.toggle('is-visible', visibleItems.length === 0);

  els.evergreenList.querySelectorAll('.evergreen-item').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('.evergreen-check').addEventListener('change', async event => {
      if (!isEvergreenEditMode) return;
      const item = evergreenItems.find(entry => entry.id === id);
      if (!item) return;
      item.completed = event.target.checked;
      item.status = event.target.checked ? 'done' : 'active';
      renderEvergreen();
      await saveEvergreen();
    });
    row.querySelector('.evergreen-schedule').addEventListener('click', async () => {
      if (!isEvergreenEditMode) return;
      await scheduleEvergreenToday(id);
    });
    row.querySelector('.evergreen-edit').addEventListener('click', () => {
      if (!isEvergreenEditMode) return;
      openEvergreenEditor(id);
    });
    row.querySelector('.evergreen-delete').addEventListener('click', async () => {
      if (!isEvergreenEditMode) return;
      const item = evergreenItems.find(entry => entry.id === id);
      if (!item) return;
      item.status = 'archived';
      renderEvergreen();
      await saveEvergreen();
    });
    const dragBtn = row.querySelector('.evergreen-drag');
    dragBtn.addEventListener('pointerdown', event => {
      event.stopPropagation();
      if (isEvergreenEditMode) return;
      beginEvergreenPointerDrag(event, id, row);
    });
    dragBtn.addEventListener('click', event => event.stopPropagation());
    row.addEventListener('dragstart', event => {
      if (isEvergreenEditMode) {
        event.preventDefault();
        return;
      }
      draggingEvergreenId = id;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    });
    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('is-dragging');
      draggingEvergreenId = null;
      els.evergreenList.querySelectorAll('.evergreen-item.is-drop-target').forEach(item => item.classList.remove('is-drop-target'));
    });
    row.addEventListener('dragover', event => {
      if (!isEvergreenEditMode) return;
      if (!draggingEvergreenId || draggingEvergreenId === id) return;
      event.preventDefault();
      row.classList.add('is-drop-target');
    });
    row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
    row.addEventListener('drop', async event => {
      event.preventDefault();
      row.classList.remove('is-drop-target');
      const sourceId = event.dataTransfer.getData('text/plain') || draggingEvergreenId;
      if (!sourceId || sourceId === id) return;
      const rect = row.getBoundingClientRect();
      const placement = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
      reorderEvergreen(sourceId, id, placement);
      normalizeEvergreenOrder();
      renderEvergreen();
      await saveEvergreen();
    });
  });
}

function beginEvergreenPointerDrag(event, id, row) {
  if (event.button !== 0) return;
  event.preventDefault();
  const state = {
    id,
    row,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    targetRow: null,
    placement: 'before',
  };
  evergreenPointerDrag = state;

  const clearTarget = () => {
    els.evergreenList.querySelectorAll('.evergreen-item.is-drop-target').forEach(item => item.classList.remove('is-drop-target'));
  };

  const updateTarget = pointerEvent => {
    clearTarget();
    const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest('.evergreen-item');
    if (!target || !els.evergreenList.contains(target) || target.dataset.id === id) {
      state.targetRow = null;
      return;
    }
    const rect = target.getBoundingClientRect();
    state.targetRow = target;
    state.placement = pointerEvent.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
    target.classList.add('is-drop-target');
  };

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    clearTarget();
    row.classList.remove('is-dragging');
    evergreenPointerDrag = null;
  };

  const onMove = pointerEvent => {
    if (pointerEvent.pointerId !== state.pointerId) return;
    const dx = Math.abs(pointerEvent.clientX - state.startX);
    const dy = Math.abs(pointerEvent.clientY - state.startY);
    if (dx > 4 || dy > 4) {
      state.moved = true;
      row.classList.add('is-dragging');
    }
    if (state.moved) {
      pointerEvent.preventDefault();
      updateTarget(pointerEvent);
    }
  };

  const onUp = async pointerEvent => {
    if (pointerEvent.pointerId !== state.pointerId) return;
    const targetId = state.targetRow?.dataset.id;
    const placement = state.placement;
    cleanup();
    if (!state.moved || !targetId || targetId === id) return;
    reorderEvergreen(id, targetId, placement);
    normalizeEvergreenOrder();
    renderEvergreen();
    await saveEvergreen();
  };

  const onCancel = pointerEvent => {
    if (pointerEvent.pointerId !== state.pointerId) return;
    cleanup();
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

function renderTodos() {
  const filtered = dayItems.filter(item => {
    if (activeFilter === 'completed') return Boolean(item.completed);
    if (activeFilter === 'pending') return !item.completed;
    return true;
  });

  els.todos.innerHTML = filtered.map(item => {
    const checked = item.completed ? 'checked' : '';
    const checkDisabled = isEditMode ? 'disabled' : '';
    return `
      <li class="todo ${item.completed ? 'is-completed' : ''}" data-id="${escapeHtml(item.id)}">
        <input class="todo-check" type="checkbox" title="Complete" ${checked} ${checkDisabled}>
        <button class="drag-btn row-action" type="button" title="Move">
          <i class="fa-solid fa-grip-vertical"></i>
        </button>
        <span class="todo-time">${escapeHtml(item.start_time || '--:--')} ~ ${escapeHtml(item.end_time || '--:--')}</span>
        <span class="todo-name">${escapeHtml(item.text || '')}</span>
        <span class="todo-actions">
          <button class="edit-btn row-action" type="button" title="Edit">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="delete-btn row-action" type="button" title="Delete">
            <i class="fa fa-times"></i>
          </button>
        </span>
      </li>
    `;
  }).join('');

  els.emptyState.classList.toggle('is-visible', filtered.length === 0);

  els.todos.querySelectorAll('.todo').forEach(row => {
    const id = row.dataset.id;
    row.addEventListener('click', async event => {
      if (isEditMode) return;
      if (event.target.closest('button, input')) return;
      await toggleTodo(id);
    });
    row.querySelector('.todo-check').addEventListener('change', async event => {
      if (isEditMode) {
        const item = dayItems.find(entry => entry.id === id);
        event.target.checked = Boolean(item?.completed);
        return;
      }
      const item = dayItems.find(entry => entry.id === id);
      if (!item) return;
      item.completed = event.target.checked;
      row.classList.toggle('is-completed', item.completed);
      await saveCurrentDay();
    });
    row.querySelector('.edit-btn').addEventListener('click', event => {
      event.stopPropagation();
      openTaskEditor(id);
    });
    row.querySelector('.delete-btn').addEventListener('click', async () => {
      const ok = await openDailyConfirmDialog({
        title: 'Delete task?',
        message: 'This will remove only this task.',
        okText: 'Delete',
        danger: true,
      });
      if (!ok) return;
      dayItems = dayItems.filter(item => item.id !== id);
      renderTodos();
      await saveCurrentDay();
    });
    const dragBtn = row.querySelector('.drag-btn');
    dragBtn.addEventListener('pointerdown', event => {
      event.stopPropagation();
      if (!isEditMode) return;
      beginTodoPointerDrag(event, id, row);
    });
    dragBtn.addEventListener('click', event => event.stopPropagation());
    row.addEventListener('dragstart', event => {
      if (!isEditMode) {
        event.preventDefault();
        return;
      }
      draggingItemId = id;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    });
    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('is-dragging');
      draggingItemId = null;
      els.todos.querySelectorAll('.todo.is-drop-target').forEach(item => item.classList.remove('is-drop-target'));
    });
    row.addEventListener('dragover', event => {
      if (!draggingItemId || draggingItemId === id) return;
      event.preventDefault();
      row.classList.add('is-drop-target');
    });
    row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
    row.addEventListener('drop', async event => {
      event.preventDefault();
      row.classList.remove('is-drop-target');
      const sourceId = event.dataTransfer.getData('text/plain') || draggingItemId;
      if (!sourceId || sourceId === id) return;
      const rect = row.getBoundingClientRect();
      const placement = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
      reorderTodo(sourceId, id, placement);
      applySequentialOneHourTimes();
      renderTodos();
      await saveCurrentDay();
    });
  });
}

function beginTodoPointerDrag(event, id, row) {
  if (event.button !== 0) return;
  event.preventDefault();
  const state = {
    id,
    row,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    targetRow: null,
    placement: 'before',
  };
  todoPointerDrag = state;

  const clearTarget = () => {
    els.todos.querySelectorAll('.todo.is-drop-target').forEach(item => item.classList.remove('is-drop-target'));
  };

  const updateTarget = pointerEvent => {
    clearTarget();
    const target = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)?.closest('.todo');
    if (!target || !els.todos.contains(target) || target.dataset.id === id) {
      state.targetRow = null;
      return;
    }
    const rect = target.getBoundingClientRect();
    state.targetRow = target;
    state.placement = pointerEvent.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
    target.classList.add('is-drop-target');
  };

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    clearTarget();
    row.classList.remove('is-dragging');
    todoPointerDrag = null;
  };

  const onMove = pointerEvent => {
    if (pointerEvent.pointerId !== state.pointerId) return;
    const dx = Math.abs(pointerEvent.clientX - state.startX);
    const dy = Math.abs(pointerEvent.clientY - state.startY);
    if (dx > 4 || dy > 4) {
      state.moved = true;
      row.classList.add('is-dragging');
    }
    if (state.moved) {
      pointerEvent.preventDefault();
      updateTarget(pointerEvent);
    }
  };

  const onUp = async pointerEvent => {
    if (pointerEvent.pointerId !== state.pointerId) return;
    const targetId = state.targetRow?.dataset.id;
    const placement = state.placement;
    cleanup();
    if (!state.moved || !targetId || targetId === id) return;
    reorderTodo(id, targetId, placement);
    applySequentialOneHourTimes();
    renderTodos();
    await saveCurrentDay();
  };

  const onCancel = pointerEvent => {
    if (pointerEvent.pointerId !== state.pointerId) return;
    cleanup();
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}

async function toggleTodo(id) {
  const item = dayItems.find(entry => entry.id === id);
  if (!item) return;
  item.completed = !item.completed;
  renderTodos();
  await saveCurrentDay();
}

function setEditMode(nextValue) {
  isEditMode = Boolean(nextValue);
  document.body.classList.toggle('daily-edit-mode', isEditMode);
  els.editModeToggle.classList.toggle('is-active', isEditMode);
  els.editModeToggle.setAttribute('aria-pressed', String(isEditMode));
  if (!isEditMode) {
    draggingItemId = null;
    todoPointerDrag = null;
    els.todos.querySelectorAll('.todo').forEach(row => {
      row.draggable = false;
      row.classList.remove('is-dragging', 'is-drop-target');
    });
  }
  renderTodos();
}

function openTaskEditor(id) {
  const item = dayItems.find(entry => entry.id === id);
  if (!item) return;
  editingItemId = id;
  els.editStartTime.value = item.start_time || '08:00';
  els.editEndTime.value = item.end_time || '09:00';
  els.editTaskInput.value = item.text || '';
  if (typeof els.taskEditDialog.showModal === 'function') els.taskEditDialog.showModal();
  else els.taskEditDialog.setAttribute('open', '');
  setTimeout(() => els.editTaskInput.select(), 0);
}

function closeTaskEditor() {
  editingItemId = null;
  if (els.taskEditDialog.open && typeof els.taskEditDialog.close === 'function') els.taskEditDialog.close();
  else els.taskEditDialog.removeAttribute('open');
}

function openEvergreenEditor(id = null) {
  const item = evergreenItems.find(entry => entry.id === id);
  editingEvergreenId = item ? item.id : null;
  els.evergreenDialogTitle.textContent = item ? 'Edit long-term item' : 'New long-term item';
  els.evergreenInput.value = item?.text || '';
  els.evergreenPriority.value = normalizePriority(item?.priority);
  els.evergreenStatus.value = normalizeEvergreenStatus(item?.status, item?.completed);
  if (typeof els.evergreenDialog.showModal === 'function') els.evergreenDialog.showModal();
  else els.evergreenDialog.setAttribute('open', '');
  setTimeout(() => els.evergreenInput.select(), 0);
}

function closeEvergreenEditor() {
  editingEvergreenId = null;
  if (els.evergreenDialog.open && typeof els.evergreenDialog.close === 'function') els.evergreenDialog.close();
  else els.evergreenDialog.removeAttribute('open');
}

function setEvergreenEditMode(nextValue) {
  isEvergreenEditMode = Boolean(nextValue);
  document.body.classList.toggle('long-term-edit-mode', isEvergreenEditMode);
  els.evergreenEditModeToggle.classList.toggle('is-active', isEvergreenEditMode);
  els.evergreenEditModeToggle.setAttribute('aria-pressed', String(isEvergreenEditMode));
  renderEvergreen();
}

async function addEvergreenFromForm(event) {
  event.preventDefault();
  const text = els.evergreenQuickInput.value.trim();
  if (!text) return;
  evergreenItems.unshift({
    id: `e${uid()}`,
    text,
    priority: 'high',
    status: 'active',
    completed: false,
    createdAt: new Date().toISOString(),
  });
  els.evergreenQuickInput.value = '';
  normalizeEvergreenOrder();
  renderEvergreen();
  await saveEvergreen();
}

async function saveEvergreenEditor() {
  const text = els.evergreenInput.value.trim();
  if (!text) {
    els.evergreenInput.focus();
    return;
  }

  const priority = normalizePriority(els.evergreenPriority.value);
  const status = normalizeEvergreenStatus(els.evergreenStatus.value);
  const existing = evergreenItems.find(item => item.id === editingEvergreenId);

  if (existing) {
    existing.text = text;
    existing.priority = priority;
    existing.status = status;
    existing.completed = status === 'done';
    existing.updatedAt = new Date().toISOString();
  } else {
    evergreenItems.unshift({
      id: `e${uid()}`,
      text,
      priority,
      status,
      completed: status === 'done',
      createdAt: new Date().toISOString(),
    });
  }

  closeEvergreenEditor();
  normalizeEvergreenOrder();
  renderEvergreen();
  await saveEvergreen();
}

async function scheduleEvergreenToday(id) {
  const item = evergreenItems.find(entry => entry.id === id);
  if (!item) return;
  const start = els.startTime.value;
  const end = els.endTime.value;
  if (hhmmToTotal(start) >= hhmmToTotal(end)) {
    setStatus('Invalid time', 'error');
    return;
  }
  dayItems.push({
    id: uid(),
    start_time: start,
    end_time: end,
    text: item.text,
    completed: false,
    sourceEvergreenId: item.id,
  });
  sortItems();
  renderTodos();
  await saveCurrentDay();
}

async function saveTaskEditor() {
  const item = dayItems.find(entry => entry.id === editingItemId);
  if (!item) return;
  const text = els.editTaskInput.value.trim();
  const start = els.editStartTime.value;
  const end = els.editEndTime.value;
  if (!text) {
    els.editTaskInput.focus();
    return;
  }
  if (hhmmToTotal(start) >= hhmmToTotal(end)) {
    setStatus('時間錯誤', 'error');
    return;
  }
  item.text = text;
  item.start_time = start;
  item.end_time = end;
  closeTaskEditor();
  sortItems();
  renderTodos();
  await saveCurrentDay();
}

function openDailyConfirmDialog({ title, message, okText = 'OK', cancelText = 'Cancel', danger = false }) {
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
          <i class="fa fa-times"></i>
        </button>
        <div class="daily-confirm-title">Verify account</div>
        <div class="daily-confirm-message daily-account-progress">Enter current account to continue.</div>
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
      error.textContent = '';
      input.classList.toggle('is-valid', isMatched);
      input.classList.toggle('is-invalid', isComplete && !isMatched);
      continueButton.disabled = !isMatched;
      if (isMatched) {
        progress.textContent = 'Account matched. Continue to final confirmation.';
      } else if (isComplete) {
        error.textContent = 'Account does not match the current user.';
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
        <div class="daily-confirm-message daily-account-progress">已輸入 0 / 8 number</div>
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
      progress.textContent = `已輸入 ${input.value.length} / 8 number`;
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

function reorderTodo(sourceId, targetId, placement = 'before') {
  const from = dayItems.findIndex(item => item.id === sourceId);
  const target = dayItems.findIndex(item => item.id === targetId);
  if (from < 0 || target < 0 || from === target) return;
  const [moved] = dayItems.splice(from, 1);
  const nextTargetIndex = dayItems.findIndex(item => item.id === targetId);
  const insertAt = nextTargetIndex + (placement === 'after' ? 1 : 0);
  dayItems.splice(insertAt, 0, moved);
}

function applySequentialOneHourTimes() {
  if (!dayItems.length) return;
  let cursor = hhmmToTotal(dayItems[0].start_time || '08:00');
  dayItems.forEach(item => {
    item.start_time = totalToHhmm(cursor);
    item.end_time = totalToHhmm(cursor + 60);
    cursor += 60;
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
  dayItems.sort((a, b) => {
    const time = String(a.start_time || '').localeCompare(String(b.start_time || ''));
    if (time !== 0) return time;
    return String(a.text || '').localeCompare(String(b.text || ''));
  });
}

function sortEvergreen() {
  const priorityWeight = { high: 0, medium: 1, low: 2 };
  const statusWeight = { active: 0, paused: 1, done: 2, archived: 3 };
  evergreenItems.sort((a, b) => {
    const aOrder = Number(a.order);
    const bOrder = Number(b.order);
    const aHasOrder = Number.isFinite(aOrder);
    const bHasOrder = Number.isFinite(bOrder);
    if (aHasOrder && bHasOrder && aOrder !== bOrder) return aOrder - bOrder;
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;
    const byStatus = (statusWeight[normalizeEvergreenStatus(a.status, a.completed)] ?? 9) - (statusWeight[normalizeEvergreenStatus(b.status, b.completed)] ?? 9);
    if (byStatus !== 0) return byStatus;
    const byPriority = (priorityWeight[normalizePriority(a.priority)] ?? 9) - (priorityWeight[normalizePriority(b.priority)] ?? 9);
    if (byPriority !== 0) return byPriority;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
}

function normalizeEvergreenOrder() {
  evergreenItems.forEach((item, index) => {
    item.order = index;
  });
}

function reorderEvergreen(sourceId, targetId, placement = 'before') {
  const from = evergreenItems.findIndex(item => item.id === sourceId);
  const target = evergreenItems.findIndex(item => item.id === targetId);
  if (from < 0 || target < 0 || from === target) return;
  const [moved] = evergreenItems.splice(from, 1);
  const nextTargetIndex = evergreenItems.findIndex(item => item.id === targetId);
  const insertAt = nextTargetIndex + (placement === 'after' ? 1 : 0);
  evergreenItems.splice(insertAt, 0, moved);
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

function openUserDialog() {
  els.userInput.value = userId;
  els.overlay.classList.add('is-open');
  if (typeof els.userDialog.showModal === 'function') els.userDialog.showModal();
  else els.userDialog.setAttribute('open', '');
  setTimeout(() => els.userInput.select(), 0);
}

function closeUserDialog() {
  els.overlay.classList.remove('is-open');
  if (els.userDialog.open && typeof els.userDialog.close === 'function') els.userDialog.close();
  else els.userDialog.removeAttribute('open');
}

function applyUserIdFromDialog() {
  const next = els.userInput.value.trim();
  if (!isValidCalendarUserId(next)) {
    els.userInput.focus();
    setStatus('帳號需 8 碼', 'error');
    return;
  }
  userId = next;
  setStoredCalendarUserId(userId);
  updateUserDisplay();
  updateModeLinks();
  closeUserDialog();
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
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}/?userId=${encodeURIComponent(userId)}`);
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

function initCalendarUserId(defaultUserId) {
  const queryUserId = new URLSearchParams(location.search).get('userId');
  if (isValidCalendarUserId(queryUserId)) {
    setStoredCalendarUserId(queryUserId);
    return queryUserId;
  }
  const stored = readStoredCalendarUserId();
  if (isValidCalendarUserId(stored)) return stored;
  setStoredCalendarUserId(defaultUserId);
  return defaultUserId;
}

function readStoredCalendarUserId() {
  try {
    return localStorage.getItem(CALENDAR_USER_STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function setStoredCalendarUserId(value) {
  if (!isValidCalendarUserId(value)) return false;
  try {
    localStorage.setItem(CALENDAR_USER_STORAGE_KEY, value);
    return true;
  } catch (error) {
    return false;
  }
}

function isValidCalendarUserId(value) {
  return /^[0-9]{8}$/.test(String(value || '').trim());
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
