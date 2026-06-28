  function edit_time_dialog({ oldDateStr, startHHmm, endHHmm, onConfirm }) {
    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay';
    overlay.innerHTML = `
      <div class="dt-dialog">
        <div class="time-panel-title">請輸入日期與時間</div>
        <div class="time-panel-subtitle">格式：YYYY-MM-DD HH:MM~HH:MM</div>
        <div class="time-panel-row">
          <label>日期</label>
          <input type="date" class="dt-date">
        </div>
        <div class="time-panel-row">
          <label>時間</label>
          <input type="time" class="dt-start">
          <span>~</span>
          <input type="time" class="dt-end">
        </div>
        <div class="dt-dialog-actions">
          <button type="button" class="dt-ok">確定</button>
          <button type="button" class="dt-cancel">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const dateInput  = overlay.querySelector('.dt-date');
    const startInput = overlay.querySelector('.dt-start');
    const endInput   = overlay.querySelector('.dt-end');
    const okBtn      = overlay.querySelector('.dt-ok');
    const cancelBtn  = overlay.querySelector('.dt-cancel');
    // 預設值
    if (oldDateStr) dateInput.value = oldDateStr;
    if (startHHmm && startHHmm !== '--:--') startInput.value = startHHmm;
    if (endHHmm   && endHHmm   !== '--:--') endInput.value   = endHHmm;
    
    function close() { overlay.remove(); }
    cancelBtn.addEventListener('click', () => { close(); });

    okBtn.addEventListener('click', () => {
      const newDateStr = dateInput.value || oldDateStr;
      const startVal   = startInput.value;
      const endVal     = endInput.value;

      if (!newDateStr || !startVal || !endVal) {
        alert('請選擇日期、開始時間與結束時間'); return;        
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
        alert('結束時間必須晚於開始時間'); return;        
      }
      const pad = n => String(n).padStart(2, '0');
      const startStr = `${pad(sh)}:${pad(sm)}`;
      const endStr   = `${pad(eh)}:${pad(em)}`;
      // 把結果交回呼叫端（openDayPanel）
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
        <div class="day-panel-title">${dateKey} 任務列表</div>
        <!--<div class="day-panel-subtitle">可編輯內容、刪除與拖曳排序</div>-->
        <div class="day-panel-list" data-date-key="${dateKey}"></div>
        <div class="day-panel-footer">
        <button type="button" class="day-panel-add"></button>
        <div class="dt-dialog-actions">
          <button type="button" class="dt-ok">完成</button>
        </div>
        </div>
    </div>
    `;
    const listEl   = overlay.querySelector('.day-panel-list');    
    const okBtn    = overlay.querySelector('.dt-ok');
    const addBtn   = overlay.querySelector('.day-panel-add');
    
    addBtn.innerHTML = PLUS_SVG;
    addBtn.title = '新增一筆';

    document.body.appendChild(overlay);

    function closePanel() {
      overlay.remove();
      // 關閉時重畫原本月曆格子的縮圖清單
      if (li && dateKey) {
        renderTaskList(li, dateKey);
      }
    }
    function renderPanelList() {
      const list = getList(dateKey);
      listEl.innerHTML = '';

      list.forEach(item => {
        const row = document.createElement('div');
        row.className = 'day-panel-item';
        row.dataset.id = item.id;
        // 拖曳把手
        const dragEl = document.createElement('span');
        dragEl.className = 'drag-handle';
        dragEl.innerHTML = SORT_SVG;
        // 文字輸入（靠左）
        const input = document.createElement('input');
        input.type = 'text';
        input.value = item.text || '';
        // 時間顯示（靠右）
        const timeBox = document.createElement('div');
        timeBox.className = 'time-box';
        const s = item.start_time || '--:--';
        const e = item.end_time   || '--:--';
        timeBox.textContent = `${s} ~ ${e}`;
        // 編輯按鈕
        const editBtn = document.createElement('button');
        editBtn.className = 'task-edit';
        editBtn.innerHTML = DAY_SVG;

        // 刪除按鈕
        const delBtn = document.createElement('button');
        delBtn.className = 'task-del';
        delBtn.innerHTML = TRASH_SVG;

        // 插入 row
        row.appendChild(dragEl);
        row.appendChild(input);
        row.appendChild(timeBox);
        row.appendChild(editBtn);
        row.appendChild(delBtn);

        listEl.appendChild(row);
      });
    }
    renderPanelList();
    // 新增
    addBtn.addEventListener('click', () => {
      const list = getList(dateKey);
      const item = { id: uid(), text: '' };
      // 如果你有自動填時間的規則
      if (typeof assignTimeForItem === 'function') {
        assignTimeForItem(list, item);
      }
      list.push(item); persist(); renderPanelList();    
    });
    // 輸入文字 / 刪除 / Enter 失焦 / DnD 全在這個 panel 內處理
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
        // 清空就刪除
        list.splice(idx, 1); persist(); renderPanelList();     
      } else {
        // 如同原本：如果尚未有時間，可以補上
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

    // 編輯時間 & 刪除按鈕
    listEl.addEventListener('click', (e) => {

      // 1) 編輯時間 / 日期
      const editBtn = e.target.closest('.task-edit');
      if (editBtn) {
        const row = editBtn.closest('.day-panel-item');
        const id  = row?.dataset.id;
        if (!id) return;

        const oldDateStr = dateKey;      // 這個 panel 對應的日期
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
            // 再次找一次該 item，避免中途被刪掉
            const curList = getList(oldDateStr);
            const curIdx  = curList.findIndex(x => x.id === id);
            if (curIdx < 0) {
              return;
            }

            // 日期有變更：從舊日期移除，塞到新日期
            if (newDateStr !== oldDateStr) {
              const [moved] = curList.splice(curIdx, 1);
              moved.start_time = startStr;
              moved.end_time   = endStr;

              const newList = getList(newDateStr);
              newList.push(moved);

              // 重新渲染當前 panel（舊日期那天）
              renderPanelList();

              // 順便更新新日期那一格的小清單（如果目前月曆畫面上有）
              const targetCell = document.querySelector(`li[data-tooltip="${newDateStr}"]`);
              if (targetCell) {
                ensureTaskUI(targetCell);
              }
            } else {
              // 日期沒變：只改 time
              curList[curIdx].start_time = startStr;
              curList[curIdx].end_time   = endStr;

              // 重新畫 panel 讓 UI 也統一
              renderPanelList();
            }
            // 寫回後端（POST /calendar）
            persist();
          }
        });
        return;  // 已處理 edit，後面刪除邏輯不再執行
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
    // DnD：跟你原本的邏輯很像，只是改成 day-panel-list
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
      // 重用你原本的 getDragAfterElement(listEl, clientY)
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
      dayTasks[dateKey] = newOrderIds.map(id => byId[id]).filter(Boolean);
      persist();
    });
    listEl.addEventListener('dragstart', (ev) => {
      const row = ev.target.closest('.day-panel-item');
      if (!row) return;
      const ghost = document.createElement('div');
      ghost.textContent = '拖曳中...';
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
    // 點 overlay 背景也關閉（如果你不想要可以拿掉）
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closePanel();
      }
    });
  }