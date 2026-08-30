# Weekly Architecture

## Overlapping Block Presentation Boundary

- `renderDayFromData()` calls `layoutOverlappingItems()` before creating blocks. The helper assigns presentation-only lanes for intersecting time ranges; it does not mutate persisted schedule item fields.
- Blocks in a connected overlap group receive `.has-overlap`, `data-overlap-count`, and lane width/left styles. Hover and keyboard focus raise the active block visually without changing its data.
- Lane gaps use 1px on each side. Hover and keyboard focus temporarily expand the active block to the day column (`left/right: 1px`) so its content is readable above neighboring lanes; leaving the block restores the lane width.
- After a successful single-day or range save, the current week is fetched and rendered again so newly created or newly overlapping blocks immediately receive the latest lane layout.
- Compact block text remains vertically scrollable when content exceeds the block height, but the scrollbar track/thumb is visually hidden so narrow lanes do not show a distracting scroll-y bar.
- A focused or activated overlapping block opens `.overlap-details-overlay`, whose list is built by `openOverlapDetails()` from group time and name values. This is a read-only disambiguation surface; persistence remains owned by the existing serialize/persist pipeline.

## Entry Files

- HTML：`weekly-calendar/weekly-calendar.html`
- Main CSS：`weekly-calendar/weekly-calendar.css`
- URL：`/week`
- 第三方 runtime：Interact.js、Day.js，由 HTML CDN scripts 載入。

HTML 的 script 順序是依賴契約：`weekly-account.js` → `weekly-persistence.js` / `weekly-navigation.js` / block creation / block interaction / date-time dialog → `weekly-calendar-core.js` → availability/recurring → `weekly-account-adapter.js`。這些是 Weekly 的 global symbols，不可任意重排。

`weekly-navigation.js` 合併原本的 topbar/day-column 初始化與上一週、下一週、鍵盤導覽；其餘檔案以 module ownership 命名，避免只用模糊的 `setupElements.js` 或 `open-dialog.js` 表示責任。

## Module Areas

這份表要和 `plan/07_13_01_16_calendar-feature-verification-plan.md` 的「第四階段：Weekly Modules」保持同名。驗證時先用這裡判斷 module 邊界，再到 `feature-map.md` 找使用者功能入口。

| Module Area | Stable symbols | Responsibility | Owns / writes | Reads / depends on | Usually avoid touching |
| --- | --- | --- | --- | --- | --- |
| Topbar / Navigation | `initTopbarRulerAndDays()`、`bindKeyboardControls()`、`loadWeek()`、`updateWeekRangeLabel()` | 週載入、上一週、下一週與日期欄。 | `viewStart`、七日欄 DOM、週範圍 label。 | Day.js、`GET /schedule?from=...&to=...`、`renderWeekFromMap()`。 | 不直接改 block serialization 或 group data。 |
| Block Creation | `initCreateGhostOrBlock()`、`createBlockElement()` | 建立 schedule block 與 ghost lifecycle。 | 建立中的 ghost、初始 `.block` DOM/data attributes。 | `setupInteract()`、day columns、`persistDay()`。 | 不處理既有 block 的拖曳/縮放規則。 |
| Drag / Resize | `initInteractForBlocks()`、`createDragOptions()`、`createResizeOptions()`、`updateBlockTime()`、`attachTimeEditor()` | 拖曳、跨日、吸附、縮放與時間編輯。 | `.block` 的位置、尺寸、日期與時間 attributes。 | Interact.js、day columns、`serializeDay()`、`persistDay()`、`openDateTimeDialog()`。 | 不改 recurring / availability group 產生規則。 |
| Persistence | `serializeDay()`、`serializeWeek()`、`persistDay()`、`persistWeek()`、`buildPayloadForDate()`、`renderWeekFromMap()`、`loadWeek()` | 單日與整週 serialize/write/reload。 | `allSchedules`、server roundtrip、DOM → ScheduleItem 轉換。 | `/schedule` API、`createBlockElement()`、`weekly-persistence.js`。 | 不在單日寫入時遺失其他日期；不在完整寫入時遺失 `_evergreen`。 |
| Recurring Schedule | `initRecurringScheduleDialog()`、`applyBulkSchedule()`、`deleteBulkGroup()`、`collectRecurringGroups()` | 建立、編輯與刪除重複排程 group。 | `repeatGroupId` 相關 ScheduleItem fields。 | `GET /calendar`、`POST /calendar`、`renderWeekFromMap()`、Persistence。 | 不以一般 block 刪除邏輯取代 group deletion。 |
| Availability | `openAvailabilityManager()`、`openAvailabilityEditor()`、`ensureAvailabilityBlockForDay()`、`removeAvailabilityGroup()` | 日期範圍、people、overlap、manager 與 group deletion。 | `type: "availability"` items、`availability*` fields、people/status。 | `GET /calendar`、`POST /calendar`、`renderWeekFromMap()`、Persistence。 | 不讓 availability group 操作影響一般 schedule 或 recurring items。 |

## File Map

| File | Responsibility | Main symbols |
| --- | --- | --- |
| `weekly-persistence.js` | Persistence：共用 DOM/runtime 設定與 REST persistence | `persistDay()`、`persistWeek()`、`buildPayloadForDate()` |
| `weekly-navigation.js` | Topbar / Navigation：建立週標題、時間尺、七日欄與上一週/下一週/鍵盤控制 | `initTopbarRulerAndDays()`、`bindKeyboardControls()` |
| `weekly-calendar-core.js` | Persistence、Block Creation：schedule serialize/render/load 與 block factory | `serializeDay()`、`renderWeekFromMap()`、`loadWeek()`、`createBlockElement()` |
| `weekly-block-creation.js` | Block Creation：在空白時間格拖出新 block | `initCreateGhostOrBlock()` |
| `weekly-block-interaction.js` | Drag / Resize：block 跨日拖曳、縮放、時間編輯 | `initInteractForBlocks()`、`attachTimeEditor()` |
| `weekly-date-time-dialog.js` | Drag / Resize：日期與時間 dialog | `openDateTimeDialog()` |
| `recurring-schedule.js` | Recurring Schedule：批次建立/編輯/刪除重複排程 | `initRecurringScheduleDialog()`、`applyBulkSchedule()` |
| `availability-schedule.js` | Availability：availability 建立、編輯、manager | `openAvailabilityManager()`、`openAvailabilityEditor()` |
| `weekly-account.js` | Weekly Account / User：storage、validation、dialog controller、warning 與 adapter bridge | `isValidCalendarUserId()`、`readStoredCalendarUserId()`、`setStoredCalendarUserId()`、`bindCalendarUserStorageSync()` |
| `weekly-calendar.html` inline script | Topbar / Navigation、Realtime Sync：view bootstrap、週切換與 WebSocket sync | `connectCalendarWS()`、`updateWeekRangeLabel()` |

## State Ownership

- Topbar / Navigation owns `viewStart`、週範圍 label 與七日欄初始化。
- Block Creation owns 建立中的 ghost 與新 block 的初始 DOM/data attributes。
- Drag / Resize owns 既有 block 的位置、尺寸、跨日與時間 attributes。
- Persistence owns `allSchedules`、DOM serialize、server write/reload。
- Recurring Schedule owns `repeatGroupId` 與 `repeat*` fields 的 group lifecycle。
- Availability owns availability group fields、people/status 與 manager/editor state。
- `dayCols` / `getDayCols()` 是七日 column DOM references，多個 modules 共用。

## Topbar / Navigation Boundary

- Primary responsibility：決定目前週的 Monday `viewStart`、建立 topbar 日期列、建立 7 個 day columns、維護週範圍 label，並在上/下一週時重建週 DOM、重新初始化互動與重新載入該週資料。
- Owns / writes：`viewStart`、`#weekRange`、`#topbar .cell:not(.ruler)`、`#content .day[data-day-index]`、`dayCols` array、`#btnPrevWeek` / `#btnNextWeek` 的 click flow，以及左側 `#ruler .hour` 首次初始化。
- Reads / depends on：`WEEK_STARTS_ON`、`startOfWeek()`、`addDays()`、`fmtDate()`、Day.js/runtime date behavior、`initInteractForBlocks()`、`initCreateGhostOrBlock()`、`loadWeek()`、`renderWeekFromMap()`、`getDayCols()`、`setStatus()` 與 `/schedule?from=...&to=...`。
- Week range contract：目前週從 Monday 開始；`updateWeekRangeLabel()` 顯示 `YYYY-MM-DD — YYYY-MM-DD`，`loadWeek()` 使用同一組 `from = fmtDate(viewStart)`、`to = fmtDate(addDays(viewStart, 6))` 呼叫 range API。
- Rebuild contract：prev/next buttons 會先將 `viewStart` 加減 7 天，再呼叫 `initTopbarRulerAndDays(viewStart)` 重建日期列與 day columns，重新建立 interact setup、ghost creation，最後 `loadWeek()` 與 `updateWeekRangeLabel()`。
- Keyboard note：`bindKeyboardControls()` helper 存在，會把方向鍵轉成 prev/next button click；但目前 `weekly-calendar.html` 的 bootstrap 呼叫被註解，因此 runtime 不會啟用鍵盤切週。
- Usually avoid：不要在 Topbar / Navigation 直接改 `.block` serialization、drag/resize 規則、recurring/availability group data 或 persistence write contract。

## Block Creation Boundary

- Primary responsibility：在空白 `.day` 欄位把有效的向上或向下滑鼠拖曳轉成暫時 `.ghost`，放開後建立一筆初始一般 schedule block；既有 block 的移動、縮放與時間編輯不屬於此模組。
- Owns / writes：建立過程的 `isMaybeStart`、`isDraggingToCreate`、`ghost`、`startY`、`activeDay`、`startScrollTop`，以及新 `.block` 的 `data-id`、`data-day-index`、`style.top`、`style.height`、初始文字與時間顯示。
- Interaction contract：只接受左鍵且 event target 必須是 day 欄本身；拖曳位移需達 `DRAG_THRESHOLD = 35` 才建立 ghost。起訖位置會以 `slotPx` 吸附，最小高度是一個 slot；拖曳期間欄位 scrollTop 改變、未達門檻放開，或取消時都必須移除 ghost 且不寫資料。
- Finalize flow：`initCreateGhostOrBlock()` → `createBlockElement()` → append 至 active day → `setupInteract()` → `updateBlockTime()` → optional `window.afterWeeklyCalendarBlockCreated()` → `persistDay(dayIndex)`。`window.getWeeklyCalendarCreateOptions()` 可提供新 block 的額外欄位；目前 availability 檔案提供的預設 hook 回傳空物件／不做後處理。
- Reads / depends on：共用 `dayCols`、`slotPx`、`clamp()`、`snapToSlot()`、`px()`、`createBlockElement()`、`setupInteract()`、`updateBlockTime()`、`persistDay()`；`serializeDay()` 會將新 block 的 DOM attributes 轉為 API payload。
- Usually avoid：不要在建立流程加入既有 `.block` 的跨日拖曳、resize 或 time editor 規則；這些由 `Drag / Resize` 擁有。不要直接改 `persistDay()` 的單日寫入契約；它屬於 `Persistence`。

## Drag / Resize Boundary

- Primary responsibility：對既有一般 `.block` 提供 `.meta` 拖曳、`.handle.top` / `.handle.bottom` resize，以及 `.time` double-click 日期時間編輯；負責把結果反映到 block 的位置、尺寸、parent day 與 `data-day-index`。
- Owns / writes：拖曳中的 `data-x` / `data-y` 與 `transform`，完成時的 `style.top` / `style.height`、block parent day、`data-day-index`、`.time` 顯示；resize 最小高度與日期時間 dialog 確認後的新值。
- Drag contract：`createDragOptions()` 僅允許從 `.meta` 開始。完成時水平位移達半個 `stepX` 才跨欄，以 `Math.round(x / stepX)` 計算欄位偏移並限制在 0–6；垂直位置用 `snapToSlot()` 吸附並限制在 day 高度內。跨日會移動 DOM、更新 day index 並走 `persistWeek()`；同日只走 `persistDay()`。
- Resize contract：`createResizeOptions()` 只允許 top/bottom handles，最小高度為 `slotPx`，完成時 top/height 對齊 slot 並以 `restrictEdges` / `restrictSize` 限制在 parent day。
- Time editor contract：`attachTimeEditor()` 在 `.time` double-click 時開 `openDateTimeDialog()`；同日確認後更新 top/height 並 `persistDay()`。改日期時會從 old date cache 移除、推進 new date cache，並分別寫入舊／新日期。
- Current limitation：time dialog 把 block 改到「仍在目前週」的另一日期時，程式會先 `block.remove()`、寫入兩個日期，但不立即 append 或 rerender destination day；資料正確，畫面需 reload 才顯示新 block。此為已記錄產品問題，不在本輪修正。
- Reads / depends on：Interact.js、`stepX` / `stepY` / `slotPx`、`getDayCols()`、`clamp()`、`snapToSlot()`、`roundTo()`、`px()`、`updateBlockTime()`、`viewStart`、`allSchedules`、`serializeDay()`、`persistDay()` / `persistWeek()`、`openDateTimeDialog()`。
- Usually avoid：不要讓一般 block 的 drag/resize 覆蓋 recurring 或 availability metadata；也不要把 API persistence 細節搬進 interaction handlers。

## Persistence Boundary

- Primary responsibility：持有 Weekly 已載入的 `allSchedules` cache，將目前七日 `.block` DOM serialize 成 ScheduleItem arrays，呼叫單日或 range REST write，並在週載入／重建時以 server range response 重畫目前七欄。
- Owns / writes：`allSchedules`、`serializeDay()` / `serializeWeek()` 產出的 payload、`persistDay()` / `persistWeek()` 的 status 與 server roundtrip；`renderWeekFromMap()` 會先清除目前 columns 的 blocks 再重建。
- Load contract：`loadWeek(startDate)` 以 Monday–Sunday range 呼叫 `GET /schedule?from=...&to=...`，將 response merge 到 `allSchedules`，再只投影該七日。range response 本身不含 `_evergreen`，但 client 不應把它視為完整 CalendarData。
- Single-day write：`persistDay(dayIndex)` 由當前 day DOM `serializeDay()`；`persistDay(dateStr)` 則由 cache `buildPayloadForDate()`。兩者皆 `POST /schedule/:date`，server 只替換該日期，保留其他日期與 `_evergreen`。
- Save ordering：`persistDay()` 與 `persistWeek()` 共用 `enqueueSave()` promise chain。建立、拖曳／縮放、編輯器與批次操作接近同時觸發時，後續操作會等前一筆完成，避免較舊 DOM snapshot 晚到而覆蓋新項目；只有最新 save revision 會執行 `refreshWeekAfterSave()`，避免中間 refresh 清掉尚未寫入的新 block。
- Range write：`persistWeek()` 對目前七個日期執行 `serializeWeek()`，更新同範圍 `allSchedules` 後 `POST /schedule?from=...&to=...`。server 只替換 range 內有提供的日期；range 外日期、`_evergreen` 與其他 top-level keys 會保留。
- Serialization compatibility：`serializeDay()` 與 `buildPayloadForDate()` 是已知欄位白名單：基礎 `id/start_time/end_time/text/completed` 加上 recurring / availability fields。range 內 item 的未知欄位不會由 Weekly 寫回；而一般 block 目前也會序列化出空的 `availabilityPeople: []`。這是現有相容性限制，不能把 Weekly 當作未知欄位的無損編輯器。
- Reads / depends on：`viewStart`、`dayCols` / `getDayCols()`、`fmtDate()` / `addDays()` / `weekDates()`、`createBlockElement()`、`initInteractForBlocks()`、`setStatus()`、`X-User-Id`、`X-Client-Id`、`/schedule` API 與 server range merge 行為。
- Usually avoid：不要用 range response 覆蓋完整 `allSchedules`；不要宣稱 Weekly write 能保留 range 內 unknown item fields；recurring／availability 全量操作需依自己的完整 CalendarData 流程處理。

## Recurring Schedule Boundary

- Primary responsibility：管理同一月份內由 `repeatGroupId` 關聯的 weekly / monthly recurring group，包含建立、載入表單、整組修改與整組刪除；不以一般 block 單筆刪除取代 group lifecycle。
- Owns / writes：`.bulk-dialog-overlay`、group form/list state、`editingGroupId` / `focusGroupId`、`repeatGroupId`、`repeatScope`、`repeatPattern`、`repeatYearMonth`、`repeatDaysLabel`，以及 recurring instances 的新增／移除。
- Create contract：weekly mode 使用 JavaScript weekday number（SUN=0、MON=1…SAT=6）列出指定年月的所有 matching dates；monthly mode使用該月有效 date numbers。每個 instance 取得獨立 `id`，同組共用 group id、text、time 與 repeat metadata。
- Edit contract：先以 `ensureFullScheduleLoaded()` 讀完整 `/schedule`，clone 完整 map，依舊 group id 移除所有 instances，再以相同 group id 依新 spec 建立 instances；instance ids 會重建。`collectRecurringGroups()` 只從目前表單年月彙整 group list。
- Delete contract：整組刪除會遍歷所有 top-level date arrays，過濾相同 `repeatGroupId`，再完整 `POST /calendar`；一般 task、availability、`_evergreen`、週外資料與 unknown fields 應保留。曾有 group 的日期可能保留為空 array。
- Render / entry contract：`#bulkScheduleBtn` 開 dialog；group list 的 `[data-edit-group]` / `[data-delete-group]` 管理整組。Recurring block 的 `.repeat-badge` 也能以 `focusGroupId` 開啟同組編輯。成功後更新 `allSchedules` 並 `renderWeekFromMap()`。
- Current UI limitations：apply/delete handler 完成後會無條件 `refreshGroups()`；其中 `ensureFullScheduleLoaded()` 把 `#bulkMessage` 改為「載入完整資料…」，會覆蓋剛顯示的成功／validation 訊息。另從 weekly group 切成 monthly 編輯時，`collectRecurringGroups()` 彙整出的每筆 occurrence date number 會預先勾入 monthly choices，若未手動清除會產生額外日期。
- Reads / depends on：`allSchedules`、`viewStart`、`uid()`、`renderWeekFromMap()`、`setupInteract` / `getDayCols`、`setStatus()`、`CALENDAR_CLIENT_ID`、`GET /schedule`、`POST /calendar`、Persistence 與 Shared API / Data。
- Usually avoid：不要只載入目前週後做完整覆寫；不要讓 group edit/delete 依賴 Weekly DOM serializer；不要讓 recurring group 操作移除其他 modules 的 items 或 metadata。

## Availability Boundary

- Primary responsibility: `Availability` owns availability group 的日期範圍、weekday、時間、people/status、manager/editor、overlap 與 group deletion。
- Entry points: `availability-schedule.js` 的 `openAvailabilityManager()`、`openAvailabilityEditor()`、`ensureAvailabilityBlockForDay()`、`removeAvailabilityGroup()`；UI 入口為 `.invite-btn`、availability block、manager/editor overlays。
- Data contract: `type: "availability"`、`availabilityFrom`、`availabilityTo`、`availabilityWeekdays`、`availabilityGroupId`、`availabilityPeople[]`。Weekly weekday 使用 MON=0 至 FRI=4。
- Persistence: 編輯與刪除先讀完整 `/calendar`，依 group id clone/filter，再以 `POST /calendar` 全量寫回並呼叫 `renderWeekFromMap()`；依賴 `Persistence` 與 `Shared API / Data`。
- Manager display contract: `renderAvailabilityManager()` 的每個 `.availability-calendar-lane` 會將相交 records 分配為 presentation-only lanes；每個 `.availability-record` 使用 `--overlap-lane` / `--overlap-lanes`，lane 間距為 1px。hover 或 keyboard focus 時，當前 record 展開至 lane 內寬度並提高層級；`.availability-record-body` 保留內容捲動但隱藏 scrollbar。
- Manager week order：`managerWeeks()` 以目前 `viewStart` 的 This week 為第一個區塊，再列 Previous／Next／Two weeks later；避免目前已載入的 Availability records 被上一週區塊推到 modal 下方。
- Boundary and limitations: 不應影響一般 schedule、recurring、Evergreen 或週外資料。實測 Availability 編輯會重建已知欄位，未知 `customField` 可能遺失；草稿取消可能留下空日期 array。

## Data Flow

Topbar / Navigation：`loadWeek()` → `GET /schedule` → `allSchedules` → `renderWeekFromMap()` → `createBlockElement()`。

Block Creation / Drag / Resize：建立、拖曳、縮放或時間編輯 → 更新 block DOM/data attributes → `serializeDay()` 或 `serializeWeek()`。

Persistence：`serializeDay()` / `serializeWeek()` → `persistDay()` / `persistWeek()` → `/schedule` API → reload/render。

Recurring Schedule / Availability：載入完整 CalendarData → 修改 group items → `POST /calendar` 完整覆寫 → `renderWeekFromMap()` 重畫目前週。這條路徑必須保留 `_evergreen` 與未知欄位。

## Shared Action Dialog Boundary

- `shared/action-dialogs/module.js` owns generic alert/confirm behavior; `shared/action-dialogs/module.css` owns the common overlay, surface and buttons.
- Weekly `showQuickSaveDialog()` delegates to shared `actionDialogs.alert()`; `openDeleteConfirmDialog()` delegates to shared `actionDialogs.confirm()`.
- Native availability/recurring/date-time alerts and confirms use the shared API. Their schedule, group, validation and persistence state remains in Weekly modules.
- `openOverlapDetails()` and the Availability/Recurring managers may keep Weekly-specific content markup while reusing the shared `.dt-dialog` shell.

## Dependency And Risk Notes

- 多個檔案透過 globals 溝通，修改 symbol 名稱必須全目錄搜尋。
- `weekly-calendar-core.js` 與 `weekly-persistence.js` 共同擁有 serialize/persist pipeline，不能只改其中一端。
- availability/recurring 使用相同 ScheduleItem array；刪 group 必須以 group id 精準過濾。
- Weekly 有 inline WebSocket client，收到 `calendar-init` / `calendar-updated` 後更新 `allSchedules` 並重畫目前週。
- `weekly-calendar-server.js` 是 legacy，正式 API 文件以根目錄 server 為準。
