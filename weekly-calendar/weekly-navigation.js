/* Weekly topbar and navigation module. */

    // ===== 參數 =====
    // const DAYS = ["週一","週二","週三","週四","週五","週六","週日"];
    // const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const DAY_START_HOUR = 8;   // 顯示開始小時（含）
    const DAY_END_HOUR   = 18;  // 顯示結束小時（不含）

    // 從 CSS 變數讀值，只讀一次
    const root = getComputedStyle(document.documentElement);
    const HOUR_HEIGHT  = parseFloat(root.getPropertyValue('--hourHeight')); // px，例如 64px -> 64
    const SLOT_MINUTES = Number(root.getPropertyValue('--slot')) || 30;     // 分鐘，例如 "30" -> 30

    // 用同一個 SLOT_MINUTES 算像素格高（1 格 = SLOT_MINUTES 分鐘）
    const slotPx = HOUR_HEIGHT * (SLOT_MINUTES / 60);

    const topbar  = document.getElementById('topbar');
    const content = document.getElementById('content');
    const ruler   = document.getElementById('ruler');

    let dayCols = [];
    
    /* ===================== ① 🧠 周曆 topbar / ruler / dayCols ===================== */

    // 依「週起算日」產生 topbar / ruler / dayCols
    /**/
    function initTopbarRulerAndDays(viewStartDate){
        // 先清空（保留左側「時間」標頭與尺）
        topbar.querySelectorAll('.cell:not(.ruler)').forEach(n => n.remove());
        dayCols.forEach(n => n.remove());
        dayCols = [];

        // ===== topbar（日期 + 星期）=====
        for (let i = 0; i < 7; i++) {
        const d = addDays(viewStartDate, i);
        const c = document.createElement('div');
        c.className = 'cell';
        c.innerHTML = `
            <span class="date">${fmtDate(d)}</span>
            <span class="wk">${DAYS[i]}</span>
        `;
        topbar.appendChild(c);
        }

        // ===== left ruler（若第一次才建）=====
        // 第一次呼叫時，ruler 裡還沒有任何 .hour 子元素，
        // 所以 childElementCount === 0，條件成立，建立刻度
        if (!ruler.childElementCount){
            for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
                const hour = document.createElement('div');
                hour.className = 'hour';
                hour.textContent = `${pad2(h)}:00`;
                ruler.appendChild(hour);
            }
        }

        // ===== 7 day columns =====
        for (let i = 0; i < 7; i++) {
            const day = document.createElement('div');
            day.className = 'day';
            day.dataset.dayIndex = String(i);
            day.style.height = `calc((var(--hourHeight) * ${DAY_END_HOUR - DAY_START_HOUR}))`;
            content.appendChild(day);
            dayCols.push(day);
        }
        // console.log(dayCols)
    }

/* Previous/next week and keyboard navigation. */

  const left_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <path d="M112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320zM576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320zM188.7 308.7C182.5 314.9 182.5 325.1 188.7 331.3L292.7 435.3C297.3 439.9 304.2 441.2 310.1 438.8C316 436.4 320 430.5 320 424L320 352L424 352C437.3 352 448 341.3 448 328L448 312C448 298.7 437.3 288 424 288L320 288L320 216C320 209.5 316.1 203.7 310.1 201.2C304.1 198.7 297.2 200.1 292.7 204.7L188.7 308.7z"/>
  </svg>`;
  const right_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
  <path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM451.3 331.3C457.5 325.1 457.5 314.9 451.3 308.7L347.3 204.7C342.7 200.1 335.8 198.8 329.9 201.2C324 203.6 320 209.5 320 216L320 288L216 288C202.7 288 192 298.7 192 312L192 328C192 341.3 202.7 352 216 352L320 352L320 424C320 430.5 323.9 436.3 329.9 438.8C335.9 441.3 342.8 439.9 347.3 435.3L451.3 331.3z"/>
  </svg>`;

  /* ===================== 鍵盤控制切換週 ===================== */
  function bindKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      const key = e.key;
      const leftBtn  = document.getElementById('btnPrevWeek');
      const rightBtn = document.getElementById('btnNextWeek');

      if (!leftBtn || !rightBtn) return;
      // 左鍵 / 上鍵 → 上一週
      if (key === 'ArrowLeft' || key === 'ArrowUp') {
        e.preventDefault();
        leftBtn.click();
      }
      // 右鍵 / 下鍵 → 下一週
      else if (key === 'ArrowRight' || key === 'ArrowDown') {
        e.preventDefault();
        rightBtn.click();
      }
    });
  }
