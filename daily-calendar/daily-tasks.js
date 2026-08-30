/* Daily timed task feature module. Loaded before daily-calendar.js core. */

function renderTodos() {
  const filtered = dayItems.filter(item => {
    if (activeFilter === 'completed') return Boolean(item.completed);
    if (activeFilter === 'pending') return !item.completed;
    return true;
  });

  // Availability belongs to the shared schedule data, but Daily presents it
  // after regular timed tasks. Both groups remain time-sorted without changing
  // the persisted dayItems order.
  const normalItems = filtered.filter(item => !isAvailabilityItem(item));
  const availabilityItems = filtered
    .filter(isAvailabilityItem)
    .sort(compareItemsByTime);
  const displayItems = [...normalItems, ...availabilityItems];

  els.todos.innerHTML = displayItems.map(item => {
    const checked = item.completed ? 'checked' : '';
    const checkDisabled = isEditMode ? 'disabled' : '';
    const availabilityClass = isAvailabilityItem(item) ? ' is-availability' : '';
    const itemNameMarkup = isAvailabilityItem(item)
      ? renderAvailabilityPeople(item)
      : escapeHtml(item.text || '');
    return `
      <li class="todo${availabilityClass} ${item.completed ? 'is-completed' : ''}" data-id="${escapeHtml(item.id)}">
        <input class="todo-check" type="checkbox" title="Complete" ${checked} ${checkDisabled}>
        <button class="drag-btn row-action" type="button" title="Move">
          <i class="fa-solid fa-grip-vertical"></i>
        </button>
        <span class="todo-time">${escapeHtml(item.start_time || '--:--')} ~ ${escapeHtml(item.end_time || '--:--')}</span>
        <span class="todo-name">${itemNameMarkup}</span>
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

  els.emptyState.classList.toggle('is-visible', displayItems.length === 0);

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
  els.editTaskDate.value = formatDate(currentDate);
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


async function saveTaskEditor() {
  const editingId = editingItemId;
  const item = dayItems.find(entry => entry.id === editingId);
  if (!item) return;
  const text = els.editTaskInput.value.trim();
  const sourceDateKey = formatDate(currentDate);
  const targetDateKey = els.editTaskDate.value;
  const targetDate = parseDateKey(targetDateKey);
  const start = els.editStartTime.value;
  const end = els.editEndTime.value;
  if (!text) {
    els.editTaskInput.focus();
    return;
  }
  if (!targetDate) {
    els.editTaskDate.focus();
    return;
  }
  if (hhmmToTotal(start) >= hhmmToTotal(end)) {
    setStatus('時間錯誤', 'error');
    return;
  }
  const nextItem = {
    ...item,
    text,
    start_time: start,
    end_time: end,
  };
  closeTaskEditor();
  if (targetDateKey === sourceDateKey) {
    Object.assign(item, nextItem);
    sortItems();
    renderTodos();
    await saveCurrentDay();
    return;
  }

  dayItems = dayItems.filter(entry => entry.id !== editingId);
  sortItems();
  renderTodos();
  await saveItemsForDate(sourceDateKey, dayItems);

  const targetItems = await loadItemsForDate(targetDateKey);
  const nextTargetItems = sortItemList([
    ...targetItems.filter(entry => entry.id !== nextItem.id),
    nextItem,
  ]);
  await saveItemsForDate(targetDateKey, nextTargetItems);
  currentDate = targetDate;
  dayItems = nextTargetItems;
  updateDateHeader();
  renderTodos();
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

