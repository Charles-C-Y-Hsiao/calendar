# Monthly Feature Map

## Calendar Renderer

使用者介面元素：

- 月曆標題、上一月/下一月按鈕、日期 cells 與 `#calendars`

對應 modules：

- 主要 module：`Calendar Renderer`
- 相關 modules：`Task List`、`Persistence / Sync`

目前程式入口：

- HTML：`monthly-calendar/monthly-calendar.html`
- CSS：`monthly-calendar.css`
- JS：`monthly-calendar-renderer.js`
- Functions：`init_calendar()`、`renderCalendar()`、`changeMonth()`、`bindMonthSwitchers()`、`buildCal()`
- DOM：`.calendar`、`.calendar-header`、`.btn-dir.left`、`.btn-dir.right`、`li[data-tooltip="YYYY-MM-DD"]`

驗證方式：

- 確認月曆產生、月份切換、跨月/跨年與日期 cell identity。
- 使用 `rg` 搜尋 renderer symbols；不要從 Task List 或 API route 開始修改 grid。

## Task List

使用者介面元素：

- 日期格 task list、task rows、edit button、drag handle

對應 modules：

- 主要 module：`Task List`
- 相關 modules：`Calendar Renderer`、`Day Panel`、`Persistence / Sync`

目前程式入口：

- CSS：`monthly-task-list.css`
- JS：`monthly-task-list.js`
- Functions：`ensureTaskUI()`、`renderTaskList()`、`getList()`、`assignTimeForItem()`、`getDragAfterElement()`、`isMonthlyVisibleItem()`
- State：`dayTasks[dateKey]`、`selectedTaskId`
- DOM：`.task-list`、`.task-item[data-id]`、`.task-text`、`.drag-handle`、`.task-edit-btn.visible`

驗證方式：

- 讀取既有資料後確認 task rows、選取、拖曳排序與 edit button。
- 確認 Availability 只被過濾出 Monthly UI，不會從 API/data 中刪除。
- 新增或編輯後由 `persist()` 交給 Persistence / Sync；不要在此模組直接建立 fetch request。

## Day Panel

使用者介面元素：

- Day Panel overlay、task row、add/edit/delete、時間編輯與跨日期移動

對應 modules：

- 主要 module：`Day Panel`
- 相關 modules：`Task List`、`Persistence / Sync`、shared action dialogs

目前程式入口：

- CSS：`monthly-day-panel.css`
- JS：`monthly-day-panel.js`
- Functions：`openDayPanel()`、`renderPanelList()`、`edit_time_dialog()`
- DOM：`.day-panel-list`、`.day-panel-item`、`.day-panel-add`、`.task-edit`、`.task-del`、`.dt-date`、`.dt-start`、`.dt-end`

驗證方式：

- 只讀打開 panel，確認資料、排序、時間驗證與跨日流程入口。
- 高風險寫入測試只允許使用 userId `00000999`。

## Persistence / Sync

使用者介面元素：

- 儲存狀態、使用者名稱、Daily/Weekly mode links、WebSocket 更新後的 task projection

對應 modules：

- 主要 module：`Persistence / Sync`
- 相關 modules：`Task List`、`Day Panel`、`Account / User`、Shared API / Data、Realtime Sync

目前程式入口：

- JS：`monthly-persistence.js`
- Functions：`fetchFromServer()`、`postToServer()`、`persist()`、`connectCalendarWS()`、`rerenderFromDayTasks()`、`rerenderFromMemory()`、`updateUserNameUI()`、`updateModeLinks()`
- API：GET/POST `/calendar`，headers `X-User-Id`、`X-Client-Id`
- State：`dayTasks`、`saveTimer`、`pendingSave`、`CALENDAR_CLIENT_ID`
- WebSocket：`calendar-init`、`calendar-updated`

驗證方式：

- Browser 開啟 `/month/?userId=00000999`，確認載入狀態與 mode links。
- API 先做 GET；若需要寫入，只能使用 `00000999` 並驗證 reload/data preservation。
- 確認 WebSocket 不回寫相同 `X-Client-Id` 的事件。

## Account / User

- Adapter：`monthly-account-adapter.js`
- Account：`monthly-account.js`、`monthly-account.css`
- 驗證 user switch、名稱更新、mode links 與 reload；不要從 Persistence 直接改 login UI contract。
