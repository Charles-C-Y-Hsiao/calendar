# Daily Architecture

## Entry Files

- HTML：`daily-calendar/daily-calendar.html`
- CSS：`daily-calendar/daily-layout.css`、`daily-calendar/daily-tasks.css`、`daily-calendar/daily-evergreen.css`
- JavaScript：`daily-calendar/daily-calendar.js`、`daily-calendar/daily-tasks.js`、`daily-calendar/daily-evergreen.js`
- URL：`/day`、`/daily-calendar`

Daily 使用 core、timed tasks、Evergreen 三個 JavaScript 邊界。`daily-calendar.js` 的 `init()` 依序建立時間選項、更新 user UI、綁定事件、連 WebSocket，再載入 evergreen 與當日資料；兩個功能模組先載入並提供各自的 render / interaction functions。

## File Boundaries

| File | Boundary | Stable symbols |
| --- | --- | --- |
| `daily-calendar.js` | Bootstrap、events、Persistence、Normalize、User / sync 與 Daily core state | `init()`、`bindEvents()`、`els`、`loadCurrentDay()`、`saveCurrentDay()`、`connectWs()` |
| `daily-tasks.js` | Timed tasks、task editor 與 task ordering handlers | `renderTodos()`、`toggleTodo()`、`openTaskEditor()`、`beginTodoPointerDrag()`、`reorderTodo()` |
| `daily-evergreen.js` | Evergreen CRUD、排序、拖曳與排入今日 | `renderEvergreen()`、`addEvergreenFromForm()`、`scheduleEvergreenToday()`、`reorderEvergreen()` |

CSS 對應相同責任：`daily-layout.css` 管理外殼與版面、`daily-tasks.css` 管理 timed task/editor、`daily-evergreen.css` 管理 Evergreen、`daily-account.css` 管理 Daily account、`daily-dialogs.css` 管理 Daily dialog primitives。Daily 不再載入 `shared/user-account/`；只共用 `shared/action-dialogs/`。

## Module Areas

| Area | Stable symbols | Responsibility |
| --- | --- | --- |
| Bootstrap / events | `init()`、`bindEvents()`、`els` | DOM references 與所有主要 event bindings |
| Timed tasks | `renderTodos()`、`toggleTodo()`、`openTaskEditor()` | 顯示、篩選、完成、編輯與刪除當日 items |
| Ordering | `beginTodoPointerDrag()`、`reorderTodo()`、`applySequentialOneHourTimes()` | edit mode 拖曳排序，重新配置連續一小時時段 |
| Evergreen | `renderEvergreen()`、`addEvergreenFromForm()`、`scheduleEvergreenToday()` | long-term item CRUD、排序與排入今日 |
| Persistence | `loadCurrentDay()`、`saveCurrentDay()`、`loadEvergreen()`、`saveEvergreen()` | `/schedule` 與 `/evergreen` contract |
| Normalize | `normalizeItems()`、`normalizeEvergreenItems()` | server payload fallback 與排序準備 |
| User / sync | `applyUserIdFromDialog()`、`updateModeLinks()`、`connectWs()` | user 切換、跨 view links、即時同步 |

## Bootstrap / events Boundary

- Primary responsibility：集中 Daily 啟動順序、DOM references 與初始 event bindings。
- Owns / writes：`els` DOM reference map、time select options、初始 user label/mode links、初始 socket lifecycle 與初始資料載入呼叫順序。
- Reads / depends on：`daily-calendar.html` 的穩定 DOM id、`currentDate`、`userId`、`loadEvergreen()`、`loadCurrentDay()`、`connectWs()`。
- Event binding：`bindEvents()` 綁定 date picker、timed task form、filters、edit/delete controls、evergreen controls、user dialog、task editor 與 `storage` event。
- Date navigation：目前實際 UI trigger 是 `#dateTitleButton` / `#datePicker`；`moveDay()` 是可用 helper，但 HTML 目前沒有獨立 previous / next day button 直接呼叫它。
- Usually avoid：不要在 Bootstrap / events 裡直接改 server contract 或 ScheduleItem schema；資料載入與 normalize 細節應交給 `Persistence` / `Normalize`。

## Timed tasks Boundary

### Availability Daily Projection

Daily keeps shared Availability records in `dayItems`, but renders them after
normal timed tasks. `renderTodos()` partitions with `isAvailabilityItem()` and
sorts the Availability group by `start_time`, then renders the groups in that
order. The `.todo.is-availability` class supplies a related light-indigo
background. This is presentation-only; `/schedule/:date` persistence and the
item fields are unchanged.

- Primary responsibility：管理 Daily 當日 timed task 的新增、顯示、完成狀態、篩選、單筆編輯與單筆刪除。
- Owns / writes：`dayItems` 內的 `id`、`start_time`、`end_time`、`text`、`completed`，以及 `activeFilter`、`editingItemId` 的 UI workflow state。
- Reads / depends on：`#todoForm`、`#startTime`、`#endTime`、`#taskInput`、`#todos`、`.filter[data-filter]`、`#taskEditDialog`、`Persistence` 的 `saveCurrentDay()` / `loadItemsForDate()` / `saveItemsForDate()`，以及 `Normalize` 對 server payload 的 fallback。
- Event binding：新增由 `bindEvents()` 的 form submit 進入；完成狀態由 `.todo-check` change 或 row click 進入 `toggleTodo()`；篩選由 `.filter[data-filter]` 更新 `activeFilter` 後重跑 `renderTodos()`；編輯與刪除按鈕在 `renderTodos()` 建立並綁定 handler。
- Edit-mode dependency：單筆 `.edit-btn` / `.delete-btn` 只有在 `daily-edit-mode` 且 task row hover 或 focus-within 時顯示；因此 Timed tasks 的單筆編輯/刪除 UI 會依賴 `Ordering` module 的 edit mode 狀態，但不 owns 拖曳排序。
- Usually avoid：不要在 Timed tasks 裡直接改整日刪除、拖曳排序或 sequential one-hour time reassignment；這些屬於 `Ordering`。不要在此直接改 REST route contract；server 寫入語意屬於 `Persistence` / Shared API。

## Ordering Boundary

- Primary responsibility：管理 Daily timed task 的 edit mode、drag handles、pointer/HTML5 drag reorder、排序後連續一小時時段重排，以及整日刪除的 userId 保護與二段確認。
- Owns / writes：`isEditMode`、`draggingItemId`、`todoPointerDrag`、task row 的 transient classes（`is-dragging` / `is-drop-target`）、`dayItems` order、重排後的 `start_time` / `end_time`；整日刪除成功時會將目前日期 `dayItems` 清空。
- Reads / depends on：`#editModeToggle`、`#deleteAll`、`.drag-btn`、`.todo`、`.daily-confirm-*` overlay、`userId`、`currentDate`、`renderTodos()` 與 `saveCurrentDay()`。
- Event binding：`bindEvents()` 綁定 edit mode toggle 與 `#deleteAll`；`renderTodos()` 為每筆 task row 綁定 `.drag-btn` pointerdown、HTML5 drag/drop fallback 與 row drop target behavior。
- Reorder behavior：`reorderTodo()` 只調整 `dayItems` 順序；`applySequentialOneHourTimes()` 以排序後第一筆的 `start_time` 為起點，將每筆 item 改成連續一小時區段，再透過 `saveCurrentDay()` 寫回 `/schedule/:date`。
- Delete-all guard：`openDeleteAllUserCheckDialogV2()` 要求輸入目前 8 位 `userId`，匹配後還會再進入 `Delete current day?` final confirmation；取消或帳號不符不應寫入。
- Usually avoid：不要把 Evergreen 排序放進此 Daily timed task Ordering boundary；Evergreen 有自己的 drag state 與排序流程。不要在 Ordering 直接更改 server route 或跨日期資料搬移 contract。

## Evergreen Boundary

- Primary responsibility：管理 Daily long-term items 的新增、顯示、編輯、完成/暫停/封存狀態、排序、排入今日與 `_evergreen` 持久化。
- Owns / writes：`evergreenItems`、`editingEvergreenId`、`isEvergreenEditMode`、`draggingEvergreenId`、`evergreenPointerDrag`、Evergreen item 的 `id`、`text`、`priority`、`status`、`completed`、`createdAt`、`updatedAt`、`order`；排入今日時也會新增目前日期 `dayItems` item 並寫入 `sourceEvergreenId`。
- Reads / depends on：`#evergreenForm`、`#evergreenQuickInput`、`#evergreenEditModeToggle`、`#evergreenList`、`#evergreenEmpty`、`#evergreenDialog`、`#evergreenInput`、`#evergreenPriority`、`#evergreenStatus`、`.evergreen-check`、`.evergreen-schedule`、`.evergreen-edit`、`.evergreen-delete`、`.evergreen-drag`、timed task 的 `#startTime` / `#endTime`，以及 `saveEvergreen()` / `saveCurrentDay()`。
- Event binding：`bindEvents()` 綁定 quick form submit、long-term edit mode toggle 與 evergreen dialog controls；`renderEvergreen()` 為每筆 item 綁定 done checkbox、schedule today、edit、archive 與 drag/drop handlers。
- Edit-mode semantics：`long-term-edit-mode` 開啟時顯示 `.evergreen-check` 與 `.evergreen-actions`，隱藏 `.evergreen-drag`；checkbox / schedule / edit / archive handlers 都只在 `isEvergreenEditMode` 為 true 時生效。非 edit mode 顯示 drag handle 並允許 pointer drag reorder。
- Schedule-today behavior：`scheduleEvergreenToday()` 使用 timed task form 目前的 `#startTime` / `#endTime`，驗證 start < end 後新增當日 `dayItems`，並寫入 `sourceEvergreenId` 指回 Evergreen item。
- Usually avoid：不要用 `/calendar` 直接覆寫整份資料來保存 Evergreen；一般 CRUD 只用 `/evergreen`，排入今日才另外寫 `/schedule/:date`。不要把 Daily timed task Ordering 的 sequential time reassignment 套到 Evergreen 排序。

## Persistence Boundary

- Primary responsibility：管理 Daily 對共用 REST API 的讀寫 contract、status 顯示、`X-User-Id` / `X-Client-Id` headers、reload 後資料回復，以及跨日期 helper 讀寫。
- Owns / writes：不直接 owns business state；它將 `dayItems` 寫入 `/schedule/:date`、將 `evergreenItems` 寫入 `/evergreen`，並用 `setStatus()` 呈現 loading / saving / saved / failed 狀態。
- Reads / depends on：`userId`、`DAILY_CLIENT_ID`、`currentDate`、`dayItems`、`evergreenItems`、`normalizeItems()`、`normalizeEvergreenItems()`、`sortItems()`、`sortEvergreen()`、`normalizeEvergreenOrder()`、`renderTodos()`、`renderEvergreen()`，以及 shared server routes。
- Read contract：`loadCurrentDay()` / `loadItemsForDate()` 使用 `GET /schedule?from={date}&to={date}`；`loadEvergreen()` 使用 `GET /evergreen`。range response 不包含 `_evergreen`，Evergreen 需用專屬 endpoint 載入。
- Write contract：`saveCurrentDay()` / `saveItemsForDate()` 使用 `POST /schedule/:date` 替換單日 array；`saveEvergreen()` 使用 `POST /evergreen` 替換 `_evergreen` array。兩者都應帶 `X-User-Id` 與 `X-Client-Id`。
- Preservation rules：`POST /schedule/:date` 應保留其他日期與 `_evergreen`；`POST /evergreen` 應保留所有日期資料。Daily 不應用 `/calendar` 完整覆寫來保存一般 timed task 或 Evergreen 操作。
- Usually avoid：不要在 Persistence 裡改 normalize fallback、render 規則、edit mode、排序或 userId validation；這些分屬 `Normalize`、feature modules 與 `User / sync`。

## Normalize Boundary

### Availability People Projection

Availability rows render each `availabilityPeople[]` entry as `name status`.
The status is normalized for presentation to `free` (green) or `not free`
(dark red); missing people show `Set people`.

- Primary responsibility：Daily 的讀取相容層；將 server payload 轉成 Daily render / edit / sort 可安全使用的 in-memory item array。
- Owns / writes：只 owns normalized in-memory shape，不 owns server schema migration。`normalizeItems()` 回傳 `dayItems` 的 fallback 結果；`normalizeEvergreenItems()` 回傳 `evergreenItems` 的 fallback 結果；`normalizeEvergreenOrder()` 會在目前 `evergreenItems` 上重寫連續 `order`。
- Reads / depends on：`loadCurrentDay()`、`loadItemsForDate()`、`loadEvergreen()`、`connectWs()` 傳入的 schedule / `_evergreen` payload，以及 `uid()`、`isHhmm()`、`normalizePriority()`、`normalizeEvergreenStatus()`。
- Schedule fallback：`normalizeItems()` 只接受 object item，會用 object spread 保留未知欄位；缺少 `id` 會產生新 id；不符合 `HH:mm` 的 `start_time` / `end_time` 分別 fallback 到 `08:00` / `09:00`；`text` 轉成 string；`completed` 轉成 boolean。
- Evergreen fallback：`normalizeEvergreenItems()` 只接受 object item 並過濾空白 `text`；保留未知欄位；缺少 `id` 會產生 `e...` id；`priority` 只接受 `high` / `medium` / `low`，其他值 fallback 到 `high`；`status` 只接受 `active` / `paused` / `done` / `archived`，其他值依 `completed` fallback 成 `done` 或 `active`；`createdAt` 缺值時使用目前時間；`order` 可轉成 finite number，否則先設為 `null`。
- Sort preparation：讀取後通常接 `sortItems()` 或 `sortEvergreen()`；Evergreen 讀取後還會接 `normalizeEvergreenOrder()`，因此畫面使用連續 order，而不是保留 server 原始 order。
- Usually avoid：不要把 Normalize 當成 server validation 或資料清洗 migration；server 仍可能保留原始 payload，只有當後續 feature 觸發 save 時，normalized in-memory shape 才會被寫回。

## User / sync Boundary

- Primary responsibility：Daily 的 user selection、跨 view links、REST user headers 與 WebSocket lifecycle。
- Owns / writes：`userId`、`ws`、`calendar.currentUserId` localStorage、`#show-user-name .btn-word` label、`#weekLink` / `#monthLink` href，以及 WebSocket payload 進來後的 `dayItems` / `evergreenItems` replacement。
- Reads / depends on：URL `userId` query、`daily-account.js`、`#show-user-name`、`#userDialog`、`#textInput`、`#loginUser`、`#clearUser`、`#dialog-close-btn`、`#user-dialog-overlay`、`loadCurrentDay()`、`loadEvergreen()`、`normalizeItems()`、`normalizeEvergreenItems()`、`renderTodos()`、`renderEvergreen()`、shared server `extractUserIdFromHttp()` / `extractUserIdFromWs()` contract。
- User selection：`initCalendarUserId()` 優先採用有效 8 位 URL query，否則讀 `calendar.currentUserId`，再 fallback 到 `00666888`；`applyUserIdFromDialog()` 只接受剛好 8 位數字，成功後寫 storage、更新 label/links、關 dialog、重連 WS 並載入目前日期。
- Cross-document sync：`storage` event 收到有效 `calendar.currentUserId` 時，會更新 `userId`、label、links、WS、Evergreen 與目前日期資料。
- WebSocket sync：`connectWs()` 會關閉舊 socket，再用目前 `userId` 建立 `/?userId=...`；收到 `calendar-init` / `calendar-updated` 時，若 `sourceClientId === DAILY_CLIENT_ID` 則略過，否則 normalize/sort/render 目前日期與 Evergreen。
- Usually avoid：不要把 userId 當成安全驗證或權限邊界；這只是本機資料分區。不要在 User / sync 直接改 REST persistence preservation 或 item schema fallback，分別交給 `Persistence` 與 `Normalize`。

## State Ownership

- `currentDate`：目前選取日期。
- `dayItems`：目前日期的 ScheduleItem array；切日或 WS 更新時替換。
- `evergreenItems`：完整 evergreen array。
- `activeFilter`：`all` / `completed` / `pending`，只影響呈現。
- `editingItemId` / `editingEvergreenId`：dialog editing target。
- drag state 與 `isEditMode` / `isEvergreenEditMode`：短生命週期 UI state，不持久化。
- `userId`、`ws`：帳號與 socket lifecycle。

## Data Flow

Timed task：form/dialog → `dayItems` → normalize/sort/render → `POST /schedule/:date` → server file → WebSocket broadcast。

Evergreen：form/dialog → `evergreenItems` → `POST /evergreen` → server 合併 `_evergreen` → broadcast 完整資料。

跨日期編輯由 `saveTaskEditor()` 配合 `loadItemsForDate()` / `saveItemsForDate()` 完成；修改時要避免在來源日期與目標日期間遺失 item。

## Context Rules

- UI-only 修改先看 `daily-calendar.html`、CSS 與 `els`。
- timed task 行為看 `renderTodos()` 與 persistence symbols。
- evergreen 不應直接使用 `/calendar` 覆寫完整資料。
- 修改 ScheduleItem 欄位前讀共用 `data-format.md`，並確認 Weekly serializer 是否保留欄位。

## Shared User Dialog / Account Guard

- `daily-account.js` owns Daily's account dialog controller, validation, storage helpers, counter, warning and adapter dispatch. It is intentionally independent from `shared/user-account/`.
- Daily `daily-account.js` remains the mode adapter. It supplies the current user id and delegates a valid login to `applyUserIdFromDialog()`; that function still owns storage, label/link updates, WebSocket reconnect and schedule reload.
- `daily-account.css` is the complete Daily account presentation source and `daily-dialogs.css` supplies Daily dialog primitives. The Account guard uses the Daily account palette, while its two-step verification and delete-confirmation behavior remain Daily-specific.
- `#deleteAll` is the active guard trigger (visible in edit mode and only when `dayItems` is non-empty); the legacy `openDeleteAllUserCheckDialog()` has no current caller and is retained as legacy code pending a separate cleanup decision.
- Generic `openDailyConfirmDialog()` delegates to `shared/action-dialogs/module.js`; Daily-specific account verification remains local because it owns the current-user match and delete workflow.
