  
  let user_name = initCalendarUserId('00000003');
  const CALENDAR_CLIENT_ID = `week-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // === 更新頁面上的顯示名稱 ===
  const userNameSpan = document.querySelector(".user_name_popup .btn-word");
  if (userNameSpan) {
    userNameSpan.textContent = `Hi, ${user_name}`;
  }
  updateModeLinks();

  bindCalendarUserStorageSync((nextUserId) => {
    if (nextUserId === user_name) return;
    user_name = nextUserId;
    updateModeLinks();
    location.reload();
  });

  function updateModeLinks() {
    const q = `?userId=${encodeURIComponent(user_name)}`;
    const monthLink = document.getElementById('monthModeLink');
    const dayLink = document.getElementById('dayModeLink');
    if (monthLink) monthLink.href = `/month/${q}`;
    if (dayLink) dayLink.href = `/day/${q}`;
  }
  window.updateModeLinks = updateModeLinks;

  function setStatus(text, cls = '') {
    const statusEl = document.getElementById('save-status');
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'status ' + cls;
  }

  // ===== 小工具 =====
  function px(n){ return `${Math.round(n)}px`; }
  function pad2(n){ return String(n).padStart(2, '0'); }    
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); } //避免超出欄位高度    
  function snapToSlot(y){ return roundTo(y, slotPx); } //把像素吸附到「格高 slotPx」的倍數
  function roundTo(v, step){ return Math.round(v / step) * step; }
  const getDayCols = () => dayCols; //equal function getDayCols() { return dayCols; }


  /* ===================== 🔧 後端通訊 ===================== */
  function buildPayloadForDate(dateStr) {
    // 從 allSchedules 拿到某日的陣列
    const list = Array.isArray(allSchedules[dateStr])
      ? allSchedules[dateStr]
      : [];

    // 保險只取我們要的欄位
    return list.map(item => {
      const payloadItem = {
        id:         item.id,
        start_time: item.start_time,
        end_time:   item.end_time,
        text:       (item.text || '').trim()
      };
      if (item.type) payloadItem.type = item.type;
      if (item.availabilityFrom) payloadItem.availabilityFrom = item.availabilityFrom;
      if (item.availabilityTo) payloadItem.availabilityTo = item.availabilityTo;
      if (Array.isArray(item.availabilityWeekdays)) payloadItem.availabilityWeekdays = item.availabilityWeekdays;
      if (item.availabilityGroupId) payloadItem.availabilityGroupId = item.availabilityGroupId;
      if (Array.isArray(item.availabilityPeople)) payloadItem.availabilityPeople = item.availabilityPeople;
      if (item.repeatGroupId) payloadItem.repeatGroupId = item.repeatGroupId;
      if (item.repeatScope) payloadItem.repeatScope = item.repeatScope;
      if (item.repeatPattern) payloadItem.repeatPattern = item.repeatPattern;
      if (item.repeatYearMonth) payloadItem.repeatYearMonth = item.repeatYearMonth;
      if (item.repeatDaysLabel) payloadItem.repeatDaysLabel = item.repeatDaysLabel;
      return payloadItem;
    });
  }

  async function persistDay(arg) {
    let dateStr;
    let payload;

    if (typeof arg === 'number') {
      // ✅ 當週用法：傳 dayIndex 進來
      const dayIndex = arg;
      dateStr = fmtDate(addDays(viewStart, dayIndex)); // at weekly-calendar-core.js
      payload = serializeDay(dayIndex);  // ← DOM → blocks 的那個 at weekly-calendar-core.js
      console.log('payload',payload)
      
      // payload.slice(); 會「複製一份新的陣列」
      // 避免之後payload更改時都影響allSchedules
      // 同步更新 cache，讓 allSchedules 也跟著最新
      allSchedules[dateStr] = payload.slice();
      console.log('[persistDay] by dayIndex', { dateStr, dayIndex }, allSchedules);

    } else if (typeof arg === 'string') {
      // ✅ 非當週或「直接指定日期字串」的用法
      dateStr = arg;
      payload = buildPayloadForDate(dateStr);  // ← 用 allSchedules[dateStr] 當來源
      console.log('[persistDay] by dateStr', { dateStr, payload });
    } else {
      console.warn('[persistDay] invalid arg', arg);
      return;
    }
    try {
      setStatus('儲存中…', 'saving');
      const res = await fetch(`${API_BASE}/schedule/${dateStr}`, {
        method: 'POST',
        // headers: { 'Content-Type':'application/json' },
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user_name,   // ★★★ 加上 userId（Header）
          'X-Client-Id': CALENDAR_CLIENT_ID
        },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      // console.log('saved', dateStr, j);
      const ok = res.ok && j.ok !== false;
      setStatus(ok ? '已儲存 ✓' : '儲存失敗', ok ? '' : 'error');
      return { ok, dateStr, response: j };
    } catch (e) {
      console.error('persistDay error:', e);
      setStatus('儲存失敗：' + e.message, 'error');
      return { ok: false, dateStr, error: e };
    }
  }

  function serializeWeek() {
    const out = {};
    for (let i = 0; i < 7; i++) {
      const dateStr = fmtDate(addDays(viewStart, i));
      out[dateStr] = serializeDay(i); // DOM → blocks
    }
    return out;
  }

  async function persistWeek() {
    console.log('persistWeek viewStart: ',fmtDate(viewStart))
    const from = fmtDate(viewStart);
    const to   = fmtDate(addDays(viewStart, 6));

    const payload = serializeWeek();

    // 同步更新 allSchedules（可選，但建議一致）
    for (const [dateStr, blocks] of Object.entries(payload)) {
      allSchedules[dateStr] = blocks.slice();
    }

    try {
      setStatus('儲存中…', 'saving');
      const res = await fetch(`${API_BASE}/schedule?from=${from}&to=${to}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user_name,
          'X-Client-Id': CALENDAR_CLIENT_ID
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      // console.log('[persistWeek] saved', j);
      const ok = res.ok && j.ok !== false;
      setStatus(ok ? '已儲存 ✓' : '儲存失敗', ok ? '' : 'error');
    } catch (e) {
      console.error('persistWeek error:', e);
      setStatus('儲存失敗：' + e.message, 'error');
    }
  }
