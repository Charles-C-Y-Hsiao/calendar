# ⚙️ [monthly-calendar.js] `init_calendar()`使用monthOffsets建立月曆"殼"裡頭包含(weeksHTML/計算該月有幾列/設定整個月曆寬度/綁定鍵盤事件) & dateClasses建立月曆中日"殼"
# ⚙️ [task-list.js] `calendarContainer event(click)`建立點選該日出使UI建立(ensureTaskUI())


# [monthly-calendar.js]
- let calendarContainer = document.getElementById("calendars");
- let months = ['JAN','FEB','MAR',...'OCT','NOV','DEC'];
- const left_SVG & const right_SVG
- date = new Date(); curYear = date.getFullYear(); curMonth = date.getMonth();
# 🧩 init_calendar()
 # 呼叫renderCalendar(curYear, curMonth)
  - calendarContainer.innerHTML = ""; // 先清空
  # monthOffsets.forEach(() => { })建立月曆，該月第1天|該月displayMonth|該月所在年份displayYear
   - let weeksHTM from Sun to Sat
   - const calendarHTML 創建week-mode btn|狀態提示server-actions|往前/往後月份btn|該月顯示month-header| `月份的殼`<ul class="${datesClass}"></ul>`讓後續月份中日期可以掛上`
   - getMonthColumns(y, m) 計算該月有幾列
   - setCalendarWidth(calEl, datesUl, hasWeeksHeader) 設定整個月曆寬度
  - bindMonthSwitchers(); 綁定左右按鈕
  - bindKeyboardControls(); 綁定鍵盤事件
 # dateClasses.forEach(() => { });
  - buildCal(year, month, targetElement) `建立月曆中每日架構`在<ul>中加含有mmm-dd的<li>
 - bindMonthSwitchers(); 綁定左右按鈕

# function changeMonth(delta /* -1=上一月, +1=下一月 */)
- 更新 curYear / curMonth
- 重畫整個月曆renderCalendar(curYear, curMonth);
# `後端` 依新的年月抓後端資料await fetchFromServer({ year: curYear, month: curMonth });
- 把資料「套回到這次新畫出的 li[data-tooltip]」上 initTaskUIsFromStorage(); at[task-list.js]
# function bindMonthSwitchers() 根據leftBtn or rightBtn在觸發changeMonth(-1 or +1);

# buildCal(year, month, targetElement) 建立該月天數補足頭/尾讓每列以7天呈現
- const dayFirst  = new Date(y, m, 1).getDay(); // 周日到周六對應0~6
- const lastdate  = new Date(y, m + 1, 0).getDate(); 
// 取得該月的最後一天是幾號如Nov/30 ➜ 顯示30
- let targetDate = new Date(curYear, curMonth + monthOffsets[index], 1);
// 藉由targetDate來生成對應月的月曆，curMonth Jan~Dec對應0~11
# document.addEventListener("DOMContentLoaded", () => { })執行 init_calendar()
# [monthly-calendar.js]

# [task-list.js]
# document event(DOMContentLoaded) rerenderFromDayTasks()
- let user_name = '00000002';
- `let dayTasks = {};`用於儲存calendar.json中的"所有資料"
- function updateUserNameUI(name) 更新user_name在前端顯示
- function setStatus(text, cls='') 更新當前網頁狀態在前端顯示
# `後端` function fetchFromServer({ year, month } = {})
  - 加入年 & 月查詢後端資料
# `後端` function postToServer(payload)
  - 在開始 & 結束都使用setStatus() 更新前端狀態
  - 將dayTasks資料寫回calendar.json
- function persist() 
  - 儲存前 pendingSave = true; + setStatus('變更待儲存…','saving');
  - 呼叫postToServer(dayTasks) pendingSave = false; 如果更新失敗setStatus('儲存失敗');
- function uid() 產生 ID
- function hmToMin(hhmm) & function minToHm(min)
- function getList(dateKey) 取得某天的陣列e.g.:dayTasks = {"2025-10-06": []};

# ensureTaskUI(li)
- 建立「 day edit 」/task-list/ 該日中的各種操作如1.focusin(只讓某事項selected),2.選到事項(只讓某事項selected),3.事項內容輸入,4.Enter 失焦,5.刪除,6.draggable(mousedown/mouseup/dragover),6.拖曳動畫(dragover/drop/dragstart/dragend)
- 在建立「 day edit 」|'focusin'|'click'中使用e.stopPropagation();可防止事件跑到document event(click)
- renderTaskList(li, dateKey)只負責渲染(不綁事項事件)

# `後端` function rerenderFromDayTasks() 
- 更新setStatus()在get前後 & initTaskUIsFromStorage()
# function rerenderFromMemory() setStatus('已同步 ✓') & initTaskUIsFromStorage();
# function initTaskUIsFromStorage() 對曾經有事項的那天進行事件綁定[ensureTaskUI(li)]
# `後端`function connectCalendarWS() 連線ws跟接收ws更新
- calendar-init rerenderFromDayTasks();
- calendar-updated rerenderFromMemory();
# document.addEventListener("DOMContentLoaded", () => { }); connectCalendarWS();
# [task-list.js]

# [login-msg_panel.js]
# 主程式宣告 #dialog-close | clear按鈕 | Log-in按鈕
- document "click" 當下抓取#show-user-name並開啟dialog & overlay
- .dialog_close "click" 關閉dialog & overlay
- overlay "click" 關閉dialog & overlay
- clearBtn "click" 清空#textInput 跟 .warning class
- loginBtn "click" 打開，當輸入不符格式openMsgWarning() or 輸入符格式openMsgPanel()
  - openMsgWarning() 顯示警告視窗並倒數3s關閉 or 使用close btn，後續隨msg_panel-count消失
  - openMsgWarning() 顯示user輸入並提供submit & close，後續隨msg_panel-count消失
- #textInput "input" 可以
# [login-msg_panel.js]

# [day-panel.js]
# function openDayPanel(dateKey, li)
- init & append in overlay(.dt-dialog-overlay)
- function closePanel() 將overlay.remove(); & 重畫原本月曆格子的縮圖清單
- function renderPanelList()
  - const list = getList(dateKey); 取得某天daymap at [task-list.js]
  - 逐一在list.forEach(item => {})拖曳把手|文字輸入(靠左)|時間顯示(靠右)|編輯按鈕|刪除按鈕
  -
- addBtn 'click' assignTimeForItem(list, item);
- listEl 'input', 輸入文字 | 刪除 | Enter 失焦 | DnD 全在這個 panel 內處理
  - assignTimeForItem(list, item);
- listEl 'keydown'
- listEl 'click' 
  - if (editBtn) 編輯時間 / 日期 edit_time_dialog({...}) renderPanelList(); 判斷日期沒變 & 有變(執行renderPanelList();)最後persist();
  - const delBtn = e.target.closest('.task-del');
  - 取得id再const idx = list.findIndex(x => x.id === id);最後persist(); & renderPanelList();
- listEl 'mousedown' 'mouseup'
- listEl 'dragover' 'drop' 'dragstart' 'dragend'

# function edit_time_dialog({ oldDateStr, startHHmm, endHHmm, onConfirm })
- init & append in overlay
- function close() 整個overlay.remove() `乾脆!!`
- cancelBtn 'click' 使用function close()
- okBtn 'click' 確認 newDateStr |startVal | endVal 都存在
# [day-panel.js]







persist()➜postToServer(payload) 將資料儲存到後端
 
# 🧩 ensureTaskUI(li) ➜ renderTaskList(li, dateKey, opts = {})
 # 🧩 ensureTaskUI(li) 對<li>建立add按鈕/task-list容器/task-item各事件拖曳/刪除/輸入
 └── task-list if (!listEl.dataset.dndBound) {...} 初始化綁拖曳邏輯
    └── dragover：拖曳進行中，根據滑鼠位置即時調整項目在清單中的顯示順序
    └── drop：拖曳結束後，依照目前畫面順序重建 dayTasks[dateKey] 的資料排列並儲存
    └── 拖曳把手: drag mousedown/mouseup 
    └── 清空空白: input.addEventListener('input', () => {...}) 
    └── Enter後失焦: input.addEventListener('keydown', (ev) => {...}) 
    └── 刪除task-item: del.addEventListener('click', () => {...})
    └── task-item拖曳動畫: row dragstart/dragend
 # 🧩 renderTaskList(li, dateKey, opts = {}) 重畫task-list中的task-item

# 🧩 calendarContainer('click', (e) => {...}) 點task-item切換選取狀態 & 點cell空白切換add按鈕

#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#
#





# 月曆生成：兩階段流程與函式關係
────────────────────────────────────────────────────────────────────────────
↓ 第一階段：建立「月曆框架」 ↓
────────────────────────────────────────────────────────────────────────────
monthOffsets.forEach((offset, index) => {...})
# ⮞ 第一階段：建立「月曆框架」
# 根據指定的 monthOffsets（例如 [0, -1, -2]）動態生成每一個月份的外層結構
# 不負責畫出每一天，只建立好每個月曆的骨架（外框 + 月份標題 + 星期列 + 空的 <ul> 容器），
# 方便後續用 buildCal() 去填入日期
│
└── getMonthColumns(y, m)
# 被 monthOffsets.forEach() 呼叫，用來計算該月份需要顯示幾列週（即欄數）
# 會根據該月的第一天是星期幾、總天數、最後一天是星期幾來推算整個月曆格子的排列
# 回傳的週數（欄數）會被用於：
#   - 設定每個月曆的寬度（setCalendarWidth）
#   - 存進 datesUl.dataset.columns 作為除錯或版面控制參考
│
└── setCalendarWidth(calEl, datesUl, hasWeeksHeader)
# 使用 getMonthColumns(y,m) 的結果來設定 calendar 的實際寬度
# 根據 7 欄 × --colW + 6 間距 × --gap 的公式計算整個月曆寬度
   ↓
   ↓
────────────────────────────────────────────────────────────────────────────
↓ 第二階段：建立每月框架後，生成日期 class 與實際內容 ↓
────────────────────────────────────────────────────────────────────────────
const dateClasses = monthOffsets.map(offset => `.dates${offset === 0 ? "" : `-${Math.abs(offset)}`}`);
# 根據 monthOffsets 生成對應的 class 名稱陣列，用於指向每個月曆中的 <ul> 容器
# 例如：
#   monthOffsets = [0, -1, -2]
#   → dateClasses = [".dates", ".dates-1", ".dates-2"]
│
└── dateClasses.forEach((className, index) => {...})
# ➤ 第二階段：呼叫 buildCal() 將實際日期填入剛剛建立好的月曆骨架中
# 與 monthOffsets.forEach() 的對應關係：
#   - 兩者共用相同的 index，因此 index=0 對應當月、index=1 對應上月，以此類推
#   - monthOffsets.forEach() 建立結構；dateClasses.forEach() 根據相同 offset 填入內容
#
# 流程：
#   1. 透過 monthOffsets[index] 重新計算該月份 (year, month)
#   2. 呼叫 buildCal(year, month, className)
#      → 由 buildCal() 產生該月份的每日 <li> 項目，填入 <ul class="datesX"> 中
#
#   ⇒ 兩者關係如同：
#        monthOffsets.forEach → 建立「月曆外框」
#        dateClasses.forEach  → 建立「日期內頁」
#
   最終結果：
    <div class="calendar">
        <div class="calendar-body">
        <div class="month-header">OCT 2025</div>
        <ul class="weeks">...</ul>
        <ul class="dates"> ← buildCal() 將每日填進來
            <li class="active" data-tooltip="2025-10-01">...</li>
            ...
        </ul>
        </div>
    </div>

────────────────────────────────────────────────────────────────────────────
↓ 第三階段：任務清單 + 伺服器儲存 ↓
────────────────────────────────────────────────────────────────────────────
主枝幹（核心流程）
────────────────────────────────────────────────────────
ensureTaskUI(li)
# 確保日期格具備 UI：建立「＋」按鈕與 .task-list 容器，並首次渲染。
│
└─ renderTaskList(li, dateKey)
# 渲染某日期的所有任務；綁定輸入、刪除、拖曳排序、drop 儲存。
  │
  └─ renderTaskList(li, dateKey)
  # 渲染某日期的所有任務；綁定輸入、刪除、拖曳排序、drop 儲存。

calendarContainer.addEventListener('click', (e) => {...})
# 點擊日曆格：建立 UI、清理空白任務、選取任務、切換＋按鈕顯示。

document.addEventListener('click', (e) => {...})
# 點擊日曆外區域時，取消任務選取並收起所有「＋」按鈕。

async function init()
# 首次載入：從伺服器抓 meeting_calendar.json，設置狀態並補上
# 已有資料的日期 UI。


次要枝幹（輔助與基礎設施）
────────────────────────────────────────────────────────
setStatus(text, cls='')
# 更新下方狀態文字與樣式，顯示 載入/儲存/錯誤。

fetchFromServer()
# GET /calendar，讀出 meeting_calendar.json 並回傳物件。

postToServer(payload)
# POST /calendar，將 dayTasks 覆寫到 meeting_calendar.json。

persist()
# 500ms 防抖後呼叫 postToServer；失敗顯示錯誤訊息。

window.addEventListener('beforeunload', () => {...})
# 頁面關閉前若有未送出變更，用 sendBeacon 最佳努力上傳。

uid()
# 產生短 ID：'t' + 時間戳 + 隨機字串。

getList(dateKey)
# 取某日期的任務陣列；若無則建立空陣列後回傳。

getDragAfterElement(container, mouseY)
# 根據滑鼠 Y 位置決定拖曳插入目標的前一個元素。

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

UI 元素與職責摘要
────────────────────────────────────────────────────────
  .task-add-btn (＋)     ：新增一筆 {id, text:''}，聚焦新輸入框
  .task-list             ：任務容器，負責 dragover/drop 排序
  .task-item             ：單一任務列；支援拖曳、刪除、選取樣式
  .drag-handle (≡)       ：mousedown 設 draggable；dragstart 顯示預覽
  .task-del (🗑)          ：刪除該任務並 persist()
  #save-status (.status) ：顯示 載入/儲存/錯誤 狀態文字