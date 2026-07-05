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
  // 定義月份名稱
  // const monthNames = ["當月", "上個月", "上上個月"];
  // const monthOffsets = [-2, -1, 0]; // 0 代表當月，-1 代表上個月，-2 代表上上個月
  const monthOffsets = [0];

  function init_calendar() {        
    renderCalendar(curYear, curMonth);
  }

  function renderCalendar(baseYear, baseMonth) {
    // console.log({baseYear,baseMonth})
    calendarContainer.innerHTML = ""; // 先清空

    // 動態生成日曆結構
    monthOffsets.forEach((offset, index) => {
      // console.log({offset,index})
      // 透過 Date 物件自動處理月份溢出
      let targetDate = new Date(curYear, curMonth + offset, 1);
      // targetDate = Sat Nov 01 2025 00:00:00 GMT+0800
      let displayMonth = targetDate.getMonth();
      let displayYear = targetDate.getFullYear();
      // console.log({displayYear, displayMonth, targetDate})
      // 取當月三碼縮寫（例如 "Jan"）
      // let monthAbbrev = months[displayMonth].slice(0, 3);

      // 只有 index 為 0 才生成週標題（可改成每月都顯示）
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
            <a href="/week/" class="week-link" title="切換到週曆">
              <i class="fi fi-rc-calendar-week"></i><span class="btn-word">week-mode</span>
            </a>
            <a href="/day/" class="day-link" title="切換到日曆">
              <i class="fi fi-rc-calendar-day"></i><span class="btn-word">day-mode</span>
            </a>
            <div class="server-actions">
              <span id="save-status" class="status">—</span>
            </div>
            <button class="btn-dir left">${left_SVG}</button>
            <div class="month-header">${months[displayMonth]} ${displayYear}</div>
            <button class="btn-dir right">${right_SVG}</button>
            <a href="#" class="user_name_popup" id ="show-user-name">
              <span class="btn-word">Hi, ${user_name}</span><i class="fa-regular fa-user"></i>
            </a>
          </div>
          ${weeksHTML}
          <ul class="${datesClass}"></ul>
        </div>
        </div>`;

      calendarContainer.innerHTML += calendarHTML;

      const cols = getMonthColumns(displayYear, displayMonth);              // 這裡就先算好該月有幾欄

      // 存到剛插入的元素並設定寬度
      const calEl   = calendarContainer.lastElementChild;                   // 這個月的 .calendar
      const datesUl = calEl.querySelector(`.${datesClass}`);
      datesUl.dataset.columns = cols;                                       // optional: 方便除錯
      setCalendarWidth(calEl, datesUl, index === 0);
    });

    bindMonthSwitchers(); // 綁定左右按鈕
    // bindKeyboardControls(); // 綁定鍵盤事件

    // const dateClasses = [".dates", ".dates-1", ".dates-2"];
    // const monthOffsets = [0, -1, -2]; //剛上方共用
    // 動態生成 classNames，例如：[".dates", ".dates-1", ".dates-2"]
    const dateClasses = monthOffsets.map(
        offset => `.dates${offset === 0 ? "" : `-${Math.abs(offset)}`}`
    );
    // console.log('dateClasses: ',dateClasses)

    // // 生成當月日曆
    // buildCal(year, month, ".dates");
    // 定義目標 class 和對應的月份
    // 使用 forEach 簡化重複的函式調用
    dateClasses.forEach((className, index) => {
      let targetDate = new Date(curYear, curMonth + monthOffsets[index], 1);
      // console.log({index,className,targetDate})
      buildCal(targetDate.getFullYear(), targetDate.getMonth(), className);
    });
  }

  async function changeMonth(delta /* -1=上一月, +1=下一月 */) { // !!!task-list.js!!!
    // console.log({curYear,curMonth})
    // 1) 更新 curYear / curMonth
    if (delta === -1) {
      if (curMonth === 0) { curMonth = 11; curYear -= 1; } else { curMonth -= 1; }
    } else if (delta === +1) {
      if (curMonth === 11) { curMonth = 0; curYear += 1; } else { curMonth += 1; }
    }

    // 2) 重畫整個月曆（三個月）
    renderCalendar(curYear, curMonth);

    // 3) 依新的年月抓後端資料
    // !!!task-list.js!!!
    try {
      dayTasks = await fetchFromServer({ year: curYear, month: curMonth });
    } catch (e) {
      console.error(e);
      setStatus('載入失敗：' + e.message, 'error');
      dayTasks = {};
    }

    // 4) 把資料「套回到這次新畫出的 li[data-tooltip]」上
    initTaskUIsFromStorage(); //!!!task-list.js!!!
    setStatus('已載入 ✓'); //!!!task-list.js!!!
  }

  // 綁定左右切換按鈕
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
  
  // // ✅鍵盤事件（上下左右鍵切月）
  // let keyboardBound = false;
  // function bindKeyboardControls() {
  //   // 避免重複綁定
  //   if (keyboardBound) return;
  //   keyboardBound = true;

  //   document.addEventListener('keydown', (e) => {
  //     // 如果正在輸入文字，就略過
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

  // 依欄數設定 .calendar 的寬度
  function setCalendarWidth(calEl, datesUl, hasWeeksHeader){
      // const rowH = parseInt(getComputedStyle(datesUl).getPropertyValue('--rowH'));
      // calEl.style.height = (30.4 + 20 + 6 * rowH + 12 + 10) + 'px';

      const colW = parseInt(getComputedStyle(datesUl).getPropertyValue('--colW')) || 50;
      const gap = parseInt(getComputedStyle(datesUl).getPropertyValue('--gap'));
      calEl.style.width = (7 * colW + 6 * gap + 6 * 2) + 'px';
  }

  // console.log(document.querySelector(".dates-1")); // 應該顯示 <ul class="dates-1"></ul>
  // console.log(document.querySelector(".dates-2")); // 應該顯示 <ul class="dates-2"></ul>

  function buildCal(year, month, targetElement){
    // ⬇️ 新增：今天基準與陣列
    const today = new Date();
    const li = [];

    let datesContainer = document.querySelector(targetElement);
    // getDay() 返回的數值範圍是 0 到 6，分別代表星期日 (0) 到星期六 (6)
    //get first day of the month
    let dayFirst = new Date(year, month, 1).getDay();
    //get last date of the month
    let lastdate = new Date(year, month + 1, 0).getDate();
    // //get day of the last date of the month
    // let dayLast = new Date(year, month, lastdate).getDay();

    // 取得前一個月的最後一天資訊
    const prevMonthDate = new Date(year, month, 0); // 前個月的最後一天
    const prevMonthLastDate = prevMonthDate.getDate();
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth(); // 0-indexed
    // console.log({prevMonthDate,prevMonthLastDate,prevYear,prevMonth})

    // 取得下一個月資訊
    const nextMonthDate = new Date(year, month + 1, 1); // 下個月的第一天
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth(); // 0-indexed

    // let monthAbbrev = months[month].slice(0, 3); // months = ['JAN','FEB','MAR'...
    // let yearAbbrev = year.toString().slice(-2);
    // console.log({monthAbbrev,yearAbbrev})
    // let liTags = "";
    // let counter = 0;
    // let monDisplayed = false; // 標記是否已經插入過有內容的 .mon

    const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // 1) 前置空格：用前一個月的最後幾天填滿，並帶四段 <p>
    for (let i = 0; i < dayFirst; i++) {
      // day為前一個月的最後幾天填滿 e.g.如果當月起使為周三，那週日到週二由這邊填
      const day = prevMonthLastDate - (dayFirst - 1) + i; // NOV'25 從 (最後日:31 - dayFirst:6 + 1) 起算
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
    // 2) 當月日期：由左到右自動換行（每 7 欄會自動到下一列）
    for (let d = 1; d <= lastdate; d++) {
      const cur = new Date(year, month, d);
      const isToday =
        d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
        ? "today" : "active"; // 年-月-日對到給today, 其餘給active
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

    // 3) 尾端空格：用下一個月的前幾天填滿，並帶四段 <p>
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
