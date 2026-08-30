# 07_25_14_02 daily_end_to_end_flow

## 使用目的

本文件依 `End_to_end_flow_analysis_prompt.md` 的格式，整理 `daily-calendar/` 目前存在的完整功能流程。重點是追蹤使用者動作從 UI entry、browser controller、API/storage、validation 到結果回傳，而不是只列出檔案或函式。

## 掃描範圍

- Entry：`daily-calendar/daily-calendar.html`
- Controllers：`daily-calendar/daily-calendar.js`（core）、`daily-calendar/daily-tasks.js`（timed tasks）、`daily-calendar/daily-evergreen.js`（Evergreen）
- Shared API：`calendar-views-server.js`
- Docs：`docs/modes/daily/architecture.md`、`docs/modes/daily/feature-map.md`、`docs/api.md`、`docs/data-format.md`
- Storage：`data/{userId}.json`、`localStorage["calendar.currentUserId"]`

## 1. Daily Date Navigation

這條 path 負責切換 Daily 目前查看的日期；日期變更後重新載入該日資料並更新畫面。

### Static UI

`#dateTitleButton` 開啟 `#datePicker`，使用者選日期或用日期導覽切換目前單日。

### Browser controller

`updateDateHeader()` 顯示日期，`moveDay()` 或 `datePicker` change 更新 `currentDate`，再呼叫 `loadCurrentDay()`。

### UI server

`GET /schedule?from={date}&to={date}` 由共用 server 讀取目前 user 的日期 range。

### Core logic

`normalizeItems()` 補齊 item fallback，`sortItems()` 依時間排序，`renderTodos()` 重新投影到 `#todos`。

### Storage

只讀 `data/{userId}.json` 的指定日期 key；不寫入資料。

### Validation / Result

驗證 `#dateTitle`、`#weekdayLabel`、`#todos` 與空狀態是否跟選取日期一致。

主要 symbols：`#dateTitleButton`、`#datePicker`、`currentDate`、`moveDay()`、`loadCurrentDay()`、`normalizeItems()`、`renderTodos()`

## 2. Daily Timed Task Create

這條 path 負責從 Daily 表單建立指定時段的 task，完成儲存後更新當日清單與畫面。

### Static UI

`#todoForm` 接收 `#startTime`、`#endTime`、`#taskInput`，submit 代表新增目前日期 item。

### Browser controller

`bindEvents()` submit handler 建立 `{ id, start_time, end_time, text, completed }`，推入 `dayItems` 後排序與渲染。

### UI server

`saveCurrentDay()` 呼叫 `POST /schedule/:date`，由 server 替換該日期 array。

### Core logic

`getOneHourEndTime()` 協助時間預設；`sortItems()`、`renderTodos()` 讓新增結果立即出現在畫面。

### Storage

寫入 `data/{userId}.json` 的目前日期 key；保留其他日期與 `_evergreen`。

### Validation / Result

成功時 `setStatus()` 顯示 saved 類訊息；失敗時保留畫面狀態但顯示錯誤，沒有 rollback。

主要 symbols：`#todoForm`、`#startTime`、`#endTime`、`#taskInput`、`dayItems`、`saveCurrentDay()`、`POST /schedule/:date`

## 3. Daily Timed Task Edit / Move Date

這條 path 負責編輯既有 timed task，包含時間、名稱與日期變更，並將結果寫回對應日期。

### Static UI

點 task row 或 `.edit-btn` 開啟 `#taskEditDialog`，可改文字、日期、開始與結束時間。

### Browser controller

`openTaskEditor()` 載入原 item，`saveTaskEditor()` 驗證輸入並建立 `nextItem`。

### UI server

同日期編輯使用 `saveCurrentDay()`；跨日期移動使用 `loadItemsForDate()` 與 `saveItemsForDate()` 分別讀寫來源/目標日期。

### Core logic

跨日期時先從來源 `dayItems` 移除，再將 item 合併進目標日期並排序。

### Storage

可能寫入兩個日期 key；server 單日寫入會保留其他 top-level data。

### Validation / Result

需驗證時間格式、結束晚於開始、來源日期不殘留 duplicate、目標日期 reload 後存在。跨日期流程失敗沒有完整 rollback。

主要 symbols：`#taskEditDialog`、`openTaskEditor()`、`saveTaskEditor()`、`loadItemsForDate()`、`saveItemsForDate()`

## 4. Daily Completion And Filter

這條 path 負責切換 task 完成狀態，並依 All、Complete、Incomplete 篩選當日清單。

### Static UI

`.todo-check` 切換完成狀態，`.filter[data-filter]` 切換 All / Complete / Incomplete。

### Browser controller

`toggleTodo()` 更新 `ScheduleItem.completed` 並保存；filter click 更新 `activeFilter` 後重跑 `renderTodos()`。

### UI server

完成狀態寫入 `POST /schedule/:date`；filter 只改前端 state，不呼叫 API。

### Core logic

`renderTodos()` 根據 `activeFilter` 過濾 `dayItems`，完成項加上 `is-completed` 呈現。

### Storage

completion 寫入目前日期 item；filter 不持久化。

### Validation / Result

重新整理後 completed 狀態應保留；filter 切換不應改變 `dayItems` 內容。

主要 symbols：`.todo-check`、`.filter[data-filter]`、`toggleTodo()`、`activeFilter`、`completed`

## 5. Daily Edit Mode Reorder And Delete All

這條 path 負責進入 edit mode 後拖曳排序 task，或確認後刪除當日全部 timed task。

### Static UI

`#editModeToggle` 進入排序模式，`.drag-btn` 拖曳 task，`#deleteAll` 清空目前日期。

### Browser controller

`setEditMode()` 控制 UI；`beginTodoPointerDrag()` 與 `reorderTodo()` 調整 `dayItems` 順序。

### UI server

排序與刪除都透過 `saveCurrentDay()` 寫入 `POST /schedule/:date`。

### Core logic

排序後 `applySequentialOneHourTimes()` 會依目前第一筆時間重新配置連續一小時時段。

### Storage

只寫目前日期 key。`#deleteAll` 需要 `openDeleteAllUserCheckDialogV2()` 驗證目前 userId。

### Validation / Result

取消確認不能寫入；刪除後目前日期 array 為空；排序後 reload 順序與時間一致。

主要 symbols：`#editModeToggle`、`#deleteAll`、`beginTodoPointerDrag()`、`reorderTodo()`、`applySequentialOneHourTimes()`、`openDeleteAllUserCheckDialogV2()`

## 6. Daily Evergreen CRUD

這條 path 負責建立、編輯、刪除與排序不綁定日期的 Evergreen items，並同步其持久化資料。

### Static UI

`#evergreenForm` 新增 long-term item，`#evergreenDialog` 編輯文字、priority、status。

### Browser controller

`addEvergreenFromForm()`、`openEvergreenEditor()`、`saveEvergreenEditor()` 更新 `evergreenItems`。

### UI server

`saveEvergreen()` 呼叫 `POST /evergreen`，server 只替換 `_evergreen`。

### Core logic

`normalizeEvergreenItems()`、`sortEvergreen()`、`normalizeEvergreenOrder()` 負責 fallback、排序與 order 正規化。

### Storage

寫入 `data/{userId}.json` 的 `_evergreen`，保留所有日期資料。

### Validation / Result

新增/編輯/封存後 reload 應保留；status 可為 `active`、`paused`、`done`、`archived`。

主要 symbols：`#evergreenForm`、`#evergreenDialog`、`evergreenItems`、`saveEvergreen()`、`POST /evergreen`

## 7. Daily Schedule Evergreen Today

這條 path 負責將 Evergreen item 排入目前日期，產生今日 timed task 並刷新 Daily 顯示。

### Static UI

Evergreen row 的 `.evergreen-schedule` 將 long-term item 排入今日。

### Browser controller

`scheduleEvergreenToday()` 讀取目前 `#startTime` / `#endTime`，建立 timed task 並推入 `dayItems`。

### UI server

呼叫 `saveCurrentDay()`，使用 `POST /schedule/:date` 寫入今日。

### Core logic

新 item 由 evergreen text 轉為一般 `ScheduleItem`，再經 `sortItems()` 與 `renderTodos()` 呈現。

### Storage

寫入目前日期 key；不移除原 `_evergreen` item。

### Validation / Result

今日 task list 出現新 item，Evergreen list 原項目仍存在。

主要 symbols：`.evergreen-schedule`、`scheduleEvergreenToday()`、`dayItems`、`evergreenItems`

## 8. Daily User Switch And Mode Links

這條 path 負責切換目前 user，重新載入該 user 的資料，並維持 Daily、Monthly、Weekly 之間的導覽連結。

### Static UI

`#show-user-name` 開啟 `#userDialog`，`#textInput` 輸入 8 位 userId，`#weekLink` / `#monthLink` 切換 mode。

### Browser controller

`applyUserIdFromDialog()` 驗證並更新 `userId`、`localStorage`、user UI、mode links、WS 與資料。

### UI server

後續 REST requests 以 `X-User-Id` header 讀寫該 user；WS URL 使用 `?userId=...`。

### Core logic

`initCalendarUserId()` 啟動時優先讀有效 URL query，再 fallback 到 storage 或 `00666888`。

### Storage

寫入 `localStorage["calendar.currentUserId"]`；server data 依 `data/{userId}.json` 隔離。

### Validation / Result

前端只接受剛好 8 位數字；切換後 daily tasks、evergreen 與 links 都要屬於新 user。

主要 symbols：`#show-user-name`、`#textInput`、`applyUserIdFromDialog()`、`updateModeLinks()`、`calendar.currentUserId`

## 9. Daily WebSocket Sync

這條 path 負責接收同一 user 的即時日曆更新，將外部變更同步到目前日期與長期項目畫面。

### Static UI

沒有獨立按鈕；同步結果反映在目前日期 task list、evergreen list 與 status。

### Browser controller

`connectWs()` 建立 socket，收到 `calendar-init` / `calendar-updated` 後更新目前日期與 `_evergreen`。

### UI server

共用 WebSocket server 依 userId 發送完整 CalendarData；REST 寫入後會 broadcast。

### Core logic

Daily 比對 `sourceClientId === DAILY_CLIENT_ID` 時略過自己的 update，避免重複渲染。

### Storage

WebSocket 自身不寫資料；它讀取 server 推送的完整 payload。

### Validation / Result

同 user 的 Monthly/Weekly 寫入後 Daily 應更新；不同 user 不更新。Daily 目前沒有自動重連。

主要 symbols：`connectWs()`、`DAILY_CLIENT_ID`、`calendar-init`、`calendar-updated`、`sourceClientId`

## Shared Capability Modules

| Module | 依賴它的 Flows |
| --- | --- |
| `daily-calendar/daily-calendar.js` core/bootstrap/events | 1-9 |
| `daily-calendar/daily-tasks.js` / timed task rendering | 1-5、7、9 |
| `daily-calendar/daily-evergreen.js` / Evergreen rendering | 6-7、9 |
| `/schedule` API | 1-5、7 |
| `/evergreen` API | 6 |
| `calendar.currentUserId` | 8-9 |
| WebSocket sync | 9 |

## Persistence Locations

- `data/{userId}.json`：日期 keys 與 `_evergreen`。
- `localStorage["calendar.currentUserId"]`：目前前端 user。
- Runtime state：`currentDate`、`dayItems`、`evergreenItems`、`activeFilter`、edit/drag state。

## 缺少測試或待確認

- Daily WebSocket 斷線後沒有自動重連，需手動驗證失敗狀態。
- 跨日期編輯若第二次寫入失敗沒有完整 rollback。
- Weekly serializer 可能不保留 Daily 的未知欄位，跨 mode 寫入前需額外驗證。
