(function () {
  const STATUS = {
    free: { label: 'free', className: 'is-free' },
    'not-free': { label: 'not free', className: 'is-not-free' }
  };
  const MANAGER_HOUR_HEIGHT = 54;

  function currentWeekDates() {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(viewStart, index);
      return {
        date,
        dateStr: fmtDate(date),
        dayIndex: index,
        label: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index]
      };
    });
  }

  function weekDatesForOffset(weekOffset) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(viewStart, weekOffset * 7 + index);
      return {
        date,
        dateStr: fmtDate(date),
        dayIndex: index,
        weekOffset,
        label: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index]
      };
    });
  }

  function managerWeeks() {
    // The manager is opened from the currently visible week.  Show that week
    // first so its loaded availability records are immediately discoverable;
    // surrounding weeks remain available by scrolling.
    return [
      { offset: 0, title: 'This week' },
      { offset: -1, title: 'Previous week' },
      { offset: 1, title: 'Next week' },
      { offset: 2, title: 'Two weeks later' }
    ].map(week => ({
      ...week,
      days: weekDatesForOffset(week.offset)
    }));
  }

  function availabilityUid() {
    return `av_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function dateInRange(dateStr, fromDate, toDate) {
    return dateStr >= fromDate && dateStr <= toDate;
  }

  function availabilityDatesInRange(fromDate, toDate, weekdays) {
    const selected = new Set(weekdays);
    const dates = [];
    const cursor = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    while (cursor <= end) {
      const dateStr = fmtDate(cursor);
      if (selected.has(weekdayIndexFromDateStr(dateStr))) {
        dates.push(dateStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  function weekdayIndexFromDateStr(dateStr) {
    return (new Date(`${dateStr}T00:00:00`).getDay() + 6) % 7;
  }

  function parseWeekdaysFromData(value, fallback = []) {
    if (Array.isArray(value)) return value.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 4);
    if (!value) return fallback;
    try {
      const days = JSON.parse(value);
      return Array.isArray(days) ? parseWeekdaysFromData(days, fallback) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function clampAvailabilityTime(value, fallback) {
    const source = /^\d{2}:\d{2}$/.test(String(value || '')) ? value : fallback;
    const minutes = hhmmToMinutes(source);
    const clamped = Math.max(7 * 60, Math.min(19 * 60, minutes));
    const snapped = Math.round(clamped / 30) * 30;
    return `${String(Math.floor(snapped / 60)).padStart(2, '0')}:${String(snapped % 60).padStart(2, '0')}`;
  }

  function createTimeOptions(selectedValue) {
    const selected = clampAvailabilityTime(selectedValue, '07:00');
    const options = [];
    for (let minutes = 7 * 60; minutes <= 19 * 60; minutes += 30) {
      const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      options.push(`<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`);
    }
    return options.join('');
  }

  function getBlockDate(block) {
    const dIdx = Number(block.dataset.dayIndex);
    if (Number.isFinite(dIdx)) return fmtDate(addDays(viewStart, dIdx));
    return fmtDate(new Date());
  }

  function parsePeopleFromData(value) {
    if (Array.isArray(value)) return normalizePeople(value);
    if (!value) return [];
    try {
      const people = JSON.parse(value);
      return Array.isArray(people) ? normalizePeople(people) : [];
    } catch (err) {
      return [];
    }
  }

  function parsePeople(block) {
    return parsePeopleFromData(block.dataset.availabilityPeople);
  }

  function cloneScheduleMap(scheduleMap) {
    return JSON.parse(JSON.stringify(scheduleMap || {}));
  }

  async function loadFullSchedule() {
    const res = await fetch('/calendar', {
      headers: { 'X-User-Id': user_name }
    });
    if (!res.ok) throw new Error('Unable to load full schedule.');
    const data = await res.json();
    return data && typeof data === 'object' ? data : {};
  }

  async function postFullSchedule(scheduleMap) {
    const res = await fetch('/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user_name,
        'X-Client-Id': CALENDAR_CLIENT_ID
      },
      body: JSON.stringify(scheduleMap)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || 'Unable to save full schedule.');
    }
  }

  function removeAvailabilityGroupFromSchedule(scheduleMap, groupId) {
    if (!groupId) return;
    Object.entries(scheduleMap || {}).forEach(([dateStr, items]) => {
      if (!Array.isArray(items)) return;
      scheduleMap[dateStr] = items.filter(item => item.availabilityGroupId !== groupId);
    });
  }

  function availabilityScheduleItem({ groupId, startHHmm, endHHmm, fromDate, toDate, weekdays, people }) {
    return {
      id: availabilityUid(),
      start_time: startHHmm,
      end_time: endHHmm,
      text: '',
      type: 'availability',
      availabilityFrom: fromDate,
      availabilityTo: toDate,
      availabilityWeekdays: weekdays,
      availabilityGroupId: groupId,
      availabilityPeople: people
    };
  }

  function rerenderCurrentWeek() {
    const context = window.weeklyCalendarBulkContext;
    const setup = context?.setupInteract || (typeof setupInteract === 'function' ? setupInteract : null);
    const getCols = context?.getDayCols || (typeof getDayCols === 'function' ? getDayCols : null);
    if (!setup || !getCols) return;
    renderWeekFromMap(viewStart, setup, allSchedules, getCols);
  }

  function normalizePeople(people) {
    return people
      .map(person => ({
        name: String(person.name || '').trim(),
        status: person.status === 'not-free' ? 'not-free' : 'free'
      }))
      .filter(person => person.name);
  }

  function blockTimes(block) {
    const top = parseFloat(block.style.top) || 0;
    const height = parseFloat(block.style.height) || slotPx;
    return timesFromTopHeight(top, height);
  }

  function applyTimesToBlock(block, startHHmm, endHHmm) {
    const { topPx, hPx } = topHeightFromTimes(startHHmm, endHHmm);
    block.style.top = px(topPx);
    block.style.height = px(Math.max(slotPx, hPx));
    updateBlockTime(block);
  }

  function renderAvailabilityBlock(block) {
    const textEl = block.querySelector('.text');
    if (!textEl) return;

    const people = normalizePeople(parsePeople(block));
    textEl.innerHTML = '';

    const listEl = document.createElement('div');
    listEl.className = 'availability-chip-list';

    if (!people.length) {
      const emptyEl = document.createElement('span');
      emptyEl.className = 'availability-empty';
      emptyEl.textContent = 'Set people';
      listEl.appendChild(emptyEl);
    } else {
      people.forEach(person => {
        const chip = document.createElement('span');
        const status = STATUS[person.status] || STATUS.free;
        chip.className = `availability-chip ${status.className}`;
        chip.textContent = person.name;
        chip.title = `${person.name} ${status.label}`;
        listEl.appendChild(chip);
      });
    }

    textEl.appendChild(listEl);
  }

  function createPersonRow(person = { name: '', status: 'free' }) {
    const row = document.createElement('div');
    row.className = 'availability-person-row';
    row.innerHTML = `
      <input type="text" class="availability-name" placeholder="Name" value="">
      <select class="availability-status">
        <option value="free">free</option>
        <option value="not-free">not free</option>
      </select>
      <button type="button" class="availability-remove" title="Remove">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    row.querySelector('.availability-name').value = person.name || '';
    row.querySelector('.availability-status').value = person.status === 'not-free' ? 'not-free' : 'free';
    row.querySelector('.availability-remove').addEventListener('click', () => row.remove());
    return row;
  }

  function readPeopleRows(peopleEl) {
    return normalizePeople([...peopleEl.querySelectorAll('.availability-person-row')].map(row => ({
      name: row.querySelector('.availability-name')?.value || '',
      status: row.querySelector('.availability-status')?.value || 'free'
    })));
  }

  function openAvailabilityEditor(block, { onClose } = {}) {
    document.querySelectorAll('.availability-dialog-overlay').forEach(el => el.remove());

    const currentDate = getBlockDate(block);
    const fromDate = block.dataset.availabilityFrom || currentDate;
    const toDate = block.dataset.availabilityTo || fromDate;
    const people = normalizePeople(parsePeople(block));
    const { startHHmm, endHHmm } = blockTimes(block);
    const currentDayIndex = Number(block.dataset.dayIndex);
    const initialWeekdays = parseWeekdaysFromData(
      block.dataset.availabilityWeekdays,
      Number.isInteger(currentDayIndex) && currentDayIndex >= 0 && currentDayIndex <= 4 ? [currentDayIndex] : []
    );

    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay availability-dialog-overlay';
    overlay.innerHTML = `
      <div class="dt-dialog availability-dialog">
        <div class="dt-dialog-title">Availability</div>
        <div class="dt-dialog-subtitle">Manage a time range, date range, and each person's status.</div>
        <div class="availability-weekday-row" role="group" aria-label="Apply weekdays">
          ${['MON', 'TUE', 'WED', 'THU', 'FRI'].map((label, index) => `
            <label class="availability-weekday">
              <input type="checkbox" value="${index}"${initialWeekdays.includes(index) ? ' checked' : ''}>
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
        <div class="dt-dialog-row availability-date-row">
          <label>Date</label>
          <input type="date" class="availability-from">
          <span>~</span>
          <input type="date" class="availability-to">
        </div>
        <div class="dt-dialog-row availability-date-row">
          <label>Time</label>
          <select class="availability-start"></select>
          <span>~</span>
          <select class="availability-end"></select>
        </div>
        <div class="availability-people"></div>
        <button type="button" class="availability-add">
          <i class="fa-solid fa-plus"></i>
          <span>Add person</span>
        </button>
        <div class="dt-dialog-actions">
          <button type="button" class="dt-ok">Save</button>
          <button type="button" class="availability-delete-group">Delete group</button>
          <button type="button" class="dt-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const fromInput = overlay.querySelector('.availability-from');
    const toInput = overlay.querySelector('.availability-to');
    const startInput = overlay.querySelector('.availability-start');
    const endInput = overlay.querySelector('.availability-end');
    const peopleEl = overlay.querySelector('.availability-people');
    const addBtn = overlay.querySelector('.availability-add');
    const deleteGroupBtn = overlay.querySelector('.availability-delete-group');

    fromInput.value = fromDate;
    toInput.value = toDate;
    startInput.innerHTML = createTimeOptions(startHHmm);
    endInput.innerHTML = createTimeOptions(endHHmm);
    deleteGroupBtn.hidden = !block.dataset.availabilityGroupId;

    const initialPeople = people.length ? people : [{ name: '', status: 'free' }];
    initialPeople.forEach(person => peopleEl.appendChild(createPersonRow(person)));

    addBtn.addEventListener('click', () => {
      peopleEl.appendChild(createPersonRow());
      peopleEl.querySelector('.availability-person-row:last-child .availability-name')?.focus();
    });

    function close() {
      overlay.remove();
      if (typeof onClose === 'function') onClose();
    }

    function cancel() {
      const isDraft = block.dataset.availabilityDraft === '1';
      close();
      if (!isDraft) return;
      const dIdx = Number(block.dataset.dayIndex);
      block.remove();
      persistDay(dIdx);
    }

    overlay.querySelector('.dt-cancel').addEventListener('click', cancel);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) cancel();
    });

    deleteGroupBtn.addEventListener('click', async () => {
      const groupId = block.dataset.availabilityGroupId;
      if (!groupId) return;
      if (!(await window.actionDialogs.confirm({ title: 'Delete availability group?', message: 'Delete this availability group from all matching dates?', okText: 'Delete', cancelText: 'Cancel', danger: true }))) return;
      try {
        setStatus('儲存中...', 'saving');
        const nextSchedules = cloneScheduleMap(await loadFullSchedule());
        removeAvailabilityGroupFromSchedule(nextSchedules, groupId);
        await postFullSchedule(nextSchedules);
        allSchedules = nextSchedules;
        rerenderCurrentWeek();
        setStatus('已儲存 ✓');
        close();
      } catch (error) {
        setStatus('儲存失敗：' + error.message, 'error');
        await window.actionDialogs.alert(error.message, { title: 'Availability error' });
      }
    });

    overlay.querySelector('.dt-ok').addEventListener('click', async () => {
      const nextFrom = fromInput.value || currentDate;
      const nextTo = toInput.value || nextFrom;
      const nextStart = startInput.value || startHHmm;
      const nextEnd = endInput.value || endHHmm;
      const selectedWeekdays = [...overlay.querySelectorAll('.availability-weekday input:checked')]
        .map(input => Number(input.value))
        .filter(day => Number.isInteger(day));

      if (nextTo < nextFrom) {
        await window.actionDialogs.alert('End date must be after start date.', { title: 'Invalid availability' });
        return;
      }
      if (hhmmToMinutes(nextEnd) <= hhmmToMinutes(nextStart)) {
        await window.actionDialogs.alert('End time must be after start time.', { title: 'Invalid availability' });
        return;
      }
      if (!selectedWeekdays.length) {
        await window.actionDialogs.alert('Select at least one weekday.', { title: 'Invalid availability' });
        return;
      }

      const groupId = block.dataset.availabilityGroupId || availabilityUid();
      const people = readPeopleRows(peopleEl);
      const targetDates = availabilityDatesInRange(nextFrom, nextTo, selectedWeekdays);

      if (!targetDates.length) {
        await window.actionDialogs.alert('No matching dates in the selected range.', { title: 'Invalid availability' });
        return;
      }

      try {
        setStatus('儲存中...', 'saving');
        const nextSchedules = cloneScheduleMap(await loadFullSchedule());
        removeAvailabilityGroupFromSchedule(nextSchedules, groupId);
        targetDates.forEach(dateStr => {
          if (!Array.isArray(nextSchedules[dateStr])) nextSchedules[dateStr] = [];
          nextSchedules[dateStr].push(availabilityScheduleItem({
            groupId,
            startHHmm: nextStart,
            endHHmm: nextEnd,
            fromDate: nextFrom,
            toDate: nextTo,
            weekdays: selectedWeekdays,
            people
          }));
        });

        await postFullSchedule(nextSchedules);
        allSchedules = nextSchedules;
        rerenderCurrentWeek();
        setStatus('已儲存 ✓');
        close();
      } catch (error) {
        setStatus('儲存失敗：' + error.message, 'error');
        await window.actionDialogs.alert(error.message, { title: 'Availability error' });
      }
    });
  }

  function attachAvailabilityBlockEditor(block) {
    const textEl = block.querySelector('.text');
    if (!textEl || textEl.dataset.availabilityBound) return;
    textEl.dataset.availabilityBound = '1';
    textEl.addEventListener('click', event => {
      event.stopPropagation();
      openAvailabilityEditor(block, { onClose: renderAvailabilityManager });
    });
  }

  function availabilityItemsForDate(dateStr) {
    const byKey = new Map();
    const list = Array.isArray(allSchedules?.[dateStr]) ? allSchedules[dateStr] : [];
    list.forEach(item => {
      if ((item.type || item.itemType) !== 'availability') return;
      const fromDate = item.availabilityFrom || dateStr;
      const toDate = item.availabilityTo || fromDate;
      if (!dateInRange(dateStr, fromDate, toDate)) return;
      const weekdays = parseWeekdaysFromData(item.availabilityWeekdays, []);
      if (weekdays.length && !weekdays.includes(weekdayIndexFromDateStr(dateStr))) return;
      byKey.set(`${item.availabilityGroupId || item.id || dateStr}-${dateStr}-${item.start_time}-${item.end_time}`, item);
    });
    return [...byKey.values()].sort((a, b) => {
      const byStart = hhmmToMinutes(a.start_time) - hhmmToMinutes(b.start_time);
      if (byStart) return byStart;
      return hhmmToMinutes(a.end_time) - hhmmToMinutes(b.end_time);
    });
  }

  function annotateOverlap(items) {
    const sorted = items.map((item, index) => ({ item, index }))
      .sort((a, b) => hhmmToMinutes(a.item.start_time) - hhmmToMinutes(b.item.start_time) || a.index - b.index);
    const result = [];
    let group = [];
    let groupEnd = -1;
    const flush = () => {
      if (!group.length) return;
      const lanes = [];
      group.forEach(entry => {
        const start = hhmmToMinutes(entry.item.start_time);
        let lane = lanes.findIndex(end => end <= start);
        if (lane < 0) lane = lanes.length;
        lanes[lane] = hhmmToMinutes(entry.item.end_time);
        result.push({ item: entry.item, index: entry.index, lane, laneCount: lanes.length, isOverlap: group.length > 1 });
      });
      // All records in a connected overlap group share the final lane count.
      const laneCount = lanes.length;
      result.slice(-group.length).forEach(entry => {
        entry.laneCount = laneCount;
        entry.isOverlap = group.length > 1;
      });
      group = [];
      groupEnd = -1;
    };
    sorted.forEach(entry => {
      const start = hhmmToMinutes(entry.item.start_time);
      const end = hhmmToMinutes(entry.item.end_time);
      if (group.length && start >= groupEnd) flush();
      group.push(entry);
      groupEnd = Math.max(groupEnd, end);
    });
    flush();
    return result.sort((a, b) => a.index - b.index);
  }

  function managerTimeSegments(week) {
    const start = typeof DAY_START_HOUR === 'number' ? DAY_START_HOUR : 8;
    const end = typeof DAY_END_HOUR === 'number' ? DAY_END_HOUR : 18;
    const items = week
      ? week.days.flatMap(day => availabilityItemsForDate(day.dateStr))
      : [];

    if (!items.length) {
      return [{ startHour: 9, endHour: 10 }];
    }

    const segments = items
      .map(item => {
        const itemStart = hhmmToMinutes(item.start_time);
        const itemEnd = hhmmToMinutes(item.end_time);
        const startHour = Math.max(start, Math.floor(itemStart / 60));
        const endHour = Math.min(end, Math.ceil(itemEnd / 60));
        return { startHour, endHour: Math.max(startHour + 1, endHour) };
      })
      .sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);

    return segments.reduce((merged, segment) => {
      const last = merged[merged.length - 1];
      if (!last || segment.startHour > last.endHour) {
        merged.push({ ...segment });
        return merged;
      }
      last.endHour = Math.max(last.endHour, segment.endHour);
      return merged;
    }, []);
  }

  function managerRecordMetrics(item, segments) {
    const itemStart = hhmmToMinutes(item.start_time);
    const itemEnd = hhmmToMinutes(item.end_time);
    let elapsedMinutes = 0;

    for (const segment of segments) {
      const segmentStart = segment.startHour * 60;
      const segmentEnd = segment.endHour * 60;
      if (itemEnd > segmentStart && itemStart < segmentEnd) {
        const start = Math.max(segmentStart, itemStart);
        const end = Math.min(segmentEnd, itemEnd);
        const top = ((elapsedMinutes + start - segmentStart) / 60) * MANAGER_HOUR_HEIGHT;
        const height = Math.max(46, ((end - start) / 60) * MANAGER_HOUR_HEIGHT);
        return { top, height };
      }
      elapsedMinutes += segmentEnd - segmentStart;
    }

    return { top: 0, height: 46 };
  }

  function createAvailabilityBlockForDay(dayIndex) {
    const cols = window.weeklyCalendarBulkContext?.getDayCols?.() || getDayCols();
    const dayEl = cols[dayIndex];
    if (!dayEl) return null;

    const block = createBlockElement({
      top: slotPx,
      height: slotPx * 2,
      dayIndex,
      itemType: 'availability',
      availabilityGroupId: availabilityUid(),
      availabilityPeople: [],
      availabilityFrom: fmtDate(addDays(viewStart, dayIndex)),
      availabilityTo: fmtDate(addDays(viewStart, dayIndex)),
      availabilityWeekdays: dayIndex >= 0 && dayIndex <= 4 ? [dayIndex] : []
    });

    dayEl.appendChild(block);
    window.weeklyCalendarBulkContext?.setupInteract?.(block);
    updateBlockTime(block);
    renderAvailabilityBlock(block);
    attachAvailabilityBlockEditor(block);
    return block;
  }

  function removeAvailabilityGroup(groupId) {
    if (!groupId) return;
    document
      .querySelectorAll(`.block.availability-block[data-availability-group-id="${CSS.escape(groupId)}"]`)
      .forEach(block => block.remove());
  }

  function ensureAvailabilityBlockForDay({ dayIndex, groupId, startHHmm, endHHmm, fromDate, toDate, weekdays, people }) {
    const cols = window.weeklyCalendarBulkContext?.getDayCols?.() || getDayCols();
    const dayEl = cols[dayIndex];
    if (!dayEl) return null;

    const blockDate = fmtDate(addDays(viewStart, dayIndex));
    const block = createBlockElement({
      top: slotPx,
      height: slotPx,
      dayIndex,
      itemType: 'availability',
      availabilityGroupId: groupId,
      availabilityFrom: fromDate,
      availabilityTo: toDate,
      availabilityWeekdays: weekdays,
      availabilityPeople: people
    });

    dayEl.appendChild(block);
    window.weeklyCalendarBulkContext?.setupInteract?.(block);
    block.dataset.availabilityDate = blockDate;
    applyTimesToBlock(block, startHHmm, endHHmm);
    renderAvailabilityBlock(block);
    attachAvailabilityBlockEditor(block);
    return block;
  }

  function renderAvailabilityManager() {
    const manager = document.querySelector('.availability-manager-dialog');
    if (!manager) return;

    const weeksEl = manager.querySelector('.availability-weeks');
    weeksEl.innerHTML = '';

    managerWeeks().forEach(week => {
      const timeSegments = managerTimeSegments(week);
      const totalHours = timeSegments.reduce((sum, segment) => sum + segment.endHour - segment.startHour, 0);
      const weekSection = document.createElement('section');
      weekSection.className = 'availability-week-section';
      weekSection.innerHTML = `
        <div class="availability-week-title">
          <strong>${week.title}</strong>
          <span>${week.days[0].dateStr} - ${week.days[6].dateStr}</span>
        </div>
        <div class="availability-week-calendar">
          <div class="availability-time-head">時間</div>
          <div class="availability-calendar-head"></div>
          <div class="availability-time-ruler"></div>
          <div class="availability-calendar-body"></div>
        </div>
      `;

      const head = weekSection.querySelector('.availability-calendar-head');
      const ruler = weekSection.querySelector('.availability-time-ruler');
      const body = weekSection.querySelector('.availability-calendar-body');
      weekSection.querySelector('.availability-time-head').textContent = '時間';

      week.days.forEach(day => {
        const dayHead = document.createElement('div');
        dayHead.className = 'availability-calendar-day-head';
        dayHead.innerHTML = `
          <div>
            <strong>${day.label}</strong>
            <span>${day.dateStr}</span>
          </div>
          <button type="button" class="availability-day-add" title="Add availability"${day.weekOffset !== 0 ? ' disabled' : ''}>
            <i class="fa-solid fa-plus"></i>
          </button>
        `;
        dayHead.querySelector('.availability-day-add').addEventListener('click', () => {
          if (day.weekOffset !== 0) return;
          const block = createAvailabilityBlockForDay(day.dayIndex);
          if (!block) return;
          block.dataset.availabilityDraft = '1';
          openAvailabilityEditor(block, { onClose: renderAvailabilityManager });
        });
        head.appendChild(dayHead);

        const lane = document.createElement('div');
        lane.className = 'availability-calendar-lane';
        lane.style.height = `${totalHours * MANAGER_HOUR_HEIGHT}px`;

        const items = availabilityItemsForDate(day.dateStr);
        if (!items.length) {
          lane.classList.add('is-empty');
        } else {
        annotateOverlap(items).forEach(({ item, lane: laneIndex, laneCount, isOverlap }) => {
          const row = document.createElement('button');
          row.type = 'button';
          row.className = `availability-record${isOverlap ? ' is-overlap' : ''}`;
          const { top, height } = managerRecordMetrics(item, timeSegments);
          row.style.setProperty('--record-top', `${top}px`);
          row.style.setProperty('--record-height', `${height}px`);
          row.style.setProperty('--overlap-lane', String(laneIndex));
          row.style.setProperty('--overlap-lanes', String(laneCount));
          const people = parsePeopleFromData(item.availabilityPeople);
          const chips = people.map(person => {
            const status = STATUS[person.status] || STATUS.free;
            const safeName = escapeHtml(person.name);
            return `<span class="availability-chip ${status.className}" title="${safeName} ${status.label}">${safeName}</span>`;
          }).join('');
          row.innerHTML = `
            <span class="availability-record-time">${item.start_time} ~ ${item.end_time}</span>
            <span class="availability-record-body">
              <span class="availability-record-people">${chips || '<span class="availability-empty">No people</span>'}</span>
            </span>
          `;
          row.addEventListener('click', () => {
            const block = document.querySelector(`.block[data-id="${CSS.escape(item.id)}"]`);
            if (block) openAvailabilityEditor(block, { onClose: renderAvailabilityManager });
          });
          lane.appendChild(row);
        });
        }

        body.appendChild(lane);
      });

      timeSegments.forEach((segment, segmentIndex) => {
        for (let hour = segment.startHour; hour < segment.endHour; hour += 1) {
          const hourEl = document.createElement('div');
          hourEl.className = `availability-hour${segmentIndex > 0 && hour === segment.startHour ? ' is-segment-start' : ''}`;
          hourEl.textContent = `${String(hour).padStart(2, '0')}:00`;
          ruler.appendChild(hourEl);
        }
      });
      weeksEl.appendChild(weekSection);
    });
  }

  function openAvailabilityManager() {
    document.querySelectorAll('.availability-manager-overlay').forEach(el => el.remove());

    const overlay = document.createElement('div');
    overlay.className = 'dt-dialog-overlay availability-manager-overlay';
    overlay.innerHTML = `
      <div class="dt-dialog availability-manager-dialog">
        <div class="availability-manager-head">
          <div>
            <div class="dt-dialog-title">Availability Week</div>
            <div class="dt-dialog-subtitle">Manage Monday to Sunday records. Calendar blocks update on the matching dates.</div>
          </div>
          <button type="button" class="bulk-close availability-manager-close" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="availability-weeks"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.availability-manager-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.remove();
    });
    renderAvailabilityManager();
  }

  window.renderAvailabilityBlock = renderAvailabilityBlock;
  window.attachAvailabilityBlockEditor = attachAvailabilityBlockEditor;
  window.openAvailabilityEditor = openAvailabilityEditor;
  window.openAvailabilityManager = openAvailabilityManager;

  window.getWeeklyCalendarCreateOptions = () => ({});

  window.afterWeeklyCalendarBlockCreated = () => {};

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.invite-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      openAvailabilityManager();
    });
  });
})();
