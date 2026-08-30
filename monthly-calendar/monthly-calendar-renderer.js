  let calendarContainer = document.getElementById("calendars");
  let months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const left_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <path d="M112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320zM576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320zM188.7 308.7C182.5 314.9 182.5 325.1 188.7 331.3L292.7 435.3C297.3 439.9 304.2 441.2 310.1 438.8C316 436.4 320 430.5 320 424L320 352L424 352C437.3 352 448 341.3 448 328L448 312C448 298.7 437.3 288 424 288L320 288L320 216C320 209.5 316.1 203.7 310.1 201.2C304.1 198.7 297.2 200.1 292.7 204.7L188.7 308.7z"/>
  </svg>`;

  const right_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM451.3 331.3C457.5 325.1 457.5 314.9 451.3 308.7L347.3 204.7C342.7 200.1 335.8 198.8 329.9 201.2C324 203.6 320 209.5 320 216L320 288L216 288C202.7 288 192 298.7 192 312L192 328C192 341.3 202.7 352 216 352L320 352L320 424C320 430.5 323.9 436.3 329.9 438.8C335.9 441.3 342.8 439.9 347.3 435.3L451.3 331.3z"/>
  </svg>`;

  let date = new Date();
  let curYear = date.getFullYear();
  let curMonth = date.getMonth();
  // Only the active month is currently rendered.
  const monthOffsets = [0];

  function init_calendar() {        
    renderCalendar(curYear, curMonth);
  }

  function renderCalendar(baseYear, baseMonth) {
    // console.log({baseYear,baseMonth})
    calendarContainer.innerHTML = "";

    // Build each configured month view.
    monthOffsets.forEach((offset, index) => {
      // console.log({offset,index})
      // Compute the displayed month.
      let targetDate = new Date(curYear, curMonth + offset, 1);
      // targetDate = Sat Nov 01 2025 00:00:00 GMT+0800
      let displayMonth = targetDate.getMonth();
      let displayYear = targetDate.getFullYear();
      // console.log({displayYear, displayMonth, targetDate})
      // The abbreviated month label comes from the shared month array.
      // let monthAbbrev = months[displayMonth].slice(0, 3);

      // Render the weekday header and date grid.
      let weeksHTML = `
        <ul class="weeks">
          <li>Sun</li><li>Mon</li><li>Tue</li><li>Wed</li>
          <li>Thu</li><li>Fri</li><li>Sat</li>
        </ul>
      `;
      const datesClass = `dates${offset === 0 ? "" : `-${Math.abs(offset)}`}`;

      // const left_btn = document.querySelector(".btn.left");
      // left_btn.innerHTML = left_SVG;
      // <i class="fa-regular fa-calendar"></i>
      const calendarHTML = `
        <div class="calendar">
        <div class="calendar-body">
          <div class="calendar-header">
            <a href="/week/" class="week-link" title="Open weekly view">
              <i class="fi fi-rc-calendar-week"></i><span class="btn-word">week-mode</span>
            </a>
            <a href="/day/" class="day-link" title="Open daily view">
              <i class="fi fi-rc-calendar-day"></i><span class="btn-word">day-mode</span>
            </a>
            <div class="server-actions">
              <span id="save-status" class="status"></span>
            </div>
            <button class="btn-dir left">${left_SVG}</button>
            <div class="month-header">${months[displayMonth]} ${displayYear}</div>
            <button class="btn-dir right">${right_SVG}</button>
            <a href="#" class="user_name_popup account-user-trigger" id ="show-user-name">
              <span class="btn-word">Hi, ${user_name}</span><i class="fa-regular fa-user"></i>
            </a>
          </div>
          ${weeksHTML}
          <ul class="${datesClass}"></ul>
        </div>
        </div>`;

      calendarContainer.innerHTML += calendarHTML;

      const cols = getMonthColumns(displayYear, displayMonth);

      // Apply the computed row count to the newly rendered calendar.
      const calEl   = calendarContainer.lastElementChild;
      const datesUl = calEl.querySelector(`.${datesClass}`);
      datesUl.dataset.columns = cols;
      setCalendarWidth(calEl, datesUl, index === 0);
    });

    bindMonthSwitchers();
    // bindKeyboardControls();
    // const dateClasses = [".dates", ".dates-1", ".dates-2"];
    // Example for multiple months: const monthOffsets = [0, -1, -2];
    const dateClasses = monthOffsets.map(
        offset => `.dates${offset === 0 ? "" : `-${Math.abs(offset)}`}`
    );
    // console.log('dateClasses: ',dateClasses)

    // Build each date grid.
    // buildCal(year, month, ".dates");
    dateClasses.forEach((className, index) => {
      let targetDate = new Date(curYear, curMonth + monthOffsets[index], 1);
      // console.log({index,className,targetDate})
      buildCal(targetDate.getFullYear(), targetDate.getMonth(), className);
    });
  }

  async function changeMonth(delta /* -1=previous, +1=next */) { // Monthly Task List / Persistence
    // console.log({curYear,curMonth})
    // Update the active year and month.
    if (delta === -1) {
      if (curMonth === 0) { curMonth = 11; curYear -= 1; } else { curMonth -= 1; }
    } else if (delta === +1) {
      if (curMonth === 11) { curMonth = 0; curYear += 1; } else { curMonth += 1; }
    }

    // Render the new month immediately.
    renderCalendar(curYear, curMonth);

    // Load the month data from the server.
    // Monthly Task List / Persistence
    try {
      dayTasks = await fetchFromServer({ year: curYear, month: curMonth });
    } catch (e) {
      console.error(e);
      setStatus(`Load failed: ${e.message}`, 'error');
      dayTasks = {};
    }

    // Restore task controls for populated date cells.
    initTaskUIsFromStorage(); //Monthly Task List / Persistence
    setStatus('Loaded'); // Monthly Persistence / Sync
  }

  // Bind previous/next month controls.
  function bindMonthSwitchers() {
    const leftBtn  = calendarContainer.querySelector(".btn-dir.left");
    const rightBtn = calendarContainer.querySelector(".btn-dir.right");

    if (leftBtn) {
      leftBtn.addEventListener("click", () => { changeMonth(-1); });
    }
    if (rightBtn) {
      rightBtn.addEventListener("click", () => { changeMonth(+1); });
    }
  }
  
  // Optional keyboard navigation.
  // let keyboardBound = false;
  // function bindKeyboardControls() {
  //   // Bind only once.
  //   if (keyboardBound) return;
  //   keyboardBound = true;

  //   document.addEventListener('keydown', (e) => {
  //     // Do not intercept arrow keys while editing text.
  //     const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  //     if (inInput) return;

  //     if (e.key === 'ArrowLeft') {
  //       e.preventDefault();
  //       changeMonth(-1);
  //     } else if (e.key === 'ArrowRight') {
  //       e.preventDefault();
  //       changeMonth(+1);
  //     }
  //   }, { passive: false });
  // }
  
  function getMonthColumns(y, m) {
    const dayFirst  = new Date(y, m, 1).getDay();
    const lastdate  = new Date(y, m + 1, 0).getDate();
    const dayLast   = new Date(y, m, lastdate).getDay()  
    // console.log({dayFirst,lastdate,dayLast})
    return Math.ceil((dayFirst + lastdate + (6 - dayLast)) / 7);
  }

  // Keep the calendar responsive to its container.
  function setCalendarWidth(calEl, datesUl, hasWeeksHeader){
      // Let the calendar and its seven columns fill the responsive container.
      calEl.style.width = '100%';
  }

  // console.log(document.querySelector(".dates-1"));
  // console.log(document.querySelector(".dates-2"));

  function buildCal(year, month, targetElement){
    // Build all date cells for the requested month.
    const today = new Date();
    const li = [];

    let datesContainer = document.querySelector(targetElement);
    // getDay() returns 0 (Sunday) through 6 (Saturday).
    //get first day of the month
    let dayFirst = new Date(year, month, 1).getDay();
    //get last date of the month
    let lastdate = new Date(year, month + 1, 0).getDate();
    // //get day of the last date of the month
    // let dayLast = new Date(year, month, lastdate).getDay();

    // Resolve the previous month for leading inactive cells.
    const prevMonthDate = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthDate.getDate();
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth(); // 0-indexed
    // console.log({prevMonthDate,prevMonthLastDate,prevYear,prevMonth})

    // Resolve the next month for trailing inactive cells.
    const nextMonthDate = new Date(year, month + 1, 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth(); // 0-indexed

    // let monthAbbrev = months[month].slice(0, 3); // months = ['JAN','FEB','MAR'...
    // let yearAbbrev = year.toString().slice(-2);
    // console.log({monthAbbrev,yearAbbrev})
    // let liTags = "";
    // let counter = 0;
    // let monDisplayed = false;

    const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // Add leading dates from the previous month.
    for (let i = 0; i < dayFirst; i++) {
      const day = prevMonthLastDate - (dayFirst - 1) + i;
      // console.log({prevMonthLastDate,dayFirst})
      const cur = new Date(prevYear, prevMonth, day);
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      li.push(
        `<li class="inactive" data-tooltip="${dateStr}">
          <p class="month">${months[cur.getMonth()]} ${day}</p>
          <!-- <p class="day">${weekdayNames[cur.getDay()]}</p> -->
          <!-- <p class="date">${day}</p> -->
          <!-- <p class="year">${prevYear}</p> -->
        </li>`
      );
    }
    // Add dates from the active month.
    for (let d = 1; d <= lastdate; d++) {
      const cur = new Date(year, month, d);
      const isToday =
        d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
        ? "today" : "active";
      const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      // li.push(`<li class="${isToday}" data-tooltip="${dateStr}" onclick="console.log('${dateStr}')"></li>`);
      li.push(
        `<li class="${isToday}" data-tooltip="${dateStr}" >
          <p class="month">${months[cur.getMonth()]} ${d}</p>
          <!-- <p class="day">${weekdayNames[cur.getDay()]}</p> -->
          <!-- <p class="date">${d}</p> -->
          <!-- <p class="year">${year}</p> -->
        </li>`
      );
    }

    // Add trailing dates from the next month.
    const tail = (dayFirst + lastdate) % 7;
    if (tail !== 0) {
      for (let i = tail; i < 7; i++) {
        const day = i - tail + 1;
        const cur = new Date(nextYear, nextMonth, day);
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        li.push(
          `<li class="inactive" data-tooltip="${dateStr}">
            <p class="month">${months[cur.getMonth()]} ${day}</p>
            <!-- <p class="day">${weekdayNames[cur.getDay()]}</p> -->
            <!-- <p class="date">${day}</p> -->
            <!-- <p class="year">${nextYear}</p> -->
          </li>`
        );
      }
    }
    datesContainer.innerHTML = li.join('');
  };

  document.addEventListener("DOMContentLoaded", () => {
    init_calendar()
  });
