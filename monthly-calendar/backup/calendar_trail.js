/**
 * 回傳目前 calendarContainer 中 task-add-btn 的統計
 * result = {
 *   count: 3,                     // 總共有幾顆＋
 *   dates: ["2025-10-14", ...],   // 哪些日期有＋
 *   visibleCount: 1,              // 目前顯示中的＋數量（有 .visible）
 *   visibleDates: ["2025-10-14"], // 顯示中的日期
 *   byDate: { "2025-10-14": { hasAddBtn:true, visible:true }, ... }
 * }
 */
function getAddBtnSummary() {
  const result = {
    count: 0,
    dates: [],
    // visibleCount: 0,
    // visibleDates: [],
    // byDate: {}
  };

  const cells = calendarContainer.querySelectorAll('li[data-tooltip]');
  cells.forEach(li => {
    const dateKey = li.getAttribute('data-tooltip');
    const btn = li.querySelector('.task-add-btn');
    const has = !!btn;
    const vis = !!(btn && btn.classList.contains('visible'));

    // result.byDate[dateKey] = { hasAddBtn: has, visible: vis };

    if (has) {
      result.count += 1;
      result.dates.push(dateKey);
    //   if (vis) {
    //     result.visibleCount += 1;
    //     result.visibleDates.push(dateKey);
    //   }
    }
  });

  return result;
}

// 用法示例：
/*
console.log(getAddBtnSummary());
// => { count: 2, dates: [...], visibleCount: 1, visibleDates: [...], byDate: {...} }
*/

function getAddBtnBrief() {
  const dates = [...calendarContainer.querySelectorAll('li[data-tooltip] .task-add-btn')]
    .map(btn => btn.closest('li[data-tooltip]')?.getAttribute('data-tooltip'))
    .filter(Boolean);
  return { count: dates.length, dates };
}
