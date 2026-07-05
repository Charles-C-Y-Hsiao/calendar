  let user_name = initCalendarUserId('00000003');
  const CALENDAR_CLIENT_ID = `month-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // === 更新頁面上的顯示名稱 ===
  function updateUserNameUI(name) {
    const span = document.querySelector(".user_name_popup .btn-word");
    if (span) span.textContent = `Hi, ${name}`;
    updateModeLinks(name);
  }

  function updateModeLinks(name) {
    const q = `?userId=${encodeURIComponent(name)}`;
    document.querySelectorAll('.week-link').forEach(link => { link.href = `/week/${q}`; });
    document.querySelectorAll('.day-link').forEach(link => { link.href = `/day/${q}`; });
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateModeLinks(user_name);
  });

  bindCalendarUserStorageSync((nextUserId) => {
    if (nextUserId === user_name) return;
    user_name = nextUserId;
    location.reload();
  });

  /* ---------- 多筆清單（新增 / 刪除 / 拖曳排序）+ 本地儲存 ---------- */
  // const statusEl = document.getElementById('save-status');
  let dayTasks = {};            // 直接在記憶體維護
  let saveTimer = null;         // 防抖計時器
  let pendingSave = false;      // 是否有尚未送出的更新

  function setStatus(text, cls=''){
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = text;
    statusEl.className = 'status ' + cls;
  }

  async function fetchFromServer({ year, month } = {}) {
    // month 以 0=Jan, 11=Dec 傳入，送去後端可改成 1-12
    // location.origin 代表 目前網頁所在的主機位置（協定 + 網域 + 連接埠）
    // e.g. http://localhost:3000/page.html ➜ http://localhost:3000
    // e.g. https://myapp.com/dashboard ➜ https://myapp.com
    const url = new URL('/calendar', location.origin); // url ➜ http://localhost:3009/calendar
    
    // url.searchParams.set(...) 是在上面網址後面加查詢參數
    if (Number.isInteger(year))  url.searchParams.set('year', String(year));
    if (Number.isInteger(month)) url.searchParams.set('month', String(month + 1)); // 後端用 1~12 會比較直覺
    // console.log(url.toString()); // http://localhost:3009/calendar?year=2025&month=11

    // const res = await fetch(url.toString());
    const res = await fetch(url.toString()
    ,{headers: { 'X-User-Id': user_name }}
    );
    if (!res.ok) throw new Error('GET /calendar 失敗');
    const data = await res.json();
    if (typeof data !== 'object' || data === null) throw new Error('回傳格式錯誤');
    return data;
  }

  async function postToServer(payload){
    setStatus('儲存中…', 'saving');
    const res = await fetch('/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user_name,
        'X-Client-Id': CALENDAR_CLIENT_ID
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=> ({}));
    if (!res.ok || json.ok === false) {
      throw new Error((json && json.error) || 'POST /calendar 失敗');
    }
    setStatus('已儲存 ✓');
  }

  function persist(){
    // 將目前的 dayTasks 直接寫到伺服器（防抖 500ms）
    pendingSave = true;
    setStatus('變更待儲存…','saving');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await postToServer(dayTasks);
        pendingSave = false;
      } catch (e) {
        console.error(e);
        setStatus('儲存失敗：' + e.message, 'error');
      }
    }, 500);
  }

  // ====== 你的任務 UI（只把資料來源/儲存改成使用 dayTasks + persist） ======
  let selectedTaskId = null;

  /* 產生 ID */
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  /* 取得某天的陣列 */
  // dayTasks = {"2025-10-06": []};
  function getList(dateKey) {
    if (!dayTasks[dateKey]) dayTasks[dateKey] = [];
    return dayTasks[dateKey];
  }

  // 放在檔案共用區（一次定義即可）
  function hmToMin(hhmm) {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
  function minToHm(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  // ====== 首次載入：從伺服器抓資料，然後補上 UI ======
  /** */
  function ensureTaskUI(li) {

    // 2) 📝 按鈕（打開 day-panel）
    if (!li.querySelector('.task-edit-btn')) {
      const editBtn = document.createElement('button');
      editBtn.className = 'task-edit-btn';
      editBtn.innerHTML = EDIT_SVG;
      editBtn.title = '編輯本日清單';
      editBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const dateKey = li.getAttribute('data-tooltip');
        if (!dateKey) return;
        openDayPanel(dateKey, li);   // ★ 這裡呼叫你剛做好的中央 day-panel
      });
      li.appendChild(editBtn);
    }

    // 3) 建立清單容器（只建立一次）
    let listEl = li.querySelector('.task-list');
    if (!listEl) {
      listEl = document.createElement('div');
      listEl.className = 'task-list';
      listEl.tabIndex = -1;
      li.appendChild(listEl);
    }

    const dateKey = li.getAttribute('data-tooltip');
    listEl.dataset.dateKey = dateKey;

    // 4) 只在第一次時綁定事件
    if (!listEl.dataset.bound) {
      // --- 選取：focusin
      listEl.addEventListener('focusin', (e) => {
        e.stopPropagation();
        const row = e.target.closest('.task-item');
        if (!row) return;

        calendarContainer.querySelectorAll('.task-item.selected')
          .forEach(el => el.classList.remove('selected'));

        row.classList.add('selected');
        selectedTaskId = row.dataset.id;
      });

      // --- 選取：click
      listEl.addEventListener('click', (e) => {
        if (e.target.closest('.task-del')) return;
        e.stopPropagation();

        const row = e.target.closest('.task-item');
        if (!row) return;

        calendarContainer.querySelectorAll('.task-item.selected')
          .forEach(el => el.classList.remove('selected'));

        row.classList.add('selected');
        selectedTaskId = row.dataset.id;
      });

      // ⚠️ 原本在這裡的：
      //   listEl.addEventListener('input', ...)
      //   listEl.addEventListener('keydown', ...)
      //   listEl.addEventListener('click' 中的刪除)
      // 全部改到 openDayPanel 裡處理，不再放在這裡

      // --- 把手：拖曳前先開 draggable
      listEl.addEventListener('mousedown', (e) => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        handle.closest('.task-item')?.setAttribute('draggable', 'true');
      });
      listEl.addEventListener('mouseup', (e) => {
        e.target.closest('.task-item')?.removeAttribute('draggable');
      });

      // --- DnD 排序（在月曆小格子內拖）
      listEl.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        const afterEl = getDragAfterElement(listEl, ev.clientY);
        const dragging = listEl.querySelector('.dragging');
        if (!dragging) return;
        if (afterEl == null) listEl.appendChild(dragging);
        else listEl.insertBefore(dragging, afterEl);
      });

      listEl.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const newOrderIds = [...listEl.querySelectorAll('.task-item')]
          .map(x => x.dataset.id);
        const source = getList(listEl.dataset.dateKey);
        const byId = Object.fromEntries(source.map(x => [x.id, x]));
        dayTasks[listEl.dataset.dateKey] =
          newOrderIds.map(id => byId[id]).filter(Boolean);
        persist();
      });

      listEl.addEventListener('dragstart', (ev) => {
        const row = ev.target.closest('.task-item');
        if (!row) return;
        const ghost = document.createElement('div');
        // const DEBUG_GHOST = true;
        // ghost.textContent = '📦 拖曳中...';
        ghost.innerHTML = `
          <div style="display:flex; align-items:center;">
            <div class="drag_svg">${DRAG_SVG}</div>
            <span>拖曳中...</span>
          </div>
        `;
        ghost.style.cssText = 'position:absolute; top:-1000px; left:-1000px; padding:4px 8px; border-radius:6px; background:#0034c4; color:#fff; font-size:14px;';
        // ghost.style.cssText = `position:absolute; ${DEBUG_GHOST ? 'top:30px; left:100px;' : 'top:-1000px; left:-1000px;'} padding:4px 8px; border-radius:6px; background:#0034c4; color:#fff; font-size:14px;`;
        document.body.appendChild(ghost);
        // ⭐ 設定 drag_svg 的 CSS（你要求用 style.cssText）
        const svgWrapper = ghost.querySelector('.drag_svg');
        if (svgWrapper) {
          svgWrapper.style.cssText = `
            border:none; background:none; width:20px; height:22px; display:grid; place-items:center;
          `;
        }
        // ⭐ 設定 SVG 本體大小 & 顏色
        const svgEl = svgWrapper?.querySelector('svg');
        if (svgEl) {
          svgEl.style.cssText = `fill: #fff;`;
        }

        // // 🔹 debug 模式：讓 ghost 停在畫面上 10 秒才消失
        // if (DEBUG_GHOST) {
        //   setTimeout(() => {
        //     ghost.remove();
        //   }, 100000);
        // }

        ev.dataTransfer.setDragImage(ghost, 0, 0);

        row._ghost = ghost;
        row.classList.add('dragging');
      });

      listEl.addEventListener('dragend', (ev) => {
        const row = ev.target.closest('.task-item');
        if (!row) return;
        row.classList.remove('dragging');
        row.removeAttribute('draggable');

        // // ⚠ 正常模式才在 dragend 立刻移除 ghost
        // if (!DEBUG_GHOST) {
        //   row._ghost?.remove();
        // }
        row._ghost?.remove();
        row._ghost = null;
      });

      listEl.dataset.bound = '1';
    }

    // 5) 渲染縮圖清單
    renderTaskList(li, dateKey);
  }

  /** */
  async function rerenderFromDayTasks(){
    try {
      setStatus('載入中…');
      dayTasks = await fetchFromServer();     // ← 從 meeting_calendar.json 讀
      console.log('dayTasks: ',dayTasks)
      setStatus('已載入 ✓');
      initTaskUIsFromStorage();
    } catch (e) {
      console.error(e);
      setStatus('載入失敗：' + e.message, 'error');
      dayTasks = {}; // fallback 空
    }
  }

  // 不打 server，只用記憶體 dayTasks（WS 更新用）
  function rerenderFromMemory() {
    setStatus('已同步 ✓');
    initTaskUIsFromStorage();
  }

  function initTaskUIsFromStorage() {
    const allCells = calendarContainer.querySelectorAll('li[data-tooltip]');
    allCells.forEach(li => {
      const key = li.getAttribute('data-tooltip');
      if (key && Array.isArray(dayTasks[key]) && dayTasks[key].length) {
        ensureTaskUI(li);
      }
    });
  }

  function connectCalendarWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    // const url   = `${proto}://${location.host}`; // ws://localhost:3009
    const wsHost = window.location.hostname;        // 例如 "localhost"
    // const url   = `${proto}://${wsHost}:3010`;      // ★ 改成 3010 這台 WS server
    const url = `${proto}://${location.host}/?userId=${encodeURIComponent(user_name)}`;
    // const url = `${proto}://${wsHost}:3010/?userId=${encodeURIComponent(user_name)}`;

    const ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      console.log('[WS] connected');
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (e) {
        console.warn('[WS] parse error', e);
        return;
      }

      if (msg.type === 'calendar-init') {
        console.log('trigger calendar-init')
        dayTasks = msg.payload || {};
        rerenderFromDayTasks();
      } else if (msg.type === 'calendar-updated') {
        if (msg.sourceClientId && msg.sourceClientId === CALENDAR_CLIENT_ID) {
          console.log('[WS] skip own calendar-updated');
          return;
        }
        // console.log('trigger calendar-updated')
        dayTasks = msg.payload || {};
        // rerenderFromDayTasks();
        rerenderFromMemory();
      }
    });

    ws.addEventListener('close', () => {
      console.log('[WS] disconnected, retry in 3s...');
      setTimeout(connectCalendarWS, 3000);
    });

    ws.addEventListener('error', (e) => {
      console.error('[WS] error', e);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    // 1) 先抓一次 REST，確保一開始就有資料
    // rerenderFromDayTasks()
    // 2) 再開 WS 做即時同步
    connectCalendarWS();
  });
