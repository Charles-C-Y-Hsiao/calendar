/* Daily Evergreen feature module. Loaded before daily-calendar.js core. */

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

