# Weekly Feature Map

## Overlapping Block Display

使用者介面元素：

- 同一日期中時間範圍相交的 schedule blocks。
- hover / focus emphasis，以及 overlapping details dialog。

對應 modules：

- 主要 module：`Block Creation`
- 相關 modules：`Drag / Resize`, `Persistence`

目前程式入口：

- `weekly-calendar/weekly-calendar-core.js`: `renderDayFromData()`, `layoutOverlappingItems()`, `createBlockElement()`, `openOverlapDetails()`。
- `weekly-calendar/weekly-calendar.css`: `.block.has-overlap`, `.overlap-details-overlay`。
- `data-overlap-count`、`--overlap-lane`、`--overlap-lanes` 是呈現用狀態，不是 API 資料欄位。
- 未 hover 時 lane 左右間距為 1px；hover / keyboard focus 時，該 block 暫時展開至日期欄寬度並提高 z-index，移出後恢復原 lane 寬度。
- `persistDay()` / `persistWeek()` 成功後會重新載入並重畫目前週，確保新增或變更後形成的 overlap 立即套用最新 lane layout。
- 縮小 lane 的文字仍可垂直捲動，但隱藏 scrollbar 視覺元件，避免窄欄出現 scroll-y 佔位。

驗證方式：

- 以測試 userId `00000999` 寫入三筆相交 items，確認各 block 具有獨立 lane、hover/focus emphasis，並以 Enter 開啟 `3 overlapping tasks` 詳情清單。
- 讀取 `/schedule` 確認原始 time/name/id 未被 lane layout 改寫；驗證後清除測試 fixture。
- 不建議從 server schema 或 serializer 開始處理，除非需求要改變 persisted data contract。

## Topbar / Navigation

使用者介面元素：

- 上/下一週按鈕：`#btnPrevWeek`、`#btnNextWeek`。
- 週範圍 label：`#weekRange`。
- topbar / day columns：`#topbar`、`#content`。
- Time ruler：`#ruler .hour`。
- Keyboard helper：`bindKeyboardControls()` 存在，但目前 bootstrap 未啟用。

對應 modules：

- 主要 module：`Topbar / Navigation`
- 相關 modules：`Persistence`、`Realtime Sync`、`Account / User`

目前程式入口：

- JS：`weekly-navigation.js`、`weekly-calendar-core.js`、`weekly-calendar.html` inline script
- 主要 functions：`startOfWeek()`、`initTopbarRulerAndDays()`、`bindKeyboardControls()`、`loadWeek()`、`renderWeekFromMap()`、`updateWeekRangeLabel()`
- Related setup：`initInteractForBlocks()`、`initCreateGhostOrBlock()`、`getDayCols()`、`setStatus()`
- State：`viewStart`、`dayCols`、七日欄 DOM、`allSchedules`
- API：`GET /schedule?from=...&to=...`
- Event binding：
  - `DOMContentLoaded` 先設定 prev/next SVG、初始化 topbar/ruler/day columns、建立 interact/ghost setup、`loadWeek()`，最後 `updateWeekRangeLabel()`。
  - `#btnPrevWeek` click：`viewStart = addDays(viewStart, -7)`，重建週 DOM、重新建立 interact/ghost setup、載入新週並更新 label。
  - `#btnNextWeek` click：`viewStart = addDays(viewStart, +7)`，流程同上。
  - `bindKeyboardControls()` 目前沒有被呼叫；方向鍵不會在 runtime 切週。

驗證方式：

- Browser：初始週應從 Monday 開始；確認七日日期、`MON` 到 `SUN` labels、`#weekRange`、`#ruler`、七個 `.day` columns 與 blocks projection。
- Browser：用 prev/next buttons 驗證上一週、下一週與跨月週；每次都要確認 `#topbar` cell count 與 `.day` column count 仍是 7，且 blocks 來自正確日期。
- Browser：方向鍵若未切週，應記錄為目前 runtime 行為，因 `bindKeyboardControls()` 未啟用。
- API：確認週 range 使用正確 `from` / `to`。
- Symbol search：搜尋 `initTopbarRulerAndDays|bindKeyboardControls|loadWeek|updateWeekRangeLabel|viewStart|weekRange`。
- User/API：Weekly 不直接採 URL query 初始化 user；驗證時要確認實際 user label 與 mode links，不可只看 address bar。
- 不建議從 drag/resize、recurring 或 availability 檔案開始處理週切換；那些只應被重新初始化或重新渲染。

## Block Creation

使用者介面元素：

- 時間格 pointer drag。
- 建立中的 ghost block。
- 新建立的 `.block`。

對應 modules：

- 主要 module：`Block Creation`
- 相關 modules：`Drag / Resize`、`Persistence`

目前程式入口：

- JS：`weekly-block-creation.js`、`weekly-calendar-core.js`、`weekly-persistence.js`；optional create hooks 目前由 `availability-schedule.js` 掛到 `window`。
- 主要 functions：`initCreateGhostOrBlock()`、`cancelCreate()`、`finalizeCreate()`、`createBlockElement()`、`updateBlockTime()`、`serializeDay()`、`persistDay()`
- DOM / CSS：`.day[data-day-index]`、`.ghost`、`.block`、`.block .time`、`.block .text`；`ghost` 為 `pointer-events: none`，建立後不應留在 DOM。
- State：`isMaybeStart`、`isDraggingToCreate`、ghost、`startY`、active day、`startScrollTop`、block top/height。
- Gesture contract：只接受直接點在 `.day` 本身的左鍵 mousedown；位移達 `DRAG_THRESHOLD = 35` 才產生 ghost。top/height 以 `slotPx` 吸附、最小一個 slot；期間若欄位捲動、未達門檻或取消，不能建立 block／留下 ghost。
- Data：`id`、`start_time`、`end_time`、`text`；一般新 block 預設文字為空，時間從 top/height 換算。`getWeeklyCalendarCreateOptions()` 與 `afterWeeklyCalendarBlockCreated()` 是可選 hook，現行 availability 預設不改寫一般 block。
- API：`persistDay()` → `POST /schedule/:date`
- Event binding：對每個 `.day` 綁定 mousedown/mousemove/mouseup，document mouseup 也會收尾。

驗證方式：

- Browser：不同時段/日期建立，確認 block 的 day index、top/height 與顯示時間；短於 35px 的拖曳或取消不留下 ghost／資料；重新整理與 Monthly 顯示一致。
- API/data：確認 `POST /schedule/:date` 的單日 payload 與 `GET /schedule?from=...&to=...` 一致；測試後還原專用 user。
- Symbol search：搜尋 `initCreateGhostOrBlock|cancelCreate|finalizeCreate|createBlockElement|ghost|DRAG_THRESHOLD|getWeeklyCalendarCreateOptions|afterWeeklyCalendarBlockCreated|persistDay`。
- 不建議在這裡處理既有 block 的跨日拖曳或 resizing。

## Drag / Resize

使用者介面元素：

- `.block` 的 `.meta` 拖曳區與 `.handle.top` / `.handle.bottom` resize handles。
- block time editor。
- 日期時間 dialog。

對應 modules：

- 主要 module：`Drag / Resize`
- 相關 modules：`Block Creation`、`Persistence`

目前程式入口：

- JS：`weekly-block-interaction.js`、`weekly-date-time-dialog.js`、`weekly-calendar-core.js`、`weekly-persistence.js`
- 主要 functions：`initInteractForBlocks()`、`createDragOptions()`、`createResizeOptions()`、`updateBlockTime()`、`attachTimeEditor()`、`openDateTimeDialog()`、`persistDay()`、`persistWeek()`
- DOM / state：`.block`、`.meta`、`.handle.top`、`.handle.bottom`、`.time`、`data-x` / `data-y`、`style.transform`、`style.top`、`style.height`、`data-day-index`、parent `.day[data-day-index]`。
- Drag rules：只允許由 `.meta` 拖曳；垂直位置以 `slotPx` 吸附且限制在 day；水平位移至少半個 `stepX` 才跨欄，目標欄 index 限制 0–6。跨日寫 `persistWeek()`，同日寫 `persistDay()`。
- Resize rules：top/bottom handle；最小一個 `slotPx`，完成時以 `stepY` 對齊並限制於 parent day。
- Time editor：double-click `.time` 開 `openDateTimeDialog()`；同日改時間會更新 top/height，改日期會分別寫入舊／新日期。
- API：`serializeDay()` → `persistDay()` writes affected day；跨日 drag 走 `persistWeek()`。
- Event binding：Interact.js on `.block` 與 `.time` dblclick。

驗證方式：

- Browser：同日向上/下吸附、左右跨日、top/bottom resize、最短高度、接近日欄下界、time dialog 同日／跨日期修改與 reload；來源日期不能殘留 duplicate。
- API/data：跨日後確認 source date 不含原 id、target date 只含一筆；所有寫入只用專用測試 user，結束後還原。
- Known limitation：time dialog 改到同週另一日後，destination block 會暫時從 DOM 消失，reload 才投影正確資料；不可把這個 UI 行為標為通過。
- Symbol search：搜尋 `initInteractForBlocks|createDragOptions|createResizeOptions|updateBlockTime|attachTimeEditor|openDateTimeDialog|persistWeek|data-x|data-y|stepX|stepY`。
- 不建議從 recurring 或 availability files 修改一般 block 拖曳規則。

## Persistence

使用者介面元素：

- Weekly block reload/render 結果。
- saving/success/error status。

對應 modules：

- 主要 module：`Persistence`
- 相關 modules：`Topbar / Navigation`、`Block Creation`、`Drag / Resize`、`Shared API / Data`、`Realtime Sync`

目前程式入口：

- JS：`weekly-persistence.js`、`weekly-calendar-core.js`
- 主要 functions：`serializeDay()`、`serializeWeek()`、`persistDay()`、`persistWeek()`、`buildPayloadForDate()`、`renderWeekFromMap()`、`loadWeek()`
- State：`allSchedules`、目前七欄 `.block` DOM
- API：`GET /schedule?from=...&to=...`、`POST /schedule/:date`、`POST /schedule?from=...&to=...`
- Data format：ScheduleItem array keyed by `YYYY-MM-DD`
- Load：`loadWeek()` 只取 Monday–Sunday range，merge response 至 `allSchedules`，然後清空／重畫目前七欄；range GET 不含 `_evergreen`，不是完整 map replacement。
- Single-day write：`persistDay(dayIndex)` 從當前 day DOM `serializeDay()`，`persistDay(dateStr)` 從 cache `buildPayloadForDate()`；兩者只替換指定日期。
- Save ordering：`persistDay()` 與 `persistWeek()` 經 `enqueueSave()` 排隊執行，並以 save revision 只讓最後一筆成功操作 refresh，避免新增、拖曳／縮放或編輯器同時保存時，較舊 snapshot 或中間 refresh 覆蓋較新的項目。
- Range write：`persistWeek()` 由 `serializeWeek()` 產生七日 payload，server 只套用 range 中 body 具備的 keys，因此 range 外日期與 `_evergreen` 會保留。
- Serialization limit：Weekly 只輸出基礎、recurring 與 availability 的已知欄位；range 內 item 的 unknown fields 會遺失。一般 block 也會寫入空 `availabilityPeople: []`。需無損保留未知欄位時，不可直接依賴 Weekly serializer。

驗證方式：

- API/data：七天各放一筆加上週外日期與 `_evergreen` sentinel；分別驗證 `POST /schedule/:date` 與跨日觸發的 `POST /schedule?from&to`，再重新載入整週。
- Browser：確認 range load、status、單日文字寫入、跨日／整週寫入、reload 與 Daily/Monthly 投影一致。
- Compatibility：range 外日期、`_evergreen` 與 known recurring/availability fields 應保留；另用 range 內 custom field 確認 Weekly serializer 的已知欄位限制，並如實記錄結果。
- Symbol search：搜尋 `serializeDay|serializeWeek|persistDay|persistWeek|buildPayloadForDate|renderWeekFromMap|allSchedules`。
- 不建議讓單日 write 覆蓋整個 CalendarData；完整寫入時需保留 `_evergreen`。

## Recurring Schedule

使用者介面元素：

- `#bulkScheduleBtn`。
- recurring dialog：`.bulk-dialog-overlay`、`#bulkYear`、`#bulkMonth`、`#bulkStart`、`#bulkEnd`、`#bulkText`。
- weekly/monthly mode radios、`.weekly-days`、`.month-days`。
- `#bulkApplyBtn`、`#bulkResetBtn`、`#bulkDeleteBtn`、`#bulkMessage`、`#bulkGroupList`。
- recurring `.block[data-repeat-group-id]`、`.repeat-badge`、group cards 的 `[data-edit-group]` / `[data-delete-group]`。

對應 modules：

- 主要 module：`Recurring Schedule`
- 相關 modules：`Persistence`、`Shared API / Data`

目前程式入口：

- JS：`recurring-schedule.js`、`weekly-calendar-core.js` 的 recurring block metadata/badge integration。
- 主要 functions：`initRecurringScheduleDialog()`、`openRecurringScheduleDialog()`、`readBulkSpec()`、`applyBulkSchedule()`、`deleteBulkGroup()`、`addGroupToSchedule()`、`removeGroupFromSchedule()`、`ensureFullScheduleLoaded()`、`postFullSchedule()`、`collectRecurringGroups()`、`renderGroupList()`
- State：dialog-local `editingGroupId`、`groups`、`focusGroupId` 與完整 `allSchedules` clone。
- Data：`repeatGroupId`、`repeatScope`、`repeatPattern`、`repeatYearMonth`、`repeatDaysLabel`
- Date rules：weekly choices 用 SUN=0、MON=1…SAT=6；monthly choices只允許當月有效日期。edit 保留 group id，但會重建每個 instance id。
- API：`GET /schedule` 取得完整 CalendarData、`POST /calendar` 完整寫回。
- Preservation：操作前完整 GET、clone、精準移除 group，再完整 POST；一般 task、availability、Evergreen、週外資料與 unknown fields 必須保留。
- Event binding：bulk schedule button、mode/year/month change、apply/reset/delete、group list edit/delete 與 recurring block repeat badge。

驗證方式：

- Browser：blank/invalid form 不可建立；依 weekdays 建立後確認 group card、目前週 blocks、count 與 repeat metadata；整組編輯時確認 group id 保留、舊 instances 移除、新日期／時間／文字生效；整組刪除後目前 DOM 與 API 都沒有該 group。
- Browser：Monthly 與 Daily 應能投影 recurring instance；Weekly reload 後仍一致。
- Data：確認一般 items、availability、Evergreen、週外日期與 unknown fields 未遺失；刪除後允許曾使用 date keys 留下空 arrays。
- Current limitations：apply/delete 後 `#bulkMessage` 會被 `refreshGroups()` 改回「載入完整資料…」；weekly group 切 monthly 時需先檢查／清除預先勾選的 occurrence date numbers。
- Symbol search：搜尋 `initRecurringScheduleDialog|openRecurringScheduleDialog|readBulkSpec|applyBulkSchedule|deleteBulkGroup|addGroupToSchedule|removeGroupFromSchedule|ensureFullScheduleLoaded|postFullSchedule|collectRecurringGroups|repeatGroupId`。
- 不建議以一般 block 刪除流程取代 group deletion。

## Availability

補充驗證契約：`availability-schedule.js` 另包含 `renderAvailabilityManager()`、`createAvailabilityBlockForDay()`、`availabilityItemsForDate()`、`annotateOverlap()`、`normalizePeople()`、`parsePeople()`、`readPeopleRows()`、`applyTimesToBlock()`。資料欄位為 `availabilityFrom`、`availabilityTo`、`availabilityWeekdays`、`availabilityGroupId`、`availabilityPeople[]`；Weekly weekday 使用 MON=0 至 FRI=4，people status 使用 `free` / `not-free`。Manager 顯示前後各週及目前週，editor 會驗證日期、時間、weekday 與可匹配日期。完整 GET/POST 應保留其他資料類型，但 Availability 編輯的已知欄位白名單可能遺失未知 `customField`；草稿取消也可能留下空日期 array，應在 verification status 記錄。

使用者介面元素：

- `.invite-btn`。
- availability blocks。
- availability manager / editor。

對應 modules：

- 主要 module：`Availability`
- 相關 modules：`Persistence`、`Shared API / Data`

目前程式入口：

- JS：`availability-schedule.js`
- 主要 functions：`openAvailabilityManager()`、`openAvailabilityEditor()`、`ensureAvailabilityBlockForDay()`、`removeAvailabilityGroup()`
- Manager display helpers：`renderAvailabilityManager()`、`availabilityItemsForDate()`、`annotateOverlap()`；records 使用 `.availability-record`、`.availability-record-time`、`.availability-record-body`，重疊 lane 的 `--overlap-lane` / `--overlap-lanes` 僅為呈現狀態。
- Display contract：重疊 records 的 X 方向每側保留 1px；hover / focus 會展開目前 record 並提高 z-index；窄欄 people/status 內容可捲動但不顯示 scrollbar。
- Week order：Availability manager 先顯示目前 `viewStart` 的 This week，再顯示 Previous／Next／Two weeks later；各週仍可在 `.availability-weeks` 中捲動查看。
- Data：`type: "availability"`、`availability*` fields、people/status
- API：`GET /calendar`、`POST /calendar`
- Event binding：invite button、availability editor、manager group actions

驗證方式：

- Browser：日期範圍、weekdays、people/status、時間、重疊呈現、整組刪除。
- Data：確認一般排程與 recurring items 不受影響。
- Symbol search：搜尋 `openAvailabilityManager|openAvailabilityEditor|ensureAvailabilityBlockForDay|removeAvailabilityGroup|availability`。
- 不建議讓 availability group 操作直接影響一般 schedule 或 recurring items。

## 使用者與 mode links

使用者介面元素：

- `#show-user-name`、`#textInput`。
- mode links：`#monthModeLink`、`#dayModeLink`。

對應 modules：

- 主要 module：`Account / User`
- 相關 modules：`Topbar / Navigation`、`Persistence`、`Realtime Sync`

目前程式入口：

- JS：`weekly-account.js`、`weekly-persistence.js`、`weekly-account-adapter.js`
- 主要 functions：`initCalendarUserId()`、`updateModeLinks()`、`connectCalendarWS()`
- Storage：`calendar.currentUserId`
- REST header：`X-User-Id`
- WebSocket：`weekly-calendar.html` inline `connectCalendarWS()` 使用相同 userId query 連線

驗證方式：

- Browser：切 user 後週資料與 socket 隔離；切到 Daily/Monthly 保留 userId。
- 注意：Weekly 不解析 URL `userId` query；直接開啟帶 query 的 URL 時確認實際 user label，不可只看 address bar。
- Symbol search：搜尋 `calendar.currentUserId|updateModeLinks|X-User-Id|connectCalendarWS`。

## WebSocket 同步

使用者介面元素：

- 同步 status。
- Weekly blocks 的 realtime reload/render。

對應 modules：

- 主要 module：`Realtime Sync`
- 相關 modules：`Persistence`、`Topbar / Navigation`

目前程式入口：

- JS：`weekly-calendar.html` inline script、`weekly-calendar-core.js`
- 主要 functions：`connectCalendarWS(setupInteract)`、`renderWeekFromMap()`、`setStatus()`
- State：`CALENDAR_CLIENT_ID`、`allSchedules`
- Messages：`calendar-init`、`calendar-updated`

驗證方式：

- Browser/API：同 user 的 Daily/Monthly 寫入後 Weekly 應顯示「已同步 ✓」並重畫；不同 user 不更新。
- Reconnect：close 後預定 3 秒重連，但 callback 沒傳回原本的 `setupInteract`，是已知產品風險。
- Symbol search：搜尋 `connectCalendarWS|CALENDAR_CLIENT_ID|calendar-init|calendar-updated|sourceClientId`。
