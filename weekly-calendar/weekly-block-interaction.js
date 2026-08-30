  /* ===================== ③ 🧠 interact.js：drag / resize ===================== */
  // ===== interact.js：拖曳與縮放（含格線吸附與邊界限制） =====
  const stepY = slotPx;                       // 垂直吸附到 30 分鐘
  const stepX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dayWidth')) || 140; // 水平吸附到日欄寬
  
  function initInteractForBlocks({ slotPx, stepY, stepX, getDayCols }) {
    const dragOptions   = createDragOptions({ stepX, getDayCols });
    const resizeOptions = createResizeOptions(slotPx, stepY);

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
              // console.log({fromIdx, toIdx})

              // 3️⃣ 判斷有沒有跨日
              if (fromIdx !== toIdx) {
                // ⭐ 跨日：兩天都要存，舊的會把該 block 移除掉
                // persistDay(fromIdx); persistDay(toIdx);
                persistWeek();
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
  function createDragOptions({ stepX, dayCols }) {
    return {
      allowFrom: '.meta',
      inertia: false,
      listeners: {
        // start (event) { event.target.classList.add('is-dragging'); },
        move (event) {
          const target = event.target;
          // const day = target.parentElement; // 目前所在日欄位

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
          const target = event.target; // 時間block本身          
          // const day = target.parentElement; // Div.day整天的<div>
          const olddayIndex_num = Number(target.dataset.dayIndex);
          // console.log(typeof olddayIndex_num);
          console.log(
            'before move:',
            {
              parentDayIndex: target.parentElement?.dataset.dayIndex,
              oldDayIndex: target.dataset.dayIndex,
              // viewStart: fmtDate(viewStart),
              date: fmtDate(addDays(viewStart, olddayIndex_num)),
              // schedules: allSchedules[fmtDate(addDays(viewStart, olddayIndex_num))]
              // blockId: target.dataset.id,           
            }
          );
          // const dayRect = day.getBoundingClientRect();

          // ⭐ 先記「拖曳前」的 dayIndex
          const fromIndex = Number(target.dataset.dayIndex);

          // 取最終 translate 並套用到 top/left（我們只用 top，left 固定，水平用欄位切換）
          let x = parseFloat(target.getAttribute('data-x')) || 0;
          let y = parseFloat(target.getAttribute('data-y')) || 0;
          // console.log({x,y})

          let toIndex = fromIndex;

          // 計算是否橫向跨欄：依 stepX 近似吸附
          if (Math.abs(x) >= stepX/2) {
            const shiftCols = Math.round(x / stepX);
            // let fromIndex = parseInt(target.dataset.dayIndex, 10);
            toIndex = clamp(fromIndex + shiftCols, 0, 6);

            if (toIndex !== fromIndex) {
              // // 轉移 DOM 到新欄位
              // dayCols[toIndex].appendChild(target);              
              // const toDayEl = document.querySelector(`.day[data-day-index="${toIndex}"]`);
              
              // ✅ 永不幽靈：每次都拿「最新 dayCols」
              const cols = getDayCols?.();
              const toDayEl = cols?.[toIndex];

              // 若 toDayEl 不存在或已不在 DOM，就不要 append（避免把 block 丟進幽靈欄位）
              if (!toDayEl || !document.body.contains(toDayEl)) {
                // console.warn('[drag end] toDayEl missing or not in DOM', {
                //   toIndex,
                //   toDayElExists: !!toDayEl,
                //   toDayElInDOM: !!toDayEl && document.body.contains(toDayEl),
                // });
                console.warn('[drag end] toDayEl missing/not in DOM', {
                  toIndex,
                  colsLen: cols?.length,
                });

                // fallback：用 querySelector 再找一次「目前畫面上的 day」
                const q = document.querySelector(`.day[data-day-index="${toIndex}"]`);
                if (q && document.body.contains(q)) {
                  q.appendChild(target);
                } else {
                  // 找不到就不要動 DOM（避免 target 消失）
                  console.warn('[drag end] fallback query failed, keep in place', { toIndex });
                  toIndex = fromIndex;
                }
              } else {
                toDayEl.appendChild(target);
                // target.dataset.dayIndex = String(toIndex);
              }

              // ⭐ 這裡把 block 的 dayIndex 改成新日期
              // ✅ 不論成功/失敗，最後以 toIndex 決定 dayIndex（若失敗我們已把 toIndex 改回 fromIndex）
              target.dataset.dayIndex = String(toIndex);
  
              const newdayIndex_num = Number(target.dataset.dayIndex);
              // console.log(typeof newdayIndex_num);
              // console.log('AFTER append', {
              //   nowParentDayIndex: target.parentElement?.dataset.dayIndex,                
              //   nowDayIndex: target.dataset.dayIndex,
              //   // viewStart: fmtDate(viewStart),
              //   date: fmtDate(addDays(viewStart, newdayIndex_num)),
              //   existsInDOM: document.body.contains(target),
              //   // schedules: allSchedules[fmtDate(addDays(viewStart, newdayIndex_num))]
              // });
              // // console.log('AFTER append schedules', allSchedules );
              // console.log('dayCol in DOM?', {
              //   toIndex,
              //   dayColExists: !!dayCols[toIndex],
              //   dayColInDOM: document.body.contains(dayCols[toIndex]),
              // });              
            }
          }
          // 縱向定位更新 top（加入 y，並吸附、限制）& 用「當下 parent」去 clamp
          const day = target.parentElement; // 這時 parent 已可能是新 day
          const oldTop = parseFloat(target.style.top);

          let newTop = snapToSlot(oldTop + y);
          newTop = clamp(newTop, 0, day.scrollHeight - target.offsetHeight);
          target.style.top = px(newTop);

          // 清除 transform 累積
          target.style.transform = '';
          target.removeAttribute('data-x');
          target.removeAttribute('data-y');

          updateBlockTime(target); // at weekly-calendar-core.js

          // console.log({fromIndex,toIndex})
          // ⭐ 把 from / to 塞到 event 上，讓外層 persist 用
          event.fromIndex = fromIndex;
          event.toIndex = toIndex;
        },
      },
    };
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
          updateBlockTime(t); // at weekly-calendar-core.js
        }
      },
      modifiers: [
        interact.modifiers.restrictEdges({ outer: 'parent' }),
        interact.modifiers.restrictSize({ min: { height: slotPx } })
      ],        
    };
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

      // rawTime 如: 8:00~9:00
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
          const movedItem = {
            id,
            start_time: startStr,
            end_time:   endStr,
            text
          };
          if (block.dataset.itemType) movedItem.type = block.dataset.itemType;
          if (block.dataset.availabilityFrom) movedItem.availabilityFrom = block.dataset.availabilityFrom;
          if (block.dataset.availabilityTo) movedItem.availabilityTo = block.dataset.availabilityTo;
          if (block.dataset.availabilityWeekdays) {
            try {
              movedItem.availabilityWeekdays = JSON.parse(block.dataset.availabilityWeekdays);
            } catch (err) {
              movedItem.availabilityWeekdays = [];
            }
          }
          if (block.dataset.availabilityGroupId) movedItem.availabilityGroupId = block.dataset.availabilityGroupId;
          if (block.dataset.availabilityPeople) {
            try {
              movedItem.availabilityPeople = JSON.parse(block.dataset.availabilityPeople);
            } catch (err) {
              movedItem.availabilityPeople = [];
            }
          }
          if (block.dataset.repeatGroupId) movedItem.repeatGroupId = block.dataset.repeatGroupId;
          if (block.dataset.repeatScope) movedItem.repeatScope = block.dataset.repeatScope;
          if (block.dataset.repeatPattern) movedItem.repeatPattern = block.dataset.repeatPattern;
          if (block.dataset.repeatYearMonth) movedItem.repeatYearMonth = block.dataset.repeatYearMonth;
          if (block.dataset.repeatDaysLabel) movedItem.repeatDaysLabel = block.dataset.repeatDaysLabel;
          allSchedules[newDateStr].push(movedItem);

          console.log('[moveBlock AFTER cache update]', {
            oldDateStr, newDateStr,
            oldList: allSchedules[oldDateStr], newList: allSchedules[newDateStr]
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
