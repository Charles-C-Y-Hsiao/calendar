  /* ===================== ② 🧠 當日產生 ghost or block 邏輯 ===================== */
  // ===== 由上往下拖曳建立block（原生事件，建立完成後交給 interact.js 管拖放縮放） =====
  const DRAG_THRESHOLD = 35;   // 超過這個像素才算拖曳

  function initCreateGhostOrBlock(setupInteract) {
    let isDraggingToCreate = false; // 目前是否真的在「拖曳建立 block」
    let isMaybeStart = false;       // 剛按下滑鼠，可能要開始建立，但還沒超過門檻
    let ghost = null;               // 用來預覽的灰色 ghost 區塊
    let startY = 0;                 // 滑鼠一開始按下的 Y（在 day 欄位內的座標）
    let activeDay = null;           // 目前在哪一個 day 欄位上操作
    let startScrollTop = 0;         // 按下滑鼠當下 day 欄位的捲動位置

    function cancelCreate() { //把所有狀態清成「空」，ghost 也順便刪除，代表「這次操作不要再算了」
      isMaybeStart = false;
      isDraggingToCreate = false;
      if (ghost) { ghost.remove(); ghost = null; }
      activeDay = null;
    }

    function finalizeCreate() { //只有在 ghost 存在、activeDay 有值時才真正建立 block。
      isMaybeStart = false;
      isDraggingToCreate = false;
      if (!ghost || !activeDay){ cancelCreate(); return; }

      const day = activeDay;
      const top = parseFloat(ghost.style.top);
      const height = Math.max(slotPx, parseFloat(ghost.style.height));

      ghost.remove(); ghost = null; activeDay = null;

      // const block = createBlockElement({top,height,dayIndex: parseInt(day.dataset.dayIndex, 10) });
      const createOptions = typeof window.getWeeklyCalendarCreateOptions === 'function'
        ? window.getWeeklyCalendarCreateOptions({ dayIndex: Number(day.dataset.dayIndex), top, height })
        : {};
      const block = createBlockElement({ top, height, dayIndex: Number(day.dataset.dayIndex), ...createOptions });
      day.appendChild(block);
      setupInteract(block); // 交給 interact.js 管拖曳/縮放
      updateBlockTime(block); // 更新顯示時間
      // ✅ 新增：建立完成就儲存當天
      if (typeof window.afterWeeklyCalendarBlockCreated === 'function') {
        window.afterWeeklyCalendarBlockCreated(block);
      }
      persistDay(Number(block.dataset.dayIndex));
    }
  
    dayCols.forEach(day => {      
      day.addEventListener('mousedown', (e) => {
        // 只接受左鍵，且必須點在「空白日欄」本體（不是 block 內部）
        if (e.button !== 0) return; 
        // 只允許點在 day 本身（而不是 block ）
        // 若你允許點在 day 的內層空白，也可用 e.target.closest('.block') 檢查
        if (e.target !== day) return;
        const rect = day.getBoundingClientRect();
        startY = clamp(e.clientY - rect.top + day.scrollTop, 0, day.scrollHeight);
        startScrollTop = day.scrollTop;

        isMaybeStart = true;       // 先標記為可能開始
        isDraggingToCreate = false;
        activeDay = day;

        e.preventDefault();
      });

      day.addEventListener('mousemove', (e) => {
        if (!isMaybeStart && !isDraggingToCreate) return;
        if (activeDay !== day) return;

        // 若使用者在按著滑鼠時捲動了，視為取消建立
        if (Math.abs(day.scrollTop - startScrollTop) > 0) { cancelCreate(); return; }

        const rect = day.getBoundingClientRect();
        // current Y,  e.clientY(滑鼠在「視窗 viewport」中的 Y 座標)，全畫面座標，不是 day
        // rect.top(day 元素「頂部」在 viewport 中的 Y)
        // clamp(...) 確保 0 ≤ curY ≤ day.scrollHeight
        const curY = clamp(e.clientY - rect.top + day.scrollTop, 0, day.scrollHeight);

        // 尚未達門檻：檢查是否超過門檻，若超過才正式進入「拖曳建立」並生成 ghost
        if (!isDraggingToCreate) {
          if (Math.abs(curY - startY) >= DRAG_THRESHOLD) {
            isDraggingToCreate = true;

            ghost = document.createElement('div');
            ghost.className = 'ghost';
            const snappedTop = snapToSlot(startY);
            ghost.style.top = px(snappedTop);
            ghost.style.height = px(slotPx);
            day.appendChild(ghost);
          } else {return}
        }

        // 已在拖曳建立：更新 ghost 尺寸
        const top = Math.min(startY, curY);
        const bottom = Math.max(startY, curY);
        const snappedTop = snapToSlot(top);
        const snappedBottom = Math.max(snappedTop + slotPx, snapToSlot(bottom));
        ghost.style.top = px(snappedTop);
        ghost.style.height = px(snappedBottom - snappedTop);
      });

      day.addEventListener('mouseup', (e) => {
        if (!activeDay || activeDay !== day) return;

        // 只有在「真的有拖曳建立」時才 finalize
        if (isDraggingToCreate) finalizeCreate(); else cancelCreate();
      });
    
    });

    // 滑出欄位或在 document 放開滑鼠都做收尾 
    document.addEventListener('mouseup', () => {
      if (isDraggingToCreate) finalizeCreate();
      else cancelCreate();
    });
  }
