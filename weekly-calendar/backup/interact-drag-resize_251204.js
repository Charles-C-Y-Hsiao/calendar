  /* ===================== ③ 🧠 interact.js：drag / resize ===================== */
  // ===== interact.js：拖曳與縮放（含格線吸附與邊界限制） =====
  const stepY = slotPx;                       // 垂直吸附到 30 分鐘
  const stepX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dayWidth')) || 140; // 水平吸附到日欄寬
  // console.log({stepX})
  
  function initInteractForBlocks({ slotPx, stepY, stepX, dayCols }) {
    const dragOptions   = createDragOptions({ stepX, dayCols });
    const resizeOptions = createResizeOptions(slotPx, stepY);

    // return function setupInteract(block) {
    //   interact(block)
    //     .draggable(dragOptions)
    //     .resizable(resizeOptions);
    // };

    // 包一層：在 end 事件後做 persistDay
    function setupInteract(block) {
      interact(block)
        .draggable({
          ...dragOptions,
          listeners: {
            ...dragOptions.listeners,
            end (event) {
              // 1️⃣ 先讓 dragOptions 做完「位移 + 改 dayIndex + 設定 event.fromIndex/toIndex」
              dragOptions.listeners.end(event);
              // // 橫移跨日後，用最新 dayIndex 儲存
              // const dIdx = Number(event.target.dataset.dayIndex);
              // persistDay(dIdx);
              
              const target = event.target;

              // 2️⃣ 從 event 取出剛剛塞的 from / to（沒有就 fallback 成目前 dayIndex）
              const fromIdx = 
                typeof event.fromIndex === 'number'
                  ? event.fromIndex
                  : Number(target.dataset.dayIndex);

              const toIdx = 
                typeof event.toIndex === 'number'
                  ? event.toIndex
                  : Number(target.dataset.dayIndex);

              // 3️⃣ 判斷有沒有跨日
              if (fromIdx !== toIdx) {
                // ⭐ 跨日：兩天都要存，舊的會把該 block 移除掉
                persistDay(fromIdx);
                persistDay(toIdx);
              } else {
                // 沒跨日：只更新該日
                persistDay(toIdx);
              }
            }
          }
        })
        .resizable({
          ...resizeOptions,
          listeners: {
            ...resizeOptions.listeners,
            end (event) {
              resizeOptions.listeners.end(event);
              const dIdx = Number(event.target.dataset.dayIndex);
              persistDay(dIdx);
            }
          }
        });
    }
    return setupInteract;
  }

  // function setupInteract(block) {
  //   // 拖曳
  //   interact(block).draggable(dragOptions);
  //   // 垂直縮放（上、下緣）
  //   interact(block).resizable(createResizeOptions(slotPx, stepY));
  // }

  // const dragOptions = {
  //   // allowFrom: '.meta, .text',  // 從頭部或內容拖曳，允許從標題列或內容區拖曳
  //   allowFrom: '.meta',
  //   inertia: false,
  //   listeners: {
  //     // start (event) { event.target.classList.add('is-dragging'); },
  //     move (event) {
  //       const target = event.target;
  //       const day = target.parentElement; // 目前所在日欄位
  //       const dx = event.dx;
  //       const dy = event.dy;

  //       // 累加 translate
  //       const x = (parseFloat(target.getAttribute('data-x')) || 0) + dx;
  //       const y = (parseFloat(target.getAttribute('data-y')) || 0) + dy;

  //       target.style.transform = `translate(${x}px, ${y}px)`;
  //       target.setAttribute('data-x', x);
  //       target.setAttribute('data-y', y);
  //     },
  //     end (event) {
  //       // event.target.classList.remove('is-dragging');
  //       const target = event.target;
  //       const day = target.parentElement;
  //       const dayRect = day.getBoundingClientRect();

  //       // 取最終 translate 並套用到 top/left（我們只用 top，left 固定，水平用欄位切換）
  //       let x = parseFloat(target.getAttribute('data-x')) || 0;
  //       let y = parseFloat(target.getAttribute('data-y')) || 0;

  //       // 計算是否橫向跨欄：依 stepX 近似吸附
  //       if (Math.abs(x) >= stepX/2) {
  //         const shiftCols = Math.round(x / stepX);
  //         let fromIndex = parseInt(target.dataset.dayIndex, 10);
  //         let toIndex = clamp(fromIndex + shiftCols, 0, 6);
  //         if (toIndex !== fromIndex) {
  //           // 轉移 DOM 到新欄位
  //           dayCols[toIndex].appendChild(target);
  //           target.dataset.dayIndex = String(toIndex);
  //         }
  //       }

  //       // 縱向定位更新 top（加入 y，並吸附、限制）
  //       const oldTop = parseFloat(target.style.top);
  //       let newTop = snapToSlot(oldTop + y);
  //       newTop = clamp(newTop, 0, day.scrollHeight - target.offsetHeight);
  //       target.style.top = px(newTop);

  //       // 清除 transform 累積
  //       target.style.transform = '';
  //       target.removeAttribute('data-x');
  //       target.removeAttribute('data-y');

  //       updateBlockTime(target);
  //     }
  //   },
  //   // modifiers: [
  //     // // 邊界限制（在父元素 day 內）
  //     // interact.modifiers.restrictRect({
  //     //   restriction: 'parent',
  //     //   endOnly: true
  //     // })

  //     // // 只限制 Y，不限制 X（橫向才好跨欄）
  //     // interact.modifiers.restrictRect({
  //     //   restriction: (x) => ({ top: 0, bottom: 0, left: -Infinity, right: Infinity }),
  //     //   endOnly: true
  //     // })
  //   // ],
    
  // };

  function createDragOptions({ stepX, dayCols }) {
    return {
      allowFrom: '.meta',
      inertia: false,
      listeners: {
        // start (event) { event.target.classList.add('is-dragging'); },
        move (event) {
          const target = event.target;
          const day = target.parentElement; // 目前所在日欄位
          const dx = event.dx; // 這次水平位移差
          const dy = event.dy; // 這次垂直位移差

          // 拖曳中已經累積的 X & Y 位移
          const x = (parseFloat(target.getAttribute('data-x')) || 0) + dx; 
          const y = (parseFloat(target.getAttribute('data-y')) || 0) + dy;
          // console.log({x,y})

          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        },
        end (event) {
          // event.target.classList.remove('is-dragging');
          const target = event.target;
          const day = target.parentElement;
          const dayRect = day.getBoundingClientRect();

          // ⭐ 先記「拖曳前」的 dayIndex
          const fromIndex = Number(target.dataset.dayIndex);

          // 取最終 translate 並套用到 top/left（我們只用 top，left 固定，水平用欄位切換）
          let x = parseFloat(target.getAttribute('data-x')) || 0;
          let y = parseFloat(target.getAttribute('data-y')) || 0;
          console.log({x,y})

          let toIndex = fromIndex;

          // 計算是否橫向跨欄：依 stepX 近似吸附
          if (Math.abs(x) >= stepX/2) {
            const shiftCols = Math.round(x / stepX);
            // let fromIndex = parseInt(target.dataset.dayIndex, 10);
            toIndex = clamp(fromIndex + shiftCols, 0, 6);
            if (toIndex !== fromIndex) {
              // 轉移 DOM 到新欄位
              dayCols[toIndex].appendChild(target);
              // ⭐ 這裡把 block 的 dayIndex 改成新日期
              target.dataset.dayIndex = String(toIndex);
            }
          }

          // 縱向定位更新 top（加入 y，並吸附、限制）
          const oldTop = parseFloat(target.style.top);
          let newTop = snapToSlot(oldTop + y);
          newTop = clamp(newTop, 0, day.scrollHeight - target.offsetHeight);
          target.style.top = px(newTop);

          // 清除 transform 累積
          target.style.transform = '';
          target.removeAttribute('data-x');
          target.removeAttribute('data-y');

          updateBlockTime(target);
          console.log({fromIndex,toIndex})
          // ⭐ 把 from / to 塞到 event 上，讓外層 persist 用
          event.fromIndex = fromIndex;
          event.toIndex = toIndex;
        }
      },
      // modifiers: [
      // // 邊界限制（在父元素 day 內）
      // interact.modifiers.restrictRect({
      //   restriction: 'parent',
      //   endOnly: true
      // })

      // // 只限制 Y，不限制 X（橫向才好跨欄）
      // interact.modifiers.restrictRect({
      //   restriction: (x) => ({ top: 0, bottom: 0, left: -Infinity, right: Infinity }),
      //   endOnly: true
      // })
    // ],
    }
  }
  
  function createResizeOptions(slotPx, stepY) {
    return {
      edges: { top: '.handle.top', bottom: '.handle.bottom' },
      inertia: false,
      listeners: {
        // start (event) { event.target.classList.add('is-resizing'); },
        move (event) {
          const target = event.target;

          let newHeight = parseFloat(target.style.height) + event.deltaRect.height;
          let newTop    = parseFloat(target.style.top);

          // 只有上緣拉動才改 top；下緣只改高度
          if (event.edges.top) newTop += event.deltaRect.top;

          // 邊界與最小值（不做吸附）
          newHeight = Math.max(slotPx, newHeight);
          newTop    = Math.max(0, Math.min(newTop, target.parentElement.scrollHeight - newHeight));

          target.style.height = px(newHeight);
          target.style.top    = px(newTop);
        },
        end (event) {
          const t = event.target;
          // t.classList.remove('is-resizing');
          t.style.height = px(roundTo(parseFloat(t.style.height), stepY));
          t.style.top    = px(snapToSlot(parseFloat(t.style.top)));
          updateBlockTime(t);
        }
      },
      modifiers: [
        interact.modifiers.restrictEdges({ outer: 'parent' }),
        interact.modifiers.restrictSize({ min: { height: slotPx } })
      ],        
    };
  }

  function openDateTimeDialog({ oldDateStr, startHHmm, endHHmm, onConfirm }) {
    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay';
    overlay.innerHTML = `
      <div class="dt-dialog">
        <div class="dt-dialog-title">請輸入日期與時間</div>
        <div class="dt-dialog-subtitle">格式：YYYY-MM-DD HH:MM~HH:MM</div>
        <div class="dt-dialog-row">
          <label>日期</label>
          <input type="date" class="dt-date">
        </div>
        <div class="dt-dialog-row">
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

    function close() {
      overlay.remove();
    }

    cancelBtn.addEventListener('click', () => {
      close();
    });

    okBtn.addEventListener('click', () => {
      const newDateStr = dateInput.value || oldDateStr;
      const startVal   = startInput.value;
      const endVal     = endInput.value;

      if (!newDateStr || !startVal || !endVal) {
        alert('請選擇日期、開始時間與結束時間');
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
        alert('結束時間必須晚於開始時間');
        return;
      }

      const pad = n => String(n).padStart(2, '0');
      const startStr = `${pad(sh)}:${pad(sm)}`;
      const endStr   = `${pad(eh)}:${pad(em)}`;

      // 把結果交回給外面 attachTimeEditor 處理
      onConfirm({
        newDateStr,
        startStr,
        endStr,
        startTotal,
        endTotal
      });

      close();
    });
  }

  function attachTimeEditor(block) {
    const timeEl = block.querySelector('.time');
    if (!timeEl) return;

    timeEl.addEventListener('dblclick', () => {
      // ----- 1. 先算出原本的日期 & 時間 -----

      const dIdxAttr = block.dataset.dayIndex;
      const dIdx = dIdxAttr != null ? Number(dIdxAttr) : null;

      const oldDateStr = dIdx != null
        ? fmtDate(addDays(viewStart, dIdx))
        : (block.dataset.date || '');

      let startHHmm = '--:--';
      let endHHmm   = '--:--';

      const rawTime = timeEl.textContent.trim();
      const mText = rawTime.match(/^(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})$/);
      if (mText) {
        startHHmm = mText[1];
        endHHmm   = mText[2];
      } else {
        const top = parseFloat(block.style.top)    || 0;
        const h   = parseFloat(block.style.height) || slotPx;
        const t   = timesFromTopHeight(top, h);
        startHHmm = t.startHHmm;
        endHHmm   = t.endHHmm;
      }

      // ----- 2. 打開「中央彈窗」讓使用者選日期 & 時間 -----

      openDateTimeDialog({
        oldDateStr,
        startHHmm,
        endHHmm,
        onConfirm: ({ newDateStr, startStr, endStr, startTotal, endTotal }) => {

          // 3️⃣ 更新畫面上的時間
          timeEl.textContent = `${startStr} ~ ${endStr}`;

          // ✅ 情況一：日期沒變，只改同一天時間
          if (newDateStr === oldDateStr && dIdx != null) {
            const pxPerMin   = slotPx / SLOT_MINUTES;
            const newTopPx   = (startTotal - 8 * 60) * pxPerMin;   // 08:00 = 0
            const newHeightPx = (endTotal - startTotal) * pxPerMin;

            block.style.top    = px(newTopPx);
            block.style.height = px(Math.max(slotPx, newHeightPx));

            persistDay(dIdx);
            return;
          }

          // ❗ 情況二：日期有改變，要搬到 newDateStr

          const id   = block.dataset.id;
          const text = (block.querySelector('.text')?.innerText || '').trim();

          console.log('[moveBlock BEFORE]', {
            oldDateStr,
            newDateStr,
            oldList: allSchedules[oldDateStr],
            newList: allSchedules[newDateStr]
          });

          // 4-1. 從舊日期 allSchedules 把這筆移除
          if (oldDateStr && Array.isArray(allSchedules[oldDateStr])) {
            allSchedules[oldDateStr] =
              allSchedules[oldDateStr].filter(item => item.id !== id);
          }

          // 4-2. 推進新日期 allSchedules[newDateStr]
          if (!Array.isArray(allSchedules[newDateStr])) {
            allSchedules[newDateStr] = [];
          }
          allSchedules[newDateStr].push({
            id,
            start_time: startStr,
            end_time:   endStr,
            text
          });

          console.log('[moveBlock AFTER cache update]', {
            oldDateStr,
            newDateStr,
            oldList: allSchedules[oldDateStr],
            newList: allSchedules[newDateStr]
          });

          // 4-3. 這個 block 不再屬於目前這週 → DOM 移除
          block.remove();

          // 4-4. 舊日期如果在這一週 → 用 dayIndex 存一次，清掉這筆
          if (dIdx != null) {
            console.log('[moveBlock] persist old dayIndex', dIdx, 'for', oldDateStr);
            persistDay(dIdx);
          }

          // 4-5. 新日期用 dateStr 存（用 allSchedules[newDateStr] 組 payload）
          console.log('[moveBlock] persist new dateStr', newDateStr);
          persistDay(newDateStr);
        }
      });
    });
  }
  