  function edit_time_dialog({ oldDateStr, startHHmm, endHHmm, onConfirm }) {
    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay';
    overlay.innerHTML = `
      <div class="dt-dialog">
        <div class="time-panel-title">Edit task schedule</div>
        <div class="time-panel-subtitle">Format: YYYY-MM-DD HH:MM~HH:MM</div>
        <div class="time-panel-row">
          <label>Date</label>
          <input type="date" class="dt-date">
        </div>
        <div class="time-panel-row">
          <label>Time</label>
          <input type="time" class="dt-start">
          <span>~</span>
          <input type="time" class="dt-end">
        </div>
        <div class="dt-dialog-actions">
          <button type="button" class="dt-ok">Confirm</button>
          <button type="button" class="dt-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const dateInput  = overlay.querySelector('.dt-date');
    const startInput = overlay.querySelector('.dt-start');
    const endInput   = overlay.querySelector('.dt-end');
    const okBtn      = overlay.querySelector('.dt-ok');
    const cancelBtn  = overlay.querySelector('.dt-cancel');
    // Populate the current schedule values.
    if (oldDateStr) dateInput.value = oldDateStr;
    if (startHHmm && startHHmm !== '--:--') startInput.value = startHHmm;
    if (endHHmm   && endHHmm   !== '--:--') endInput.value   = endHHmm;
    
    function close() { overlay.remove(); }
    cancelBtn.addEventListener('click', () => { close(); });

    okBtn.addEventListener('click', async () => {
      const newDateStr = dateInput.value || oldDateStr;
      const startVal   = startInput.value;
      const endVal     = endInput.value;

      if (!newDateStr || !startVal || !endVal) {
        await window.actionDialogs.alert('Please enter a date, start time, and end time.');
        return;
      }

      const [shStr, smStr] = startVal.split(':');
      const [ehStr, emStr] = endVal.split(':');
      const sh = Number(shStr);
      const sm = Number(smStr);
      const eh = Number(ehStr);
      const em = Number(emStr);
      const startTotal = sh * 60 + sm;
      const endTotal   = eh * 60 + em;

      if (endTotal <= startTotal) {
        await window.actionDialogs.alert('The end time must be later than the start time.');
        return;
      }
      const pad = n => String(n).padStart(2, '0');
      const startStr = `${pad(sh)}:${pad(sm)}`;
      const endStr   = `${pad(eh)}:${pad(em)}`;
      // Return normalized values to the day panel.
      onConfirm({
        newDateStr, startStr, endStr,
        startTotal, endTotal,
      });
      close();
    });
  }

  function openDayPanel(dateKey, li) {
    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay';
    overlay.innerHTML = `
    <div class="dt-dialog">
        <div class="day-panel-title">${dateKey} Day tasks</div>
        <div class="day-panel-list" data-date-key="${dateKey}"></div>
        <div class="day-panel-footer">
        <button type="button" class="day-panel-add"></button>
        <div class="dt-dialog-actions">
          <button type="button" class="dt-ok">Done</button>
        </div>
        </div>
    </div>
    `;
    const listEl   = overlay.querySelector('.day-panel-list');    
    const okBtn    = overlay.querySelector('.dt-ok');
    const addBtn   = overlay.querySelector('.day-panel-add');
    
    addBtn.innerHTML = PLUS_SVG;
    addBtn.title = 'Add task';

    document.body.appendChild(overlay);

    function closePanel() {
      overlay.remove();
      // Refresh the date-cell projection after closing the panel.
      if (li && dateKey) {
        renderTaskList(li, dateKey);
      }
    }
    function renderPanelList() {
      const list = getList(dateKey).filter(isMonthlyVisibleItem);
      listEl.innerHTML = '';

      list.forEach(item => {
        const row = document.createElement('div');
        row.className = 'day-panel-item';
        row.dataset.id = item.id;
        // Drag handle.
        const dragEl = document.createElement('span');
        dragEl.className = 'drag-handle';
        dragEl.innerHTML = SORT_SVG;
        // Editable task text.
        const input = document.createElement('input');
        input.type = 'text';
        input.value = item.text || '';
        // Display the scheduled time range.
        const timeBox = document.createElement('div');
        timeBox.className = 'time-box';
        const s = item.start_time || '--:--';
        const e = item.end_time   || '--:--';
        timeBox.textContent = `${s} ~ ${e}`;
        // Schedule editor button.
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit';
        editBtn.innerHTML = DAY_SVG;

        // Delete button.
        const delBtn = document.createElement('button');
        delBtn.className = 'task-del';
        delBtn.innerHTML = TRASH_SVG;

        // Assemble the row.
        row.appendChild(dragEl);
        row.appendChild(input);
        row.appendChild(timeBox);
        row.appendChild(editBtn);
        row.appendChild(delBtn);

        listEl.appendChild(row);
      });
    }
    renderPanelList();
    // Add a new task.
    addBtn.addEventListener('click', () => {
      const list = getList(dateKey);
      const item = { id: uid(), text: '' };
      // Assign a default time range when available.
      if (typeof assignTimeForItem === 'function') {
        assignTimeForItem(list, item);
      }
      list.push(item); persist(); renderPanelList();    
    });
    // Save edits as the task text changes; Enter commits through blur.
    listEl.addEventListener('input', (e) => {
      const input = e.target.closest('.day-panel-item input[type="text"]');
      if (!input) return;
      const row = input.closest('.day-panel-item');
      const id  = row?.dataset.id;
      if (!id) return;

      const list = getList(dateKey);
      const idx = list.findIndex(x => x.id === id);
      if (idx < 0) return;

      const text = input.value.trim(); const item = list[idx];      

      if (text === '') {
        // Remove empty tasks.
        list.splice(idx, 1); persist(); renderPanelList();     
      } else {
        // Ensure an edited task has a valid time range.
        if ((!item.start_time || !item.end_time) && typeof assignTimeForItem === 'function') {
          assignTimeForItem(list, item);
        }
        item.text = text; persist();        
      }
    });

    listEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const input = e.target.closest('.day-panel-item input[type="text"]');
      if (!input) return;
      e.preventDefault();
      input.blur();
    });

    // Handle schedule editing and deletion.
    listEl.addEventListener('click', (e) => {

      // Open the schedule editor.
      const editBtn = e.target.closest('.task-edit');
      if (editBtn) {
        const row = editBtn.closest('.day-panel-item');
        const id  = row?.dataset.id;
        if (!id) return;

        const oldDateStr = dateKey;
        const list = getList(oldDateStr);
        const idx  = list.findIndex(x => x.id === id);
        if (idx < 0) return;

        const item = list[idx];
        const startHHmm = item.start_time || '08:00';
        const endHHmm   = item.end_time   || '09:00';

        edit_time_dialog({
          oldDateStr,
          startHHmm,
          endHHmm,
          onConfirm({ newDateStr, startStr, endStr }) {
            // Re-read the item in case the list changed while the dialog was open.
            const curList = getList(oldDateStr);
            const curIdx  = curList.findIndex(x => x.id === id);
            if (curIdx < 0) {
              return;
            }

            // Move the task when its date changes.
            if (newDateStr !== oldDateStr) {
              const [moved] = curList.splice(curIdx, 1);
              moved.start_time = startStr;
              moved.end_time   = endStr;

              const newList = getList(newDateStr);
              newList.push(moved);

              // Refresh the current panel.
              renderPanelList();

              // Refresh the destination calendar cell when it is visible.
              const targetCell = document.querySelector(`li[data-tooltip="${newDateStr}"]`);
              if (targetCell) {
                ensureTaskUI(targetCell);
              }
            } else {
              // Update the time in place.
              curList[curIdx].start_time = startStr;
              curList[curIdx].end_time   = endStr;

              // Refresh the panel UI.
              renderPanelList();
            }
            // Persist all schedule changes.
            persist();
          }
        });
        return;
      }
      const delBtn = e.target.closest('.task-del');
      if (!delBtn) return;
      const row = delBtn.closest('.day-panel-item');
      const id  = row?.dataset.id;
      if (!id) return;
      const list = getList(dateKey);
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) {
        list.splice(idx, 1);
        persist();
        renderPanelList();
      }
    });
    // Reorder tasks by dragging the handle.
    listEl.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.drag-handle');
      if (!handle) return;
      handle.closest('.day-panel-item')?.setAttribute('draggable', 'true');
    });
    listEl.addEventListener('mouseup', (e) => {
      e.target.closest('.day-panel-item')?.removeAttribute('draggable');
    });
    listEl.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      const dragging = listEl.querySelector('.day-panel-item.dragging');
      if (!dragging) return;
      // Find the row that should follow the dragged item.
      const afterEl = getDragAfterElement(listEl, ev.clientY);
      if (afterEl == null) listEl.appendChild(dragging);
      else listEl.insertBefore(dragging, afterEl);
    });
    listEl.addEventListener('drop', (ev) => {
      ev.preventDefault();
      const newOrderIds = [...listEl.querySelectorAll('.day-panel-item')]
        .map(x => x.dataset.id);
      const source = getList(dateKey);
      const byId = Object.fromEntries(source.map(x => [x.id, x]));
      const orderedVisible = newOrderIds.map(id => byId[id]).filter(Boolean);
      const hiddenItems = source.filter(item => !isMonthlyVisibleItem(item));
      // Keep Availability in shared data while reordering only Monthly-visible tasks.
      dayTasks[dateKey] = [...orderedVisible, ...hiddenItems];
      persist();
    });
    listEl.addEventListener('dragstart', (ev) => {
      const row = ev.target.closest('.day-panel-item');
      if (!row) return;
      const ghost = document.createElement('div');
      ghost.textContent = 'Moving task...';
      ghost.style.cssText = 'position:absolute; top:-1000px; left:-1000px; padding:4px 8px; border-radius:6px; background:#0034c4; color:#fff; font-size:14px;';
      document.body.appendChild(ghost);
      ev.dataTransfer.setDragImage(ghost, 0, 0);
      row._ghost = ghost;
      row.classList.add('dragging');
    });
    listEl.addEventListener('dragend', (ev) => {
      const row = ev.target.closest('.day-panel-item');
      if (!row) return;
      row.classList.remove('dragging');
      row.removeAttribute('draggable');
      row._ghost?.remove();
      row._ghost = null;
    });
    okBtn.addEventListener('click', () => {
      closePanel();
    });
    // Close when the user clicks outside the dialog.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePanel();
      }
    });
  }
