    /* ===================== 🔧 後端 API 基本設定 ===================== */
    const API_BASE = ''; // 同網域即可，如不同網域請填完整網址
    function fmtDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    }

    /* ===================== 🔧 時間 ↔ px 轉換 ===================== */
    function hhmmToMinutes(hhmm) {
        const [h,m] = hhmm.split(':').map(Number);
        return h*60 + m;
    }

    function minutesToHhmm(min) {
        const h = Math.floor(min/60), m = min%60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    function topHeightFromTimes(startHHmm, endHHmm) {
        const startMin = hhmmToMinutes(startHHmm);
        const endMin   = hhmmToMinutes(endHHmm);
        const base = DAY_START_HOUR*60;

        const topMin = Math.max(0, startMin - base);
        const durMin = Math.max(SLOT_MINUTES, endMin - startMin);

        const topPx = (topMin / SLOT_MINUTES) * slotPx;
        const hPx   = (durMin / SLOT_MINUTES) * slotPx;
        return { topPx, hPx };
    }

    function timesFromTopHeight(topPx, heightPx) {
        const base = DAY_START_HOUR*60;
        const startMinFromBase = Math.round(topPx / slotPx) * SLOT_MINUTES;
        const durMin           = Math.round(heightPx / slotPx) * SLOT_MINUTES;

        const startAbs = base + startMinFromBase;
        const endAbs   = Math.min(DAY_END_HOUR*60, startAbs + durMin);

        return { startHHmm: minutesToHhmm(startAbs), endHHmm: minutesToHhmm(endAbs) };
    }

    /* ===================== 🔧 序列化 / 反序列化 ===================== */
    // 把某一天（dayIndex）DOM 的 blocks 轉成 [{id,start_time,end_time,text}]
    function serializeDay(dayIndex) {
        const dayEl = dayCols[dayIndex];
        const blocks = Array.from(dayEl.querySelectorAll('.block'));
        return blocks.map(b => {
        const id = b.dataset.id;
        const top = parseFloat(b.style.top) || 0;
        const h   = parseFloat(b.style.height) || slotPx;

        const { startHHmm, endHHmm } = timesFromTopHeight(top, h);
        const text = b.dataset.itemType === 'availability'
            ? ''
            : (b.querySelector('.text')?.innerText || '').trim();
        const item = { id, start_time: startHHmm, end_time: endHHmm, text };
        if (b.dataset.completed === 'true') item.completed = true;
        if (b.dataset.itemType) item.type = b.dataset.itemType;
        if (b.dataset.availabilityFrom) item.availabilityFrom = b.dataset.availabilityFrom;
        if (b.dataset.availabilityTo) item.availabilityTo = b.dataset.availabilityTo;
        if (b.dataset.availabilityWeekdays) {
            try {
                item.availabilityWeekdays = JSON.parse(b.dataset.availabilityWeekdays);
            } catch (err) {
                item.availabilityWeekdays = [];
            }
        }
        if (b.dataset.availabilityGroupId) item.availabilityGroupId = b.dataset.availabilityGroupId;
        if (b.dataset.availabilityPeople) {
            try {
                item.availabilityPeople = JSON.parse(b.dataset.availabilityPeople);
            } catch (err) {
                item.availabilityPeople = [];
            }
        }
        if (b.dataset.repeatGroupId) item.repeatGroupId = b.dataset.repeatGroupId;
        if (b.dataset.repeatScope) item.repeatScope = b.dataset.repeatScope;
        if (b.dataset.repeatPattern) item.repeatPattern = b.dataset.repeatPattern;
        if (b.dataset.repeatYearMonth) item.repeatYearMonth = b.dataset.repeatYearMonth;
        if (b.dataset.repeatDaysLabel) item.repeatDaysLabel = b.dataset.repeatDaysLabel;
        return item;
        });
    }

    // 從後端的「單日陣列」反序列化成 DOM blocks
    function renderDayFromData(dayIndex, items, setupInteract) {
        const dayEl = dayCols[dayIndex];
        // 清空這天既有 block（保留 dayEl）
        dayEl.querySelectorAll('.block').forEach(n => n.remove());

        for (const itm of items) {
        const { topPx, hPx } = topHeightFromTimes(itm.start_time, itm.end_time);
        const block = createBlockElement({
            top: topPx,
            height: hPx,
            dayIndex,
            id: itm.id,          // ✅ 保留原有 id
            text: itm.text || '',
            repeatGroupId: itm.repeatGroupId || '',
            repeatScope: itm.repeatScope || '',
            repeatPattern: itm.repeatPattern || '',
            repeatYearMonth: itm.repeatYearMonth || '',
            repeatDaysLabel: itm.repeatDaysLabel || '',
            itemType: itm.type || itm.itemType || '',
            availabilityFrom: itm.availabilityFrom || '',
            availabilityTo: itm.availabilityTo || '',
            availabilityWeekdays: Array.isArray(itm.availabilityWeekdays) ? itm.availabilityWeekdays : [],
            availabilityGroupId: itm.availabilityGroupId || '',
            availabilityPeople: Array.isArray(itm.availabilityPeople) ? itm.availabilityPeople : [],
            completed: Boolean(itm.completed)
        });
        dayEl.appendChild(block);
        setupInteract(block);
        updateBlockTime(block);
        }
    }

    // ===== 計算顯示時間（依欄內 top/height -> HH:mm ~ HH:mm） =====
    function updateBlockTime(block) {
        const top = parseFloat(block.style.top);
        const height = parseFloat(block.style.height);

        const minutesFromStart = Math.round(top / slotPx) * SLOT_MINUTES;
        const minutesDuration  = Math.round(height / slotPx) * SLOT_MINUTES;

        const startMin = DAY_START_HOUR * 60 + minutesFromStart;
        const endMin   = Math.min(DAY_END_HOUR * 60, startMin + minutesDuration);

        const sH = Math.floor(startMin / 60), sM = startMin % 60;
        const eH = Math.floor(endMin   / 60), eM = endMin   % 60;

        const timeStr = `${pad2(sH)}:${pad2(sM)} ~ ${pad2(eH)}:${pad2(eM)}`;
        block.querySelector('.time').textContent = timeStr;
    }

    //weekDates(startDate) 會回傳 7 個日期字串的陣列
    function weekDates(startDate) {
        return Array.from({length:7}, (_,i)=>fmtDate(addDays(startDate,i)));
    }

    let allSchedules = {};   // 完整 map：{ '2025-11-14': [ ... ], ... }

    // // 用「完整 map」重畫目前這一週
    // function renderWeekFromMap(startDate, setupInteract, dataMap) {
    //     // 1) 先清空 7 天既有 blocks
    //     dayCols.forEach(el => el.querySelectorAll('.block').forEach(n => n.remove()));

    //     // 2) 依照 startDate 這一週的七天重新渲染
    //     weekDates(startDate).forEach((dStr, i) => {
    //     // const items = Array.isArray(data[dStr]) ? data[dStr] : []; //原版本沒有check

    //     const rawArr = Array.isArray(dataMap[dStr]) ? dataMap[dStr] : [];

    //     const items = [];
    //     const badItems = [];

    //     rawArr.forEach(obj => {
    //         const hasStart = Object.prototype.hasOwnProperty.call(obj, 'start_time');
    //         const hasEnd   = Object.prototype.hasOwnProperty.call(obj, 'end_time');

    //         if (hasStart && hasEnd) {
    //             items.push(obj);
    //         } else {
    //             badItems.push(obj);
    //         }
    //     });

    //     if (badItems.length > 0) {
    //         console.warn(`[renderWeekFromMap] 日期 ${dStr} 有資料缺少 start_time 或 end_time：`, badItems);
    //     }
    //     renderDayFromData(i, items, setupInteract);
    //     });
    // }

    // 用「完整 map」重畫目前這一週
    function renderWeekFromMap(startDate, setupInteract, dataMap, getDayCols) {
        const cols = getDayCols();
        // 1) 先清空 7 天既有 blocks
        // 若 cols 不在 DOM（例如剛重建），不要用它清除，避免操作幽靈
        // 但通常 cols 是最新的，因此只做基本保護
        // cols.forEach(el => el.querySelectorAll('.block').forEach(n => n.remove()));
        cols.forEach((el, i) => {
            if (!el || !document.body.contains(el)) {
                console.warn('[renderWeekFromMap] dayCol not in DOM, skip clear', { i });
                return;
            }
            el.querySelectorAll('.block').forEach(n => n.remove());
        });
        // 2) 依照 startDate 這一週的七天重新渲染
        weekDates(startDate).forEach((dStr, i) => {
        // const items = Array.isArray(data[dStr]) ? data[dStr] : []; //原版本沒有check
        const rawArr = Array.isArray(dataMap[dStr]) ? dataMap[dStr] : [];
        const items = [];
        const badItems = [];

        rawArr.forEach(obj => {
            const hasStart = Object.prototype.hasOwnProperty.call(obj, 'start_time');
            const hasEnd   = Object.prototype.hasOwnProperty.call(obj, 'end_time');

            if (hasStart && hasEnd) items.push(obj);
            else badItems.push(obj);
        });

        if (badItems.length > 0) {
            console.warn(`[renderWeekFromMap] 日期 ${dStr} 有資料缺少 start_time 或 end_time：`, badItems);
        }
        renderDayFromData(i, items, setupInteract);
        });
    }

    // 載入一週資料並渲染
    async function loadWeek(startDate, setupInteract, getDayCols) {
        const from = fmtDate(startDate);
        const to   = fmtDate(addDays(startDate, 6));
        try {
        setStatus('載入中…', 'saving');
        const res = await fetch(`${API_BASE}/schedule?from=${from}&to=${to}`
        , { headers: { 'X-User-Id': user_name }}
        );
        const data = await res.json(); // 形如 { '2025-10-06': [ ... ], ... }
        // console.log(data)

        // 把這一週的 subset 合併進全域 allSchedules
        allSchedules = {
            ...allSchedules,
            ...data
        };
        // 利用完整 map 重畫這一週
        renderWeekFromMap(startDate, setupInteract, allSchedules, getDayCols);
        setStatus('已載入 ✓');
        } catch (e) {
            console.error('loadWeek error:', e); // 失敗時就是空週        
            setStatus('載入失敗：' + e.message, 'error');
        }
    }

    function addDays(date, n){ const d = new Date(date); d.setDate(d.getDate()+n); return d; }

    function fmtDate(d){
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    }

    /* 產生 ID */
    function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

    // ===== 建立 block 元素 =====
    let uidCounter = 0;
    function createBlockElement({ top, height, dayIndex, id = null, text = '', repeatGroupId = '', repeatScope = '', repeatPattern = '', repeatYearMonth = '', repeatDaysLabel = '', itemType = '', availabilityFrom = '', availabilityTo = '', availabilityWeekdays = [], availabilityGroupId = '', availabilityPeople = [], completed = false }) {
        const block = document.createElement('div');
        block.className = 'block';
        // block.dataset.id = `blk_${++uidCounter}`;
        block.dataset.id = id || uid();
        block.dataset.dayIndex = String(dayIndex);
        if (completed) {
            block.dataset.completed = 'true';
            block.classList.add('is-completed');
        }
        if (itemType) {
            block.dataset.itemType = itemType;
            block.classList.add(`${itemType}-block`);
        }
        if (availabilityFrom) block.dataset.availabilityFrom = availabilityFrom;
        if (availabilityTo) block.dataset.availabilityTo = availabilityTo;
        if (itemType === 'availability' && Array.isArray(availabilityWeekdays)) {
            block.dataset.availabilityWeekdays = JSON.stringify(availabilityWeekdays);
        }
        if (availabilityGroupId) block.dataset.availabilityGroupId = availabilityGroupId;
        if (Array.isArray(availabilityPeople)) block.dataset.availabilityPeople = JSON.stringify(availabilityPeople);
        if (repeatGroupId) block.dataset.repeatGroupId = repeatGroupId;
        if (repeatScope) block.dataset.repeatScope = repeatScope;
        if (repeatPattern) block.dataset.repeatPattern = repeatPattern;
        if (repeatYearMonth) block.dataset.repeatYearMonth = repeatYearMonth;
        if (repeatDaysLabel) block.dataset.repeatDaysLabel = repeatDaysLabel;
        // block.style.top = `${Math.round(top)}px`;
        // block.style.height = `${Math.round(height)}px`;
        block.style.top    = px(top);
        block.style.height = px(Math.max(slotPx, height));
        block.setAttribute('data-resizeable', 'true');

        block.innerHTML = `
        <div class="meta">
            <span class="time">--:-- ~ --:--</span>
            <span class="actions">
                <button class="repeat-badge" type="button" title="修改這組批次任務" hidden>
                    <i class="fi fi-rr-module"></i>
                </button>
                <button class="btn-delete" title="刪除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </span>
        </div>
        <div class="text" contenteditable="true"></div>
        <div class="handle top"></div>
        <div class="handle bottom"></div>
        `;
        // // 刪除按鈕
        // block.querySelector('.btn-delete').addEventListener('click', () => block.remove());

        const txt = block.querySelector('.text');
        if (block.dataset.itemType === 'availability') {
            txt.setAttribute('contenteditable', 'false');
            if (typeof window.renderAvailabilityBlock === 'function') {
                window.renderAvailabilityBlock(block);
            }
        } else {
            txt.textContent = text;
        }

        const meta = block.querySelector('.meta');
        const completeToggle = document.createElement('button');
        completeToggle.className = 'block-complete-toggle';
        completeToggle.type = 'button';
        completeToggle.title = '完成';
        completeToggle.setAttribute('aria-pressed', String(block.dataset.completed === 'true'));
        completeToggle.innerHTML = '<i class="fa-solid fa-check"></i>';
        meta.querySelector('.time').after(completeToggle);
        completeToggle.addEventListener('pointerdown', event => event.stopPropagation());
        completeToggle.addEventListener('mousedown', event => event.stopPropagation());
        completeToggle.addEventListener('click', async (event) => {
            event.stopPropagation();
            const nextCompleted = block.dataset.completed !== 'true';
            block.dataset.completed = String(nextCompleted);
            block.classList.toggle('is-completed', nextCompleted);
            completeToggle.setAttribute('aria-pressed', String(nextCompleted));
            const dIdx = Number(block.dataset.dayIndex);
            await persistDay(dIdx);
        });

        const actions = block.querySelector('.actions');
        actions.addEventListener('pointerdown', event => event.stopPropagation());
        actions.addEventListener('mousedown', event => event.stopPropagation());
        const actionToggle = document.createElement('button');
        actionToggle.className = 'block-actions-toggle';
        actionToggle.type = 'button';
        actionToggle.title = '更多操作';
        actionToggle.setAttribute('aria-expanded', 'false');
        actionToggle.innerHTML = '<i class="fi fi-rc-settings-sliders"></i>';

        const actionMenu = document.createElement('span');
        actionMenu.className = 'block-action-menu';
        actionMenu.hidden = true;
        Array.from(actions.children).forEach(child => actionMenu.appendChild(child));
        actions.append(actionToggle, actionMenu);

        const closeActionMenu = () => {
            block.classList.remove('actions-open');
            actionMenu.hidden = true;
            actionToggle.setAttribute('aria-expanded', 'false');
        };
        actionToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const willOpen = actionMenu.hidden;
            document.querySelectorAll('.block.actions-open').forEach(openBlock => {
                if (openBlock === block) return;
                openBlock.classList.remove('actions-open');
                const openMenu = openBlock.querySelector('.block-action-menu');
                const openToggle = openBlock.querySelector('.block-actions-toggle');
                if (openMenu) openMenu.hidden = true;
                if (openToggle) openToggle.setAttribute('aria-expanded', 'false');
            });
            block.classList.toggle('actions-open', willOpen);
            actionMenu.hidden = !willOpen;
            actionToggle.setAttribute('aria-expanded', String(willOpen));
        });
        actionMenu.addEventListener('click', event => event.stopPropagation());
        document.addEventListener('click', event => {
            if (!block.classList.contains('actions-open')) return;
            if (block.contains(event.target)) return;
            closeActionMenu();
        });

        const syncActionLayout = () => {
            const deleteBtn = block.querySelector('.btn-delete');
            const hasExtraActions = repeatBadge && !repeatBadge.hidden;
            closeActionMenu();
            if (hasExtraActions) {
                actionToggle.hidden = false;
                actionMenu.append(repeatBadge, deleteBtn);
                return;
            }
            actionToggle.hidden = true;
            actionMenu.hidden = true;
            actions.append(deleteBtn);
        };

        const repeatBadge = block.querySelector('.repeat-badge');
        if (repeatBadge && block.dataset.repeatGroupId) {
            repeatBadge.hidden = false;
            repeatBadge.addEventListener('click', (event) => {
                event.stopPropagation();
                const context = window.weeklyCalendarBulkContext;
                if (!context || typeof openRecurringScheduleDialog !== 'function') return;
                openRecurringScheduleDialog({
                    setupInteract: context.setupInteract,
                    getDayCols: context.getDayCols,
                    focusGroupId: block.dataset.repeatGroupId
                });
            });
        }

        // 刪除：確認後立刻儲存當日
        syncActionLayout();
        block.querySelector('.btn-delete').addEventListener('click', async () => {
            const ok = await openDeleteConfirmDialog({
                title: '刪除行程',
                message: block.dataset.repeatGroupId
                    ? '這是批次任務中的其中一筆，只會刪除這一筆。若要刪除整組，請點批次 icon。'
                    : '確定要刪除這筆行程嗎？'
            });
            if (!ok) return;
            const dIdx = Number(block.dataset.dayIndex);
            block.remove();
            persistDay(dIdx);
        });

        let textDirty = false;
        let lastSavedText = txt.innerText;

        async function saveTextNow({ showDialog = false } = {}) {
            const currentText = txt.innerText;
            if (!textDirty && currentText === lastSavedText) return;

            debouncedSave.cancel();
            const dIdx = Number(block.dataset.dayIndex);
            const result = await persistDay(dIdx);

            if (result?.ok) {
                textDirty = false;
                lastSavedText = currentText;
                if (showDialog) showQuickSaveDialog('已儲存', '這筆行程內容已更新。');
            } else if (showDialog) {
                showQuickSaveDialog('儲存失敗', '請稍後再試，或確認服務是否仍在執行。');
            }
        }

        const debouncedSave = debounce(() => {
            saveTextNow();
        }, 1000);

        txt.addEventListener('input', () => {
            if (block.dataset.itemType === 'availability') return;
            textDirty = true;
            setStatus('變更待儲存…', 'saving');
            debouncedSave();
        });

        txt.addEventListener('blur', () => {
            if (block.dataset.itemType === 'availability') return;
            saveTextNow({ showDialog: true });
        });

        txt.addEventListener('keydown', (event) => {
            if (block.dataset.itemType === 'availability') return;
            if (event.key !== 'Enter' && event.key !== 'Tab') return;
            if (event.key === 'Enter') {
                event.preventDefault();
                txt.blur();
            }
        });
        if (block.dataset.itemType === 'availability' && typeof window.attachAvailabilityBlockEditor === 'function') {
            window.attachAvailabilityBlockEditor(block);
        }
        attachTimeEditor(block); //at interact-drag-resize.js
        return block;
    }

    function showQuickSaveDialog(title, message) {
        document.querySelectorAll('.quick-save-dialog-overlay').forEach(el => el.remove());

        const overlay = document.createElement('div');
        overlay.className = 'dt-dialog-overlay quick-save-dialog-overlay';
        overlay.innerHTML = `
        <div class="dt-dialog quick-save-dialog">
            <div class="dt-dialog-title">${title}</div>
            <div class="dt-dialog-subtitle">${message}</div>
            <div class="dt-dialog-actions">
                <button type="button" class="dt-ok">確定</button>
            </div>
        </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('.dt-ok').addEventListener('click', close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });
        setTimeout(() => {
            if (document.body.contains(overlay)) close();
        }, 2200);
    }

    function openDeleteConfirmDialog({ title, message }) {
        return new Promise(resolve => {
            document.querySelectorAll('.delete-confirm-dialog-overlay').forEach(el => el.remove());

            const overlay = document.createElement('div');
            overlay.className = 'dt-dialog-overlay delete-confirm-dialog-overlay';
            overlay.innerHTML = `
            <div class="dt-dialog delete-confirm-dialog">
                <div class="dt-dialog-title">${title}</div>
                <div class="dt-dialog-subtitle">${message}</div>
                <div class="dt-dialog-actions">
                    <button type="button" class="dt-ok">確定</button>
                    <button type="button" class="dt-cancel">取消</button>
                </div>
            </div>
            `;

            document.body.appendChild(overlay);

            const close = value => {
                overlay.remove();
                resolve(value);
            };

            overlay.querySelector('.dt-ok').addEventListener('click', () => close(true));
            overlay.querySelector('.dt-cancel').addEventListener('click', () => close(false));
            overlay.addEventListener('click', event => {
                if (event.target === overlay) close(false);
            });
        });
    }

    /* ===================== 🔧 小工具：debounce ===================== */
    // function debounce(fn, wait=300) {
    //     let t = null;
    //     return (...args) => { 
    //         clearTimeout(t); 
    //         t = setTimeout(() => fn(...args), wait);
    //     };
    // }

    function debounce(fn, wait = 300) {
        let t;
        const wrapped = () => {
            clearTimeout(t);
            t = setTimeout(fn, wait);
        };
        wrapped.cancel = () => {
            clearTimeout(t);
            t = null;
        };
        return wrapped;
    }
    // fn() equals `() => {dIdx = Number(block.dataset.dayIndex); persistDay(dIdx);}`
    // const debouncedSave = debounce(...); 
    // equals debouncedSave === function (...args) { ... }
    // txt.addEventListener('input', debouncedSave); 也就是debouncedSave(event);
    // 那(...args)就是(event), args = [event]; args 是一個 陣列
    // !!! fn 是「你真正要做的事 => persistDay(dIdx);」 !!!
    // !!! args 是「呼叫時傳進來的所有參數（例如 event）」 !!!
