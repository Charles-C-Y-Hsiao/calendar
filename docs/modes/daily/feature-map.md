# Daily Feature Map

## Availability People Display

`availabilityPeople[]` renders as `name status`; `free` uses green and
`not-free` uses dark red. Missing people display `Set people`.

## Availability 顯示規則

- Primary：`Timed tasks`
- Related：`Persistence`、`Normalize`、Shared API / Data、Weekly `Availability`
- JS：`renderTodos()`、`isAvailabilityItem()`、`compareItemsByTime()`
- DOM/CSS：`.todo.is-availability`；Availability rows 位於一般 task rows
  之後，並依 `start_time` 排序。
- Data contract：保留 `type` / `itemType = availability` 與其他欄位，僅改變
  Daily 顯示投影，不刪除或改寫 API 資料。

## Daily File Entry Points

- `daily-layout.css`：Daily 外殼、header、date navigation、section layout 與 responsive 版面。
- `daily-tasks.css`：timed task、filters、edit mode、task editor 與 local confirmation 樣式。
- `daily-evergreen.css`：Evergreen list、CRUD editor、排序與 long-term edit mode 樣式。
- `daily-calendar.js`：bootstrap、DOM map、events、API/storage、normalize、user/sync core。
- `daily-tasks.js`：`renderTodos()`、task editor、完成/刪除、task drag reorder。
- `daily-evergreen.js`：`renderEvergreen()`、Evergreen CRUD、排序、拖曳與 `scheduleEvergreenToday()`。

## 日期選擇與導覽

對應 Module Areas：

- Primary：`Bootstrap / events`
- Related：`Persistence`、`Normalize`

- Trigger：`#dateTitleButton`、`#datePicker`。
- Bootstrap entry：`init()`、`bindEvents()`、`els`。
- Primary：`updateDateHeader()`、`loadCurrentDay()`。
- Helper：`moveDay()` 可切換相對日期，但目前 HTML 沒有獨立 previous / next day button 直接呼叫它。
- Event binding：`bindEvents()` 讓 `#dateTitleButton` 開啟或 focus `#datePicker`，`#datePicker` change 後 parse date、更新 `currentDate` 並呼叫 `loadCurrentDay()`。
- State：`currentDate`、`dayItems`。
- API：`GET /schedule?from={date}&to={date}`。
- Verify：挑選有/無資料的日期，標題、weekday、date input、status、task list 與 empty state 應同步更新；不應寫入資料。

## 新增與編輯 timed task

對應 Module Areas：

- Primary：`Timed tasks`
- Related：`Bootstrap / events`、`Persistence`、`Normalize`、`Ordering`

- Trigger：`#todoForm`、`#taskEditDialog`、`.edit-btn`、`.delete-btn`；時間為 `#startTime` / `#endTime` 與 `#editStartTime` / `#editEndTime`。
- Primary：`bindEvents()` submit、`renderTodos()`、`openTaskEditor()`、`saveTaskEditor()`。
- Render：`renderTodos()` → `#todos`；每筆 task row 會建立 `.todo`、`.todo-check`、`.todo-time`、`.todo-name`、`.edit-btn`、`.delete-btn`。
- State/data：`dayItems`；`id`、`start_time`、`end_time`、`text`、`completed`。
- API：同日新增/編輯/刪除使用 `POST /schedule/:date`；跨日期編輯使用 `loadItemsForDate()` / `saveItemsForDate()` 先寫回來源日期再寫入目標日期。
- Validation：空白 task text 不新增；`start_time >= end_time` 顯示 `時間錯誤` 且不寫入。
- Edit-mode dependency：單筆 `.edit-btn` / `.delete-btn` 只有在 `daily-edit-mode` 且 task row hover 或 focus-within 時顯示，所以 UI 驗證需先切 edit mode；拖曳排序仍屬 `Ordering`。
- Verify：新增、invalid time、重新整理、同日改時間/文字、移到別日、單筆刪除；Weekly/Monthly 應能看到相同 item。

## 完成狀態與篩選

對應 Module Areas：

- Primary：`Timed tasks`
- Related：`Bootstrap / events`、`Persistence`、`Normalize`、Shared Account / User、Shared Realtime Sync

- Trigger：`.filter[data-filter]`、`.todo-check` 與 task row click。
- Primary：`toggleTodo()`、`renderTodos()`。
- State：`activeFilter`、`ScheduleItem.completed`。
- Behavior：非 edit mode 下點 task row 會呼叫 `toggleTodo()`；點 checkbox 會直接更新該 item 的 `completed` 後 `saveCurrentDay()`；點 button/input 不觸發 row toggle。
- Verify：All/Complete/Incomplete 顯示正確，checkbox 與 row click 都能切換完成狀態，重新整理後完成狀態仍存在。
- Cross-mode：Monthly 可忽略 completed；Weekly 寫回時需注意是否保留此欄位。

## Edit mode、排序與整日刪除

對應 Module Areas：

- Primary：`Ordering`
- Related：`Bootstrap / events`、`Timed tasks`、`Persistence`、`User / sync`

- Trigger：`#editModeToggle`、`#deleteAll`、task `.drag-btn` handles、`.todo` drop targets。
- DOM / CSS：`daily-edit-mode`、`.drag-btn`、`.todo.is-dragging`、`.todo.is-drop-target`、`.delete-all`、`.daily-confirm-overlay`、`.daily-account-input`、`.daily-confirm-ok`。
- Primary：`setEditMode()`、`beginTodoPointerDrag()`、`reorderTodo()`、`applySequentialOneHourTimes()`、`openDeleteAllUserCheckDialogV2()`。
- State：`isEditMode`、`draggingItemId`、`todoPointerDrag`、`dayItems` order、`start_time`、`end_time`。
- Behavior：進入 edit mode 前會開 `Enter edit mode?` confirmation；edit mode 會讓 `.drag-btn` 與 `#deleteAll` 可見，並 disabled `.todo-check`。排序後 `applySequentialOneHourTimes()` 會以排序後第一筆的開始時間為起點，將每筆 timed task 改成連續一小時區段。
- Delete All：`#deleteAll` 只在 edit mode 可操作；先用 `openDeleteAllUserCheckDialogV2()` 驗證目前 8 位 `userId`，再開 `Delete current day?` final confirmation；取消、帳號不符或空日期不應寫入。
- API：`POST /schedule/:date`。
- Verify：進入 edit mode 的取消/確認都正確；edit mode 下 checkbox disabled、drag handles 與 Delete All 顯示正確；拖曳後順序與連續一小時時段正確；Delete All 帳號不符不可繼續、final confirmation 取消不變更、確認後只清目前 user 的目前日期。

## Long-term / Evergreen items

對應 Module Areas：

- Primary：`Evergreen`
- Related：`Bootstrap / events`、`Timed tasks`、`Persistence`、`Normalize`、`User / sync`

- Trigger：`#evergreenForm`、`#evergreenQuickInput`、`#evergreenAdd`、`#evergreenEditModeToggle`、`#evergreenDialog`、`.evergreen-check`、`.evergreen-schedule`、`.evergreen-edit`、`.evergreen-delete`、`.evergreen-drag`。
- DOM / CSS：`#evergreenList`、`.evergreen-item`、`.evergreen-chip.priority-*`、`.evergreen-empty.is-visible`、`long-term-edit-mode`、`.evergreen-actions`、`.evergreen-drag`、`.evergreen-item.is-done`、`.evergreen-item.is-archived`、`.evergreen-item.is-dragging`、`.evergreen-item.is-drop-target`。
- Primary：`renderEvergreen()`、`addEvergreenFromForm()`、`openEvergreenEditor()`、`saveEvergreenEditor()`、`setEvergreenEditMode()`、`scheduleEvergreenToday()`、`beginEvergreenPointerDrag()`、`reorderEvergreen()`、`normalizeEvergreenOrder()`。
- State/data：`evergreenItems`、`editingEvergreenId`、`isEvergreenEditMode`、`draggingEvergreenId`、`evergreenPointerDrag`；item 欄位包含 `id`、`text`、`priority`、`status`、`completed`、`createdAt`、`updatedAt`、`order`。
- API：`GET/POST /evergreen`；排入今日另寫 `POST /schedule/:date`，新增的 timed task 會帶 `sourceEvergreenId`。
- Behavior：quick add 預設 `priority: high`、`status: active`、`completed: false`；editor 可改 text / priority / status，`status: done` 會同步 `completed: true`；Archive 是將 `status` 改成 `archived` 並從 visible list 過濾，不是從 `_evergreen` array 移除。
- Edit-mode semantics：`long-term-edit-mode` 開啟時 checkbox 與 schedule/edit/archive actions 顯示、drag handle 隱藏；非 edit mode 顯示 drag handle 並用 pointer drag 做排序。
- Verify：新增、空白不新增、編輯 text / priority / status、完成 checkbox、封存後 visible list 隱藏但 API 保留 archived item、排入今日產生 timed task 與 `sourceEvergreenId`、排序後 `order` 更新、重新整理後 `_evergreen` 與當日 schedule 仍存在。

## Daily Persistence

對應 Module Areas：

- Primary：`Persistence`
- Related：`Timed tasks`、`Evergreen`、`Normalize`、`User / sync`、Shared API / Data

- Trigger：初始 `init()`、日期切換、timed task 新增/完成/編輯/刪除/排序、Evergreen CRUD/狀態/排序、Evergreen 排入今日、user 切換與 WebSocket payload reload。
- API entry points：`GET /schedule?from={date}&to={date}`、`POST /schedule/:date`、`GET /evergreen`、`POST /evergreen`。
- Primary：`loadCurrentDay()`、`saveCurrentDay()`、`loadEvergreen()`、`saveEvergreen()`、`loadItemsForDate()`、`saveItemsForDate()`。
- State/data：讀取時更新 `dayItems` / `evergreenItems`；寫入時送出目前 `dayItems` / `evergreenItems`；status 由 `setStatus()` 顯示。
- Headers：所有 Daily REST calls 都要帶 `X-User-Id`；寫入 calls 也要帶 `X-Client-Id: DAILY_CLIENT_ID`，讓 WebSocket client 可略過自己發起的 update。
- Preservation：`POST /schedule/:date` 只替換單日 array，應保留其他日期與 `_evergreen`；`POST /evergreen` 只替換 `_evergreen`，應保留所有日期資料。Daily 一般操作不應用 `/calendar` 完整覆寫。
- Cross-date edit：`saveTaskEditor()` 跨日期移動會先 `saveItemsForDate(sourceDateKey, sourceItems)`，再 `loadItemsForDate(targetDateKey)` 與 `saveItemsForDate(targetDateKey, targetItems)`；驗證時需注意來源/目標日期都被保存。
- Verify：寫入 fixture 後 reload Daily；切換有資料的兩個日期；確認 Evergreen 在日期切換後仍存在；確認 Monthly/Weekly 能讀到同一份 schedule；最後用 `POST /calendar {}` 還原測試 user。

## Daily Normalize

對應 Module Areas：
- Primary：`Normalize`
- Related：`Persistence`、`Timed tasks`、`Evergreen`、`User / sync`、Shared API / Data

- Trigger：`loadCurrentDay()`、`loadItemsForDate()`、`loadEvergreen()`、`connectWs()` 收到 server payload 後，在 render 前執行。
- Primary：`normalizeItems()`、`normalizeEvergreenItems()`、`normalizePriority()`、`normalizeEvergreenStatus()`、`normalizeEvergreenOrder()`。
- Helper：`isHhmm()` 驗證 `HH:mm` 形式；`sortItems()` 依 `start_time` / `text` 排序；`sortEvergreen()` 依 `order`、status、priority、`createdAt` 排序。
- Schedule data：只接受 object item；保留未知欄位；缺 `id` 會產生新 id；錯誤 `start_time` / `end_time` fallback 到 `08:00` / `09:00`；`text` 轉 string；`completed` 轉 boolean。
- Evergreen data：只接受 object item 並過濾空白 `text`；保留未知欄位；`priority` fallback 到 `high`；未知 `status` 會依 `completed` fallback 成 `done` 或 `active`；`createdAt` 缺值時補目前時間；`order` 轉 number 或先設為 `null`，讀取排序後由 `normalizeEvergreenOrder()` 重寫連續 order。
- Persistence note：Normalize 是 Daily 讀取時的 in-memory compatibility layer，不是 server migration；server 可能仍保存原始 payload，直到使用者操作觸發 save 才會寫回 normalized shape。
- Verify：用測試 user `00000999` 寫入含錯誤時間、缺欄位、非 object item、未知欄位與 Evergreen fallback 的 fixture；Browser reload Daily 後確認 DOM 只顯示可接受 item、fallback 值正確、未知欄位仍在 API 原始資料中；最後用 `POST /calendar {}` 還原。

## 使用者切換與跨 view links

對應 Module Areas：

- Primary：`User / sync`
- Related：`Bootstrap / events`、`Persistence`

- Trigger：`#show-user-name`、`#userDialog`、`#textInput`、`#loginUser`、`#clearUser`、`#dialog-close-btn`、`storage` event。
- Primary：`initCalendarUserId()`、`applyUserIdFromDialog()`、`updateUserDisplay()`、`updateModeLinks()`、`readStoredCalendarUserId()`、`setStoredCalendarUserId()`、`isValidCalendarUserId()`。
- Storage：`calendar.currentUserId`。
- Initialization：有效的 8 位 URL `userId` query 優先於 storage；無效 query 退回有效 storage 或 `00666888`。
- Validation：前端只接受剛好 8 位數字。
- Behavior：成功切換 user 後會更新 label 與 mode links、寫入 storage、關閉 dialog、重連 WebSocket 並載入目前日期；`storage` event 也會載入 Evergreen 與目前日期。
- Verify：直接開 `/day/?userId=00000999` 時 label 與 mode links 應使用 `00000999`；輸入非 8 位 userId 時 dialog 保持開啟且 status 顯示錯誤；無效 query 不覆蓋既有 8 位 user；API header/query 需讀到同一份 user data。

### Shared dialog boundary

- Daily entry: `daily-account.js` owns the Daily account dialog contract, including `#show-user-name`, `#userDialog`, `#textInput`, `#clearUser`, `#loginUser`, `#dialog-close-btn` and `#user-dialog-overlay`.
- Daily adapter: `daily-account.js` exposes `getCurrentUserId()` / `onLoginSuccess()`; `applyUserIdFromDialog()` remains the only Daily state-changing account function.
- Account guard: `#deleteAll` → `openDeleteAllUserCheckDialogV2()` → `openDailyConfirmDialog()`; shared CSS changes presentation only. The unused `openDeleteAllUserCheckDialog()` is legacy and not an entry point.

## WebSocket 同步

對應 Module Areas：

- Primary：`User / sync`
- Related：`Persistence`、`Normalize`

- Primary：`connectWs()`。
- Messages：`calendar-init`、`calendar-updated`。
- Own update：`sourceClientId === DAILY_CLIENT_ID` 時略過。
- Reconnect：沒有自動重連；切 user 時會關閉舊 socket 並建立新 socket。
- Verify：用相同 user 從 API 或其他 view 寫入後，Daily 目前日期與 Evergreen 應更新並顯示 `已同步 ✓`；不同 user 不更新。若只驗證 Daily 本身，可用 `X-Client-Id` 不等於 `DAILY_CLIENT_ID` 的 API write 觸發同 user broadcast。
