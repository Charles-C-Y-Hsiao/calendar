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