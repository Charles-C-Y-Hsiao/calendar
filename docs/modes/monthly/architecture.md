# Monthly Architecture

## Entry Files

- HTML: `monthly-calendar/monthly-calendar.html`
- Calendar renderer: `monthly-calendar/monthly-calendar-renderer.js`
- Task projection and interactions: `monthly-calendar/monthly-task-list.js`
- Persistence and realtime sync: `monthly-calendar/monthly-persistence.js`
- Day panel: `monthly-calendar/monthly-day-panel.js`
- Account bridge: `monthly-calendar/monthly-account-adapter.js`
- CSS: `monthly-calendar/monthly-calendar.css`, `monthly-task-list.css`, `monthly-day-panel.css`
- URL: `/month`

HTML loads shared account storage first, then the Monthly renderer, persistence, task list, day panel, shared action dialogs, account adapter, and shared login core. There is no inline task-rendering script.

## Module Map

| Module | Stable symbols | Owns / writes | Reads / depends on | Avoid touching |
| --- | --- | --- | --- | --- |
| Calendar Renderer | `init_calendar()`, `renderCalendar()`, `changeMonth()`, `buildCal()`, `bindMonthSwitchers()` | `curYear`, `curMonth`, calendar shell and date-cell DOM | `fetchFromServer()`, `initTaskUIsFromStorage()`, `dayTasks` projection | task item schema, persistence contract, WebSocket lifecycle |
| Task List | `ensureTaskUI()`, `renderTaskList()`, `getList()`, `assignTimeForItem()`, `getDragAfterElement()`, `isMonthlyVisibleItem()` | date-cell task DOM, selected task, visible task ordering | `dayTasks`, `persist()`, Calendar Renderer cells, Day Panel | REST headers, user switching, WebSocket lifecycle |
| Persistence / Sync | `fetchFromServer()`, `postToServer()`, `persist()`, `connectCalendarWS()`, `rerenderFromDayTasks()`, `rerenderFromMemory()`, `updateUserNameUI()`, `updateModeLinks()` | complete `dayTasks` map, save debounce, status, WebSocket and mode links | `/calendar`, `X-User-Id`, `X-Client-Id`, shared account storage | task row DOM and Day Panel editing semantics |
| Day Panel | `openDayPanel()`, `renderPanelList()`, `edit_time_dialog()` | panel session, add/edit/delete/move/reorder controls | `dayTasks`, Task List helpers, `persist()`, shared action dialogs | calendar shell generation and API route details |
| Account / User | `accountLoginAdapter.onLoginSuccess()` | account switch bridge and reload | shared account storage/login core | CalendarData mutation rules |

## File Map

| File | Responsibility |
| --- | --- |
| `monthly-calendar-renderer.js` | Monthly shell, month navigation, date cells |
| `monthly-task-list.js` | Date-cell task rendering, selection, drag reorder, Availability projection filter |
| `monthly-persistence.js` | CalendarData REST round-trip, save debounce, status, WebSocket, user links |
| `monthly-day-panel.js` | Day Panel CRUD, time validation, cross-date move and reorder |
| `monthly-calendar.css` | Calendar shell, header and grid |
| `monthly-task-list.css` | Date-cell task list and task-row styles |
| `monthly-day-panel.css` | Day Panel and time-dialog styles |
| `monthly-account-adapter.js` | Monthly-specific bridge to shared account login |

## Data and Sync Boundary

Monthly keeps the complete CalendarData map in `dayTasks`. `monthly-persistence.js` is the only module that owns GET/POST `/calendar`, the `X-User-Id` and `X-Client-Id` headers, save debounce, and WebSocket lifecycle. Task List and Day Panel mutate the map through helpers and call `persist()`; they do not construct API requests.

Monthly filters records whose `type` or `itemType` is `availability` through `isMonthlyVisibleItem()`. Filtering is presentation-only; Availability records remain in `dayTasks` and API payloads.

## Initialization Order

1. Shared account storage
2. `monthly-calendar-renderer.js`
3. `monthly-persistence.js`
4. `monthly-task-list.js`
5. `monthly-day-panel.js`
6. Shared action dialogs
7. `monthly-account-adapter.js`
8. Shared account login core

The scripts are classic scripts and expose stable symbols for the existing cross-module flow. Future changes should preserve these symbols or update all consumers together.

## Known Risks

- Renderer calls persistence/task projection symbols after DOMContentLoaded; changing script order can break initialization.
- Day Panel reuses `getDragAfterElement()`; keep support for both `.task-item` and `.day-panel-item`.
- `rerenderFromMemory()` and `initTaskUIsFromStorage()` must clear stale task DOM when a payload becomes empty.
- Monthly POST must preserve `_evergreen`, Availability records, and Weekly-only fields.
- Do not use line numbers as contracts; use filenames, symbols, selectors, routes and state keys.

