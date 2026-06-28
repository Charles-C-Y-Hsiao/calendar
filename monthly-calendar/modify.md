month-schedule 的 task-list.js 中
```js
    function ensureTaskUI(li) {
        // 2) 📝 按鈕（打開 day-panel）
        if (!li.querySelector('.task-edit-btn')) {
            .
            .
            .
        }
    }
```

month-schedule 的calendar.js calendar-header

<a href="http://localhost:3010/week/" class="week-link" title="切換到週曆">
    <i class="fa-regular fa-calendar"></i><span class="btn-word">week-mode</span>
</a>

```css
  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    position: relative;
  }
  /* 週曆連結靠左 */
  .week-link {
    position: absolute;
    left: 0;
    font-size: 20px;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    cursor: pointer;
    color: #333;
    text-decoration: none;
  }
  .week-link .btn-word {
    font-size: 15px;
    font-weight: 900;
    margin-left: 5px;
    user-select: none;
    font-family: "calibri", sans-serif;
  }

  .week-link:hover {
    color: #4f46e5; /* hover 效果（可調整） */
  }
```

week-schedule的week-schedule.html
```js
    <div class="weekbar">
      <a href="http://localhost:3010/month/" class="month-link">
        <i class="fa-regular fa-calendar-days"></i><span class="btn-word">month-mode</span>
      </a>
```
```css
    /* 週區間導覽列 */
    .weekbar{
        display:flex;
        align-items:center;
        justify-content: center;
        gap:8px;
        padding:8px 10px; background:#fbfbfe; border-bottom:1px solid var(--gray-mid);
        position: relative;
    }
    /* 月曆連結靠左 */
    .month-link {
        position: absolute;
        left: 8px;
        font-size: 20px;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        cursor: pointer;
        color: #333;
        text-decoration: none;
    }
    .month-link .btn-word {
        font-size: 15px;
        font-weight: 900;
        margin-left: 5px;
        user-select: none;
    }

    .month-link:hover {
        color: #4f46e5; /* hover 效果（可調整） */
    }
```