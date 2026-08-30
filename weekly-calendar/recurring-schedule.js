  function initRecurringScheduleDialog({ setupInteract, getDayCols }) {
    const trigger = document.getElementById('bulkScheduleBtn');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      openRecurringScheduleDialog({ setupInteract, getDayCols });
    });
  }

  function openRecurringScheduleDialog({ setupInteract, getDayCols, focusGroupId = null }) {
    document.querySelectorAll('.bulk-dialog-overlay').forEach(el => el.remove());

    const now = new Date();
    const overlay = document.createElement('div');
    overlay.className = 'bulk-dialog-overlay';
    overlay.innerHTML = `
      <div class="bulk-dialog" role="dialog" aria-modal="true">
        <div class="bulk-dialog-header">
          <div class="bulk-dialog-title">批次固定任務</div>
          <button type="button" class="bulk-close" title="關閉">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="bulk-form-grid">
          <div class="bulk-field">
            <label for="bulkYear">年份</label>
            <input id="bulkYear" type="number" min="2000" max="2100" value="${now.getFullYear()}">
          </div>
          <div class="bulk-field">
            <label for="bulkMonth">月份</label>
            <select id="bulkMonth"></select>
          </div>
          <div class="bulk-field">
            <label for="bulkStart">開始</label>
            <select id="bulkStart"></select>
          </div>
          <div class="bulk-field">
            <label for="bulkEnd">結束</label>
            <select id="bulkEnd"></select>
          </div>
          <div class="bulk-field bulk-wide">
            <label for="bulkText">任務內容</label>
            <input id="bulkText" type="text" autocomplete="off" placeholder="輸入固定任務">
          </div>
        </div>

        <div class="bulk-mode-row">
          <label><input type="radio" name="bulkMode" value="weekly" checked> 每週</label>
          <label><input type="radio" name="bulkMode" value="monthly"> 每月</label>
        </div>

        <div class="bulk-choice-panel" data-panel="weekly">
          <div class="bulk-section-title">每週套用到哪些星期</div>
          <div class="bulk-day-grid weekly-days"></div>
        </div>

        <div class="bulk-choice-panel" data-panel="monthly" hidden>
          <div class="bulk-section-title">每月套用到哪些日期</div>
          <div class="bulk-day-grid month-days"></div>
        </div>

        <div class="bulk-action-row">
          <button type="button" class="bulk-primary" id="bulkApplyBtn">新增批次任務</button>
          <button type="button" class="bulk-secondary" id="bulkResetBtn">清空表單</button>
          <button type="button" class="bulk-danger" id="bulkDeleteBtn" hidden>刪除這組</button>
        </div>
        <div class="bulk-message" id="bulkMessage"></div>

        <div class="bulk-group-list">
          <div class="bulk-section-title">已建立的批次任務</div>
          <div id="bulkGroupList"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const state = { editingGroupId: null, groups: [], focusGroupId };
    const yearEl = overlay.querySelector('#bulkYear');
    const monthEl = overlay.querySelector('#bulkMonth');
    const startEl = overlay.querySelector('#bulkStart');
    const endEl = overlay.querySelector('#bulkEnd');
    const textEl = overlay.querySelector('#bulkText');
    const weeklyPanel = overlay.querySelector('[data-panel="weekly"]');
    const monthlyPanel = overlay.querySelector('[data-panel="monthly"]');
    const weeklyDaysEl = overlay.querySelector('.weekly-days');
    const monthDaysEl = overlay.querySelector('.month-days');
    const applyBtn = overlay.querySelector('#bulkApplyBtn');
    const resetBtn = overlay.querySelector('#bulkResetBtn');
    const deleteBtn = overlay.querySelector('#bulkDeleteBtn');
    const messageEl = overlay.querySelector('#bulkMessage');
    const groupListEl = overlay.querySelector('#bulkGroupList');

    startEl.innerHTML = createBulkTimeOptions('08:00');
    endEl.innerHTML = createBulkTimeOptions('09:00');

    for (let m = 1; m <= 12; m++) {
      const option = document.createElement('option');
      option.value = String(m);
      option.textContent = String(m).padStart(2, '0');
      if (m === now.getMonth() + 1) option.selected = true;
      monthEl.appendChild(option);
    }

    renderWeeklyChoices(weeklyDaysEl);
    renderMonthChoices(monthDaysEl, Number(yearEl.value), Number(monthEl.value));

    const close = () => overlay.remove();
    overlay.querySelector('.bulk-close').addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    overlay.querySelectorAll('input[name="bulkMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const mode = getMode(overlay);
        weeklyPanel.hidden = mode !== 'weekly';
        monthlyPanel.hidden = mode !== 'monthly';
      });
    });

    [yearEl, monthEl].forEach(el => {
      el.addEventListener('change', async () => {
        renderMonthChoices(monthDaysEl, Number(yearEl.value), Number(monthEl.value));
        await refreshGroups();
      });
    });

    resetBtn.addEventListener('click', () => {
      state.editingGroupId = null;
      startEl.innerHTML = createBulkTimeOptions('08:00');
      endEl.innerHTML = createBulkTimeOptions('09:00');
      textEl.value = '';
      overlay.querySelector('input[name="bulkMode"][value="weekly"]').checked = true;
      weeklyPanel.hidden = false;
      monthlyPanel.hidden = true;
      renderWeeklyChoices(weeklyDaysEl);
      renderMonthChoices(monthDaysEl, Number(yearEl.value), Number(monthEl.value));
      applyBtn.textContent = '新增批次任務';
      deleteBtn.hidden = true;
      setBulkMessage(messageEl, '');
    });

    applyBtn.addEventListener('click', async () => {
      await applyBulkSchedule({
        overlay,
        state,
        setupInteract,
        getDayCols,
        messageEl,
      });
      await refreshGroups();
    });

    deleteBtn.addEventListener('click', async () => {
      if (!state.editingGroupId) return;
      if (!(await window.actionDialogs.confirm({ title: 'Delete recurring schedule?', message: 'Delete this recurring schedule group?', okText: 'Delete', cancelText: 'Cancel', danger: true }))) return;
      await deleteBulkGroup({
        groupId: state.editingGroupId,
        setupInteract,
        getDayCols,
        messageEl,
      });
      resetBtn.click();
      await refreshGroups();
    });

    groupListEl.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-edit-group]');
      const deleteGroupBtn = event.target.closest('[data-delete-group]');
      if (!editBtn && !deleteGroupBtn) return;

      const groupId = (editBtn || deleteGroupBtn).dataset.editGroup || (editBtn || deleteGroupBtn).dataset.deleteGroup;
      const group = state.groups.find(item => item.groupId === groupId);
      if (!group) return;

      if (deleteGroupBtn) {
        state.editingGroupId = groupId;
        deleteBtn.click();
        return;
      }

      loadGroupIntoForm(group);
    });

    function loadGroupIntoForm(group) {
      state.editingGroupId = group.groupId;
      yearEl.value = String(group.year);
      monthEl.value = String(group.month);
      startEl.innerHTML = createBulkTimeOptions(group.start_time);
      endEl.innerHTML = createBulkTimeOptions(group.end_time);
      textEl.value = group.text;

      overlay.querySelector(`input[name="bulkMode"][value="${group.repeatPattern}"]`).checked = true;
      weeklyPanel.hidden = group.repeatPattern !== 'weekly';
      monthlyPanel.hidden = group.repeatPattern !== 'monthly';
      renderMonthChoices(monthDaysEl, Number(yearEl.value), Number(monthEl.value));

      weeklyDaysEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = group.weekdays.includes(Number(input.value));
      });
      monthDaysEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = !input.disabled && group.monthDays.includes(Number(input.value));
      });

      applyBtn.textContent = '修改這組任務';
      deleteBtn.hidden = false;
      setBulkMessage(messageEl, '已載入這組批次任務，可修改後套用。');
    }

    async function refreshGroups() {
      await ensureFullScheduleLoaded(messageEl);
      if (state.focusGroupId) {
        const groupDate = findFirstDateForGroup(allSchedules, state.focusGroupId);
        if (groupDate) {
          yearEl.value = String(groupDate.year);
          monthEl.value = String(groupDate.month);
          renderMonthChoices(monthDaysEl, groupDate.year, groupDate.month);
        }
      }
      state.groups = collectRecurringGroups(allSchedules, Number(yearEl.value), Number(monthEl.value));
      renderGroupList(groupListEl, state.groups);
      if (state.focusGroupId) {
        const group = state.groups.find(item => item.groupId === state.focusGroupId);
        if (group) {
          loadGroupIntoForm(group);
          state.focusGroupId = null;
        } else {
          setBulkMessage(messageEl, '這組批次任務不在目前選取的年月，請切換年份或月份。', 'error');
        }
      }
    }

    refreshGroups();
  }

  function renderWeeklyChoices(container) {
    const days = [
      { label: 'MON', value: 1, checked: true },
      { label: 'TUE', value: 2, checked: true },
      { label: 'WED', value: 3, checked: true },
      { label: 'THU', value: 4, checked: true },
      { label: 'FRI', value: 5, checked: true },
      { label: 'SAT', value: 6, checked: false },
      { label: 'SUN', value: 0, checked: false },
    ];
    container.innerHTML = days.map(day => `
      <label>
        <input type="checkbox" value="${day.value}" ${day.checked ? 'checked' : ''}>
        ${day.label}
      </label>
    `).join('');
  }

  function renderMonthChoices(container, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    container.innerHTML = Array.from({ length: 31 }, (_, index) => {
      const day = index + 1;
      const disabled = day > daysInMonth;
      return `
        <label class="${disabled ? 'is-disabled' : ''}">
          <input type="checkbox" value="${day}" ${disabled ? 'disabled' : ''}>
          ${day}
        </label>
      `;
    }).join('');
  }

  function createBulkTimeOptions(selectedValue) {
    const selected = clampBulkTime(selectedValue, '08:00');
    let html = '';
    for (let minutes = 7 * 60; minutes <= 19 * 60; minutes += 30) {
      const value = totalToHhmm(minutes);
      html += `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`;
    }
    return html;
  }

  function clampBulkTime(value, fallback) {
    const source = /^\d{2}:\d{2}$/.test(String(value || '')) ? value : fallback;
    const min = 7 * 60;
    const max = 19 * 60;
    const clamped = Math.max(min, Math.min(max, hhmmToTotal(source)));
    return totalToHhmm(Math.round(clamped / 30) * 30);
  }

  async function applyBulkSchedule({ overlay, state, setupInteract, getDayCols, messageEl }) {
    try {
      const spec = readBulkSpec(overlay, state.editingGroupId);
      await ensureFullScheduleLoaded(messageEl);

      const nextSchedules = cloneScheduleMap(allSchedules);
      if (state.editingGroupId) removeGroupFromSchedule(nextSchedules, state.editingGroupId);
      addGroupToSchedule(nextSchedules, spec);

      await postFullSchedule(nextSchedules);
      allSchedules = nextSchedules;
      renderWeekFromMap(viewStart, setupInteract, allSchedules, getDayCols);
      setStatus('已儲存 ✓');
      setBulkMessage(messageEl, state.editingGroupId ? '已修改這組批次任務。' : '已新增批次任務。');
    } catch (error) {
      setStatus('儲存失敗：' + error.message, 'error');
      setBulkMessage(messageEl, error.message, 'error');
    }
  }

  async function deleteBulkGroup({ groupId, setupInteract, getDayCols, messageEl }) {
    try {
      await ensureFullScheduleLoaded(messageEl);
      const nextSchedules = cloneScheduleMap(allSchedules);
      removeGroupFromSchedule(nextSchedules, groupId);
      await postFullSchedule(nextSchedules);
      allSchedules = nextSchedules;
      renderWeekFromMap(viewStart, setupInteract, allSchedules, getDayCols);
      setStatus('已儲存 ✓');
      setBulkMessage(messageEl, '已刪除這組批次任務。');
    } catch (error) {
      setStatus('刪除失敗：' + error.message, 'error');
      setBulkMessage(messageEl, error.message, 'error');
    }
  }

  function readBulkSpec(overlay, editingGroupId) {
    const year = Number(overlay.querySelector('#bulkYear').value);
    const month = Number(overlay.querySelector('#bulkMonth').value);
    const start_time = overlay.querySelector('#bulkStart').value;
    const end_time = overlay.querySelector('#bulkEnd').value;
    const text = overlay.querySelector('#bulkText').value.trim();
    const mode = getMode(overlay);
    const startTotal = start_time ? hhmmToTotal(start_time) : NaN;
    const endTotal = end_time ? hhmmToTotal(end_time) : NaN;

    if ((Number.isFinite(startTotal) && startTotal < 7 * 60)
      || (Number.isFinite(endTotal) && endTotal > 19 * 60)) {
      throw new Error('時間只能選擇 07:00 到 19:00。');
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('請輸入有效年份。');
    if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('請選擇有效月份。');
    if (!text) throw new Error('請輸入任務內容。');
    if (!start_time || !end_time) throw new Error('請選擇開始與結束時間。');
    if (hhmmToTotal(start_time) >= hhmmToTotal(end_time)) throw new Error('結束時間必須晚於開始時間。');

    const groupId = editingGroupId || `rg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    if (mode === 'weekly') {
      const weekdays = checkedNumbers(overlay.querySelector('.weekly-days'));
      if (!weekdays.length) throw new Error('請至少選擇一個星期。');
      return {
        groupId,
        year,
        month,
        yearMonth,
        start_time,
        end_time,
        text,
        repeatPattern: 'weekly',
        weekdays,
        monthDays: [],
        dates: datesForWeekdays(year, month, weekdays),
        daysLabel: weekdays.map(weekdayLabel).join(', '),
      };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const monthDays = checkedNumbers(overlay.querySelector('.month-days'))
      .filter(day => day >= 1 && day <= daysInMonth);
    if (!monthDays.length) throw new Error('請至少選擇一個日期。');
    return {
      groupId,
      year,
      month,
      yearMonth,
      start_time,
      end_time,
      text,
      repeatPattern: 'monthly',
      weekdays: [],
      monthDays,
      dates: monthDays.map(day => `${yearMonth}-${String(day).padStart(2, '0')}`),
      daysLabel: monthDays.map(day => String(day)).join(', '),
    };
  }

  function addGroupToSchedule(scheduleMap, spec) {
    for (const dateStr of spec.dates) {
      if (!Array.isArray(scheduleMap[dateStr])) scheduleMap[dateStr] = [];
      scheduleMap[dateStr].push({
        id: uid(),
        start_time: spec.start_time,
        end_time: spec.end_time,
        text: spec.text,
        repeatGroupId: spec.groupId,
        repeatScope: spec.yearMonth,
        repeatPattern: spec.repeatPattern,
        repeatYearMonth: spec.yearMonth,
        repeatDaysLabel: spec.daysLabel,
      });
    }
  }

  function removeGroupFromSchedule(scheduleMap, groupId) {
    for (const [dateStr, items] of Object.entries(scheduleMap)) {
      if (!Array.isArray(items)) continue;
      scheduleMap[dateStr] = items.filter(item => item.repeatGroupId !== groupId);
    }
  }

  async function ensureFullScheduleLoaded(messageEl) {
    setBulkMessage(messageEl, '載入完整資料…');
    const res = await fetch('/schedule', {
      headers: { 'X-User-Id': user_name }
    });
    if (!res.ok) throw new Error('載入完整資料失敗。');
    const data = await res.json();
    allSchedules = data && typeof data === 'object' ? data : {};
  }

  async function postFullSchedule(scheduleMap) {
    setStatus('儲存中…', 'saving');
    const res = await fetch('/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user_name,
        'X-Client-Id': CALENDAR_CLIENT_ID,
      },
      body: JSON.stringify(scheduleMap),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || '批次儲存失敗。');
    }
  }

  function collectRecurringGroups(scheduleMap, year, month) {
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const groups = new Map();

    for (const [dateStr, items] of Object.entries(scheduleMap || {})) {
      if (!dateStr.startsWith(yearMonth) || !Array.isArray(items)) continue;
      for (const item of items) {
        if (!item.repeatGroupId) continue;
        if (!groups.has(item.repeatGroupId)) {
          groups.set(item.repeatGroupId, {
            groupId: item.repeatGroupId,
            year,
            month,
            text: item.text || '',
            start_time: item.start_time || '08:00',
            end_time: item.end_time || '09:00',
            repeatPattern: item.repeatPattern || 'weekly',
            repeatYearMonth: item.repeatYearMonth || yearMonth,
            weekdays: [],
            monthDays: [],
            count: 0,
          });
        }
        const group = groups.get(item.repeatGroupId);
        const date = parseDateKey(dateStr);
        group.count += 1;
        group.monthDays.push(date.day);
        group.weekdays.push(new Date(date.year, date.month - 1, date.day).getDay());
      }
    }

    return Array.from(groups.values()).map(group => {
      group.weekdays = uniqueNumbers(group.weekdays);
      group.monthDays = uniqueNumbers(group.monthDays);
      return group;
    }).sort((a, b) => a.start_time.localeCompare(b.start_time) || a.text.localeCompare(b.text));
  }

  function findFirstDateForGroup(scheduleMap, groupId) {
    const dateKeys = Object.keys(scheduleMap || {}).sort();
    for (const dateStr of dateKeys) {
      const items = scheduleMap[dateStr];
      if (!Array.isArray(items)) continue;
      if (items.some(item => item.repeatGroupId === groupId)) {
        return parseDateKey(dateStr);
      }
    }
    return null;
  }

  function renderGroupList(container, groups) {
    if (!groups.length) {
      container.innerHTML = '<div class="bulk-message">這個月份尚未建立批次任務。</div>';
      return;
    }

    container.innerHTML = groups.map(group => {
      const patternText = group.repeatPattern === 'monthly'
        ? `每月：${group.monthDays.join(', ')}`
        : `每週：${group.weekdays.map(weekdayLabel).join(', ')}`;
      return `
        <div class="bulk-group-card">
          <div>
            <div class="bulk-group-title">${escapeHtml(group.text)}</div>
            <div class="bulk-group-meta">${escapeHtml(group.start_time)} ~ ${escapeHtml(group.end_time)} · ${escapeHtml(patternText)} · ${group.count} 筆</div>
          </div>
          <div class="bulk-group-actions">
            <button type="button" class="bulk-secondary" data-edit-group="${escapeHtml(group.groupId)}">修改</button>
            <button type="button" class="bulk-danger" data-delete-group="${escapeHtml(group.groupId)}">刪除</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function getMode(root) {
    return root.querySelector('input[name="bulkMode"]:checked')?.value || 'weekly';
  }

  function checkedNumbers(container) {
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
      .map(input => Number(input.value))
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
  }

  function datesForWeekdays(year, month, weekdays) {
    const selected = new Set(weekdays);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      if (selected.has(d.getDay())) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }
    return dates;
  }

  function hhmmToTotal(value) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  }

  function totalToHhmm(total) {
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function weekdayLabel(day) {
    return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][day] || '';
  }

  function parseDateKey(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return { year, month, day };
  }

  function uniqueNumbers(values) {
    return Array.from(new Set(values.filter(Number.isInteger))).sort((a, b) => a - b);
  }

  function cloneScheduleMap(scheduleMap) {
    return JSON.parse(JSON.stringify(scheduleMap || {}));
  }

  function setBulkMessage(el, message, cls = '') {
    if (!el) return;
    el.textContent = message;
    el.className = `bulk-message ${cls}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
