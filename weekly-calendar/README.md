
# 🧩 weekly | week-schedule
# 🧠 `function initTopbarRulerAndDays(viewStartDate)` topbar / ruler / dayCols at `TopbarRulerAndDays.js`
# 🧠 `function initInteractForBlocks()` 其中setupInteract(block)包著 const dragOptions/const resizeOptions at [interact-drag-resize.js]
# 🧠 `function initCreateGhostOrBlock(setupInteract)`當日產生ghost or block邏輯 at [CreateGhostOrBlock.js]
# 🧠 `function bindKeyboardControls()`綁定鍵盤事件at[PreAndNextWeek.js]


1️⃣ DOM 產生狀態（emit / create UI state）
2️⃣ 前端監聽並反應（read UI state）
3️⃣ 傳送狀態到後端（persist → Create / Update）
4️⃣ 後端回傳狀態（Read）
5️⃣ DOM 根據資料重新渲染（render）


CRUD 是「資料存取模型」
DOM / UI 是「狀態流模型」
兩者不能混用順序來看

或更白話一點：

在 UI 世界裡，
「先有狀態，才有讀取」是很正常的
但在資料庫世界裡，
「一定要先能讀，CRUD 才有意義」

Create-Readt-Update-Delete



# [weekly-calendar-core.js]
- fmtDate(d) 將d = Mon Dec 08 2025 00:00:00 GMT+08 轉化為yyyy-mm-dd
- 時間 ↔ px 轉換 hhmmToMinutes(hhmm), minutesToHhmm(min), topHeightFromTimes(startHHmm, endHHmm), timesFromTopHeight(topPx, heightPx)
- 
- allSchedules = {};   // 整份JSON map：{ '2025-11-14': [ ... ], ... }
- `renderWeekFromMap(startDate, setupInteract, dataMap)`
- const cols = getDayCols(); // 取得最新body中的一周7天的div.day at [setupElements.js]

# renderDayFromData(dayIndex, items, setupInteract)
 - 清理當"天"資料
 - start_time/end_time換算top & height使用topHeightFromTimes(itm.start_time, itm.end_time)
 - `createBlockElement()建立block → appendChild()加入div.day → setupInteract()將該block賦能 → updateBlockTime()填入block時間`

# renderWeekFromMap(startDate, setupInteract, dataMap, getDayCols)
 - cols.forEach((el, i) => {...}) 清理當"周"資料，不是"刪除"
 - weekDates(startDate) at [weekly-calendar-core.js]
 - weekDates(startDate) 回傳 7 個日期字串的陣列 → forEach((dStr, i) => {...})
 - rawArr.forEach(obj => {...})當天資料確認是否都存在start_time/end_time
 - 呼叫 `renderDayFromData(i, items, setupInteract)`

# `後端get`loadWeek(startDate, setupInteract, getDayCols)
 - 使用startDate & startDate+6 取得當周資料後合併到 allSchedules(all 每日事項)
 - 呼叫`renderWeekFromMap(startDate, setupInteract, allSchedules, getDayCols)`
  - 再呼叫renderDayFromData(i, items, setupInteract); 渲染每日

# function createBlockElement({ top, height, dayIndex, id, text})
 - init → blinding event
 - '.btn-delete click' 刪除該block → persistDay(dIdx)立刻儲存當天
 - txt.addEventListener('input', debouncedSave);
 - attachTimeEditor(block); 呼叫 `openDateTimeDialog()`更新前/後端 at[interact-drag-resize.js]
# [weekly-calendar-core.js]

# [TopbarRulerAndDays.js]
- const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
- const DAY_START_HOUR = 8; const DAY_END_HOUR   = 18;
# const HOUR_HEIGHT  = parseFloat(root.getPropertyValue('--hourHeight')); // px，例如 64px -> 64 --hourHeight: 64px; /* 每小時高度 */
# const SLOT_MINUTES = Number(root.getPropertyValue('--slot')) || 30;     // 分鐘，例如 "30" -> 30
- const slotPx = HOUR_HEIGHT * (SLOT_MINUTES / 60); (1 格 = SLOT_MINUTES 分鐘)
# function initTopbarRulerAndDays(viewStartDate) 依「週起算日」產生 topbar / ruler / dayCols
- topbar（日期 + 星期）
- left ruler（若第一次才建）
- 7 day columns
 - 全域 dayCols = [div.day,div.day,div.day,div.day,div.day,div.day,div.day]
# dayCols is array 從function initTopbarRulerAndDays()生成
# [TopbarRulerAndDays.js]

# [interact-drag-resize.js]
- const stepX = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dayWidth')) || 140; // 水平吸附到日欄寬
--dayWidth: 140px;     /* 每天欄寬 */
# const stepY = slotPx; const slotPx = HOUR_HEIGHT * (SLOT_MINUTES / 60); at `TopbarRulerAndDays.js`
# function initInteractForBlocks({ slotPx, stepY, stepX, getDayCols }) {
    function setupInteract(block) {
      interact(block)
        .draggable(...)
        .resizable(...);
    }
    return setupInteract; // 這是一個有「拖曳＋縮放」的套件函式可以賦值element
  }
- function createDragOptions({ stepX, dayCols })
- function createResizeOptions(slotPx, stepY)
- function attachTimeEditor(block) `dblclick`綁訂在block的.time
  - 將dIdx轉為oldDateStr，將.time分別轉為 top|h|t|startHHmm|endHHmm
  - openDateTimeDialog() 搜集user輸入的資訊
    - 情況一：日期沒變，只改同一天時間
    - 情況二：日期有改變，要搬到 newDateStr
# setupInteract 是一個可以賦予HTML element功能的函式，下方抽象概念舉例:
- setupInteract 是一瓶「拖曳＋縮放藥水」
- block 原本只是普通 div
- 喝下去（呼叫一次）就永久擁有能力

# [interact-drag-resize.js]

# [setupElements.js]
- let user_name = '00000003'; 使用const userNameSpan更新前端user_name
- px(n)|pad2(n)|clamp(v, a, b)|snapToSlot(y)|roundTo(v, step)
- const getDayCols = () => dayCols; //equal function getDayCols() { return dayCols; }
- function buildPayloadForDate(dateStr) 從 allSchedules 拿到某日的陣列
# `後端post`function persistDay(arg) 先確認是number or date str
- function serializeWeek()
# `後端post` function persistWeek()保存整周資料
# [setupElements.js]

# [CreateGhostOrBlock.js]
# function initCreateGhostOrBlock(setupInteract)
- function cancelCreate() //把所有狀態清成「空」，ghost 也順便刪除，代表「這次操作不要再算了」
- function finalizeCreate() //只有在 ghost 存在、activeDay 有值時才真正建立 block。
 - 清除ghost → 使用createBlockElement()建立block → setupInteract(block)賦能block → 更新顯示時間updateBlockTime(block); → 儲存persistDay(Number(block.dataset.dayIndex));
- `weekly schedule` dayCols.forEach(day => {...}) 
 - `day mousedown`設定isMaybeStart開始生成ghost & 賦值activeDay
 - `day mousemove` 計算USER拉的高度，如超過門檻(isDraggingToCreate)建立ghost
 - `day mouseup` 滑鼠離開if(isDraggingToCreate) finalizeCreate(); else cancelCreate();
 - `document mouseup` 滑鼠離開if(isDraggingToCreate) finalizeCreate(); else cancelCreate();
# [CreateGhostOrBlock.js]

# 
- const WEEK_STARTS_ON = 1; // 1=Mon, 0=Sun
- const currentRefDate = new Date(); // 也可改成今天
- startOfWeek(currentRefDate, WEEK_STARTS_ON) // 計算當周第一天
使用${currentRefDate} & ${WEEK_STARTS_ON}
- parseFloat() 👉 parseFloat("看得出是數字的字串") → 轉成 Number(小數可)      e.g. parseFloat("123px");  123

# [PreAndNextWeek.js]
- const left_SVG| const right_SVG
- function bindKeyboardControls() binding event for 鍵盤左|右
# [PreAndNextWeek.js]

# [open-dialog.js]
# function openDateTimeDialog({ oldDateStr, startHHmm, endHHmm, onConfirm })
- init|binding event on openDateTimeDialog
# [open-dialog.js]

# [login-msg_panel.js]

# [login-msg_panel.js]

#
- `const slotPx = HOUR_HEIGHT * (SLOT_MINUTES / 60);`at[TopbarRulerAndDays.js]
 - const HOUR_HEIGHT  = parseFloat(root.getPropertyValue('--hourHeight')); // px，例如 64px -> 64
 - const SLOT_MINUTES = Number(root.getPropertyValue('--slot')) || 30; // 分鐘，例如 "30" -> 30
- `function loadWeek(startDate, setupInteract)` 使用from/to到後端取一周資料at[week-schedule.html]
- `function updateWeekRangeLabel()`更新周開始/結束日期at[week-schedule.html]
 - 使用fmtDate(d) 轉出周起始 & 周結尾
-`function attachTimeEditor(block)`呼叫`openDateTimeDialog()`更新前/後端
- `function openDateTimeDialog()`打開小視窗讓user輸入並獲取newDateStr/startStr/endStr/startTotal/endTotal
- addDays(date, n) 加天數
- fmtDate(d) 將d = Mon Dec 08 2025 00:00:00 GMT+08 轉化為yyyy-mm-dd @week-schedule.html
- const HOUR_HEIGHT: 從:root的--hourHeight: 64px;計算@TopbarRulerAndDays.js
- const SLOT_MINUTES: 從:root的--slot: 30; @TopbarRulerAndDays.js
- function createBlockElement: 建立block(單一項目) @week-schedule.html
- `function persistDay()`: 檢查存在於該day的所有block並更新，dateStr()取得yyyy-mm-dd `@setupElements.js`
- let viewStart: 得到一周開始的yyyy-mm-dd(目前設定周一) @week-schedule.html

- ??? `function serializeDay(dayIndex)`: 轉化成後端資料格式轉成 [{id,start_time,end_time,text}] @week-schedule.html

- const API_BASE = ''; // 同網域即可，如不同網域請填完整網址 @week-schedule.html
- function hhmmToMinutes(hhmm) @week-schedule.html
- function minutesToHhmm(min) @week-schedule.html
- function snapToSlot(y): 把像素吸附到「格高 slotPx」的倍數
- function roundTo(v, step)
- let dayCols = []; 創建周一到周日的div
- updateBlockTime() 更新時間標籤
- function setupInteract(block)
 - 1️⃣跨日拖曳時，先把 block 的 DOM 和 data-dayIndex 搬到新欄位，再把舊日 & 新日的整天 block 重算後覆蓋存檔，藉此更新新日期並自動移除舊日期上的資料。
 - 2️⃣
 - 3️⃣

```css
  :root{
    --hourHeight: 64px;    /* 每小時高度 */
    --slot: 30;            /* 每格幾分鐘：30 = 半小時 */
    --slotHeight: calc(var(--hourHeight) * var(--slot) / 60); /* 每格像素 */
    --days: 7;
    --dayWidth: 140px;     /* 每天欄寬 */
    --headerH: 42px;       /* 天標題高度 */
    --rulerW: 70px;        /* 左側時間尺寬 */
  }
```

dayCols.forEach(day => {...})
# 建立每個day中的監聽事件與ghost / block建立
│
└── cancelCreate()
# 取消建立block
│
└── finalizeCreate()
# 取消ghost並呼叫createBlockElement({ top, height, dayIndex })
  │
  └── createBlockElement({ top, height, dayIndex })
  # 建立 block 元素

function setupInteract(block)
#
│
└── interact(block).draggable(dragOptions);
# 🧩 const dragOptions
│
└── interact(block).resizable(createResizeOptions(slotPx, stepY))
# 🧩 function createResizeOptions(slotPx, stepY)

#
const dragOptions 
# interact.js 的 **draggable configuration object**
 第一階段：定義可拖曳區域
  - allowFrom: '.meta' 只允許從標題列拖曳，避免誤拖內容

 第二階段：拖曳進行中 (move)
  - 取得 dx, dy 移動距離
  - 累積 data-x / data-y 位移
  - 即時更新 transform 顯示拖曳中的位置

 第三階段：拖曳結束 (end)
  - 取出最終位移 x, y
  - 若 |x| >= stepX / 2 → 判定跨欄
    → 更新 data-day-index
    → 將 block append 到新的 dayCols[toIndex]
  - 更新 top（吸附格線 snapToSlot）
  - 限制邊界 clamp(0, scrollHeight - offsetHeight)
  - 清除 transform / data-x / data-y
  - 呼叫 updateBlockTime() 更新時間標籤

 第四階段：互動修飾 (modifiers)
  - 可加入 restrictRect 限制拖曳範圍
  - inertia: false 關閉慣性滑動
#
🧩 function createResizeOptions(slotPx, stepY) 
# interact.js 的 **resizable configuration object**
## 第一階段：定義可縮放邊緣
- `edges: { top: '.handle.top', bottom: '.handle.bottom' }`  
  指定上下把手為縮放熱區  
- 只允許垂直縮放（left/right 關閉）

## 第二階段：縮放進行中 (move)
- 取得 `event.deltaRect.height` 與 `event.deltaRect.top`  
  → 用於計算每次拉動的高度變化與頂部位移  
- `newHeight = style.height + deltaRect.height`  
  → 即時更新高度  
- `newTop = style.top`（預設不動）  
  → 若為上緣拉動 (`event.edges.top === true`) → `newTop += deltaRect.top`  
- 邊界與最小值控制  
  - `newHeight = Math.max(slotPx, newHeight)`  
  - `newTop = clamp(0, parent.scrollHeight - newHeight)`  
- 即時回寫樣式：`target.style.height`、`target.style.top`

## 第三階段：縮放結束 (end)
- 吸附格線：  
  - `height = roundTo(height, stepY)`  
  - `top = snapToSlot(top)`  
- 呼叫 `updateBlockTime()` 更新時間標籤  
  → 讓顯示的時間與實際位置同步  

## 第四階段：互動修飾 (modifiers)
- `restrictEdges({ outer: 'parent' })` → 限制縮放範圍不超出父容器  
- `restrictSize({ min: { height: slotPx } })` → 設定最小高度為一格  
- `inertia: false` → 關閉慣性效果，縮放更穩定



## 🗂 一週作息：拖曳建立區塊（自我備忘）

### 參數 / 狀態
- `DRAG_THRESHOLD`：像素門檻（達門檻才算拖曳）
- `isMaybeStart`：按下但未達門檻
- `isDraggingToCreate`：進入建立流程（顯示 `ghost`）
- `ghost`：建立中的半透明區塊
- `startY`／`startScrollTop`：起始座標／起始捲動量
- `activeDay`：目前操作中的 `.day`
- 依賴工具：`clamp()`、`snapToSlot()`、`slotPx`

---

### dayCols.forEach(day => …)
# 建立每個 day 的事件監聽與 ghost / block 建立

- `mousedown`（只允許左鍵、且點在 day 空白區）
  - 取 `rect`、計算 `startY = clamp(clientY - rect.top + day.scrollTop)`
  - 記錄 `startScrollTop`
  - `isMaybeStart = true`、`isDraggingToCreate = false`、設定 `activeDay`

- `mousemove`
  - 無狀態：return
  - 若拖曳中 **捲動量改變**：`cancelCreate()`
  - 計算 `curY`
  - **尚未達門檻**：`|curY - startY| >= DRAG_THRESHOLD` → 建立 `ghost`
    - `ghost.top = snapToSlot(startY)`、`ghost.height = slotPx`、`appendChild`
  - **已進入建立**：更新 `ghost` 尺寸
    - `top = min(startY, curY)`、`bottom = max(startY, curY)`
    - `snappedTop = snapToSlot(top)`
    - `snappedBottom = max(snappedTop + slotPx, snapToSlot(bottom))`
    - 寫回 `ghost.top / ghost.height`

- `mouseup`
  - 非同一 `day`：return
  - 若 `isDraggingToCreate`：`finalizeCreate()`；否則 `cancelCreate()`

- `document.mouseup`
  - 有建立中 → `finalizeCreate()`；否則 `cancelCreate()`

---

### cancelCreate()
# 取消建立 block
- `isMaybeStart = false`
- `isDraggingToCreate = false`
- 移除 `ghost`、清空 `activeDay`

---

### finalizeCreate()
# 移除 ghost 並正式產生 block
- 安全檢查：無 `ghost` 或無 `activeDay` → `cancelCreate()`
- 讀取 `top = parseFloat(ghost.style.top)`、`height = max(slotPx, parseFloat(ghost.style.height))`
- 移除 `ghost`、清空狀態
- 呼叫 `createBlockElement({ top, height, dayIndex: Number(day.dataset.dayIndex) })`
  - `appendChild(block)`
  - `setupInteract(block)`  // 啟用拖曳／縮放
  - `updateBlockTime(block)` // 顯示時間

---

### createBlockElement({ top, height, dayIndex })
# 建立 block 元素（含 UI 與把手）
- 設定：`class="block"`、`data-id`、`data-dayIndex`、`style.top/height`
- 內容：
  - `.meta`：`<span.time>`（顯示 `HH:mm ~ HH:mm`）
  - `.actions .btn-delete`（刪除自身）
  - `.text[contenteditable]`（輸入內容）
  - `.handle.top`、`.handle.bottom`（縮放把手）
- 綁定刪除：`btn-delete.onclick → block.remove()`
- return `block`




│
└──

 │
 └──

  │
  └──




#
🧩 function createResizeOptions(slotPx, stepY) 
# interact.js 的 **resizable configuration object**
#


















資料流與觸發點
────────────────────────────────────────────────────────
[使用者事件]
  1) 點日曆格 → ensureTaskUI → renderTaskList
     · 新增任務（＋）→ 修改 dayTasks → persist()
     · 編輯輸入(input) → 空字刪除/有字更新 → persist()
     · 刪除(🗑) → 更新 dayTasks → persist()
     · 拖曳排序(drop) → 以 DOM 順序重建 dayTasks → persist()

  2) 點日曆外 → document.click → 取消選取、收起＋

[生命週期]
  · init() 啟動 → fetchFromServer() 載入資料 → setStatus
  · 若載入到某日期有任務 → initTaskUIsFromStorage() → ensureTaskUI
  · 視覺狀態透過 setStatus 顯示（載入中/已載入/儲存中/失敗）

[儲存策略]
  · 所有資料寫入 dayTasks（記憶體）
  · persist() 防抖 500ms 後 POST 到 /calendar
  · beforeunload 時用 sendBeacon 盡力補送