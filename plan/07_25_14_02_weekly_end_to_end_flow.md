# 07_25_14_02 weekly_end_to_end_flow

## 使用目的

本文件依 `End_to_end_flow_analysis_prompt.md` 的格式，整理 `weekly-calendar/` 目前存在的完整功能流程。重點是追蹤使用者動作從 UI entry、browser controller、API/storage、validation 到結果回傳。

## 掃描範圍

- Entry：`weekly-calendar/weekly-calendar.html`
- Controllers：`weekly-navigation.js`、`weekly-block-creation.js`、`weekly-block-interaction.js`、`weekly-calendar-core.js`、`weekly-persistence.js`、`recurring-schedule.js`、`availability-schedule.js`、`weekly-account-adapter.js`
- Shared API：`calendar-views-server.js`
- Docs：`docs/modes/weekly/architecture.md`、`docs/modes/weekly/feature-map.md`、`docs/api.md`、`docs/data-format.md`
- Storage：`data/{userId}.json`、`localStorage["calendar.currentUserId"]`

## 1. Weekly Load And Navigation

這條 path 負責載入目前週、切換上一週或下一週，並以七日範圍重新取得與建立 Weekly 欄位資料。

### Static UI

`#btnPrevWeek`、`#btnNextWeek`、`#weekRange`、`#topbar` 與 `#content` 組成週視圖。

### Browser controller

`DOMContentLoaded` 初始化 `viewStart`，呼叫 `initTopbarRulerAndDays()`、`loadWeek()`、`updateWeekRangeLabel()`。

### UI server

`loadWeek()` 呼叫 `GET /schedule?from={monday}&to={sunday}` 讀目前週。

### Core logic

`renderWeekFromMap()` 將 `allSchedules` 投影為七欄 `.schedule-block`，`createBlockElement()` 建立 block DOM。

### Storage

只讀 `data/{userId}.json` 的週 range；`viewStart` 只存在 runtime。

### Validation / Result

驗證跨月/跨年、七日欄日期、range label 與 blocks 都對應同一週。

主要 symbols：`#btnPrevWeek`、`#btnNextWeek`、`viewStart`、`initTopbarRulerAndDays()`、`loadWeek()`、`renderWeekFromMap()`

## 2. Weekly Block Creation

這條 path 負責在指定日期與時間建立 schedule block，處理 ghost block 預覽後完成正式儲存。

### Static UI

使用者在空白時間格 pointer drag，產生 ghost，再建立 `.schedule-block`。

### Browser controller

`initCreateGhostOrBlock(setupInteract)` 綁定 day column，完成 drag 後呼叫 `createBlockElement()`。

### UI server

新 block 建立後呼叫 `persistDay(dayIndex)`，寫入 `POST /schedule/:date`。

### Core logic

`updateBlockTime()` 依 block top/height 更新 `start_time` / `end_time`，`setupInteract()` 啟用拖曳縮放。

### Storage

只寫被新增的日期 key，保留其他日期與 `_evergreen`。

### Validation / Result

取消 drag 不留下 ghost；新增後 reload 仍存在，Daily/Monthly 同日可見。

主要 symbols：`initCreateGhostOrBlock()`、`createBlockElement()`、`updateBlockTime()`、`persistDay()`

## 3. Weekly Drag / Resize / Time Edit

這條 path 負責拖曳、跨日移動、吸附與縮放 block，並將調整後的時間寫回資料。

### Static UI

使用者拖曳 `.schedule-block`、跨日移動、縮放高度或開啟時間 dialog。

### Browser controller

`initInteractForBlocks()` 套用 Interact.js；`createDragOptions()` 與 `createResizeOptions()` 控制拖曳/縮放。

### UI server

一般日期內操作呼叫 `persistDay()`；跨日情境可能呼叫 `persistWeek()` 保存來源與目標。

### Core logic

`updateBlockTime()` 更新時間；`serializeDay()` 將 DOM block 轉回 ScheduleItem array。

### Storage

寫入受影響日期；`persistWeek()` 使用 `POST /schedule?from&to` 批次保存目前週。

### Validation / Result

驗證吸附、邊界、最短高度、跨日後來源不殘留 duplicate；失敗時沒有完整 rollback。

主要 symbols：`initInteractForBlocks()`、`createDragOptions()`、`createResizeOptions()`、`updateBlockTime()`、`serializeDay()`、`persistWeek()`

## 4. Weekly Text Edit And Delete Block

這條 path 負責編輯 block 文字或刪除 block，完成確認後更新目前週的顯示與資料。

### Static UI

`.schedule-block` 內文字、action menu、delete button 可編輯或刪除一般 block。

### Browser controller

`createBlockElement()` 建立 block 內部事件；文字保存後更新 DOM/data，刪除後移除 block。

### UI server

呼叫 `persistDay(dIdx)` 寫回該日 array。

### Core logic

`serializeDay()` 由目前 DOM 決定該日期最新資料；缺少時間的 item 會被 render 流程警告或略過。

### Storage

只替換指定日期 key。

### Validation / Result

reload 後文字與刪除狀態一致；不影響 recurring/availability group 的整組資料。

主要 symbols：`createBlockElement()`、`serializeDay()`、`persistDay()`、`.schedule-block`

## 5. Weekly Full Persistence

這條 path 負責序列化單日與整週 schedule，寫入 server 後重新載入以確認內容一致。

### Static UI

使用者通常不直接觸發 full persistence；它由拖曳跨日或批次操作間接觸發。

### Browser controller

`serializeWeek()` 掃描七欄 DOM，`persistWeek()` 建立 range payload。

### UI server

`POST /schedule?from={monday}&to={sunday}` 只套用 body 中位於 range 內的日期 keys。

### Core logic

`buildPayloadForDate()` 與 `serializeDay()` 負責把 DOM/cache 轉為 ScheduleItem array。

### Storage

寫入 `data/{userId}.json` 的目前週日期 keys，保留 range 外日期與 `_evergreen`。

### Validation / Result

七天各有 block 時批次保存後 reload 一致；range 外資料不可被刪除。

主要 symbols：`serializeWeek()`、`persistWeek()`、`buildPayloadForDate()`、`POST /schedule?from&to`

## 6. Weekly Recurring Schedule

這條 path 負責建立、編輯與刪除 recurring schedule group，並管理其跨日期產生的 blocks。

### Static UI

`#bulkScheduleBtn` 開啟 recurring dialog，可新增、編輯或刪除重複排程 group。

### Browser controller

`initRecurringScheduleDialog()` 綁定按鈕；`applyBulkSchedule()` 新增/修改；`deleteBulkGroup()` 刪除整組。

### UI server

Recurring 先 `GET /schedule` 或完整資料，再用 `POST /calendar` 寫回完整 CalendarData。

### Core logic

`collectRecurringGroups()` 依 `repeatGroupId` 彙整 group；修改時以 group id 過濾舊資料並重建。

### Storage

完整覆寫 `data/{userId}.json`；必須保留一般 items、availability 與 `_evergreen`。

### Validation / Result

依星期/日期建立、修改、刪除整組後，當週 render 與完整 JSON 都一致。

主要 symbols：`#bulkScheduleBtn`、`initRecurringScheduleDialog()`、`applyBulkSchedule()`、`deleteBulkGroup()`、`collectRecurringGroups()`、`repeatGroupId`

## 7. Weekly Availability

這條 path 負責管理可用時段的日期範圍、people 與 overlap 規則，並同步相關 calendar blocks。

### Static UI

`.invite-btn` 開啟 availability manager/editor，availability block 顯示人員與可用狀態。

### Browser controller

`openAvailabilityManager()` 顯示管理面板，`openAvailabilityEditor()` 編輯設定，`ensureAvailabilityBlockForDay()` 建立符合日期條件的 block。

### UI server

Availability 會讀完整 CalendarData，修改 group items 後用 `POST /calendar` 或相關保存流程寫回。

### Core logic

`removeAvailabilityGroup()` / `removeAvailabilityGroupFromSchedule()` 依 `availabilityGroupId` 移除舊 group，再重建符合 range/weekdays 的 items。

### Storage

完整或週範圍寫入 `type: "availability"` items，包含 `availabilityFrom`、`availabilityTo`、`availabilityWeekdays`、`availabilityPeople`。

### Validation / Result

驗證日期範圍、weekdays、people/status、overlap 呈現與 group deletion；一般 schedule 不應受影響。

主要 symbols：`.invite-btn`、`openAvailabilityManager()`、`openAvailabilityEditor()`、`ensureAvailabilityBlockForDay()`、`removeAvailabilityGroup()`、`availabilityGroupId`

## 8. Weekly User Switch And Mode Links

這條 path 負責切換 Weekly 的目前 user，重新載入週資料，並維持三種 mode 的導覽連結。

### Static UI

`#show-user-name` 開啟 login panel，`#textInput` 輸入 userId，`#monthModeLink` / `#dayModeLink` 切換 mode。

### Browser controller

`shared/user-account/account-storage.js` 與 `weekly-account-adapter.js` 管理 user bridge，`weekly-persistence.js` 的 `updateModeLinks()` 更新連結。

### UI server

REST 使用 `X-User-Id` header，WebSocket 使用 `?userId=...`。

### Core logic

Weekly 不解析 URL `userId` query；啟動時使用 `calendar.currentUserId`，無有效值 fallback 到 `00000003`。

### Storage

寫入 `localStorage["calendar.currentUserId"]`；server 依 `data/{userId}.json` 隔離。

### Validation / Result

切 user 後週資料與 socket 隔離；mode links 帶正確 userId。直接帶 query 開 URL 時需看 user label。

主要 symbols：`#show-user-name`、`#textInput`、`#monthModeLink`、`#dayModeLink`、`calendar.currentUserId`

## 9. Weekly WebSocket Sync

這條 path 負責接收同一 user 的即時 schedule 更新，重畫目前週 blocks 並更新同步狀態。

### Static UI

同步狀態顯示於 `#save-status`，資料結果反映在目前週 blocks。

### Browser controller

`connectCalendarWS(setupInteract)` 接收 `calendar-init` / `calendar-updated`，替換 `allSchedules` 後呼叫 `renderWeekFromMap()`。

### UI server

共用 WebSocket server 依 userId broadcast 完整 CalendarData；REST 寫入後會送 `calendar-updated`。

### Core logic

Weekly 比對 `sourceClientId` 跳過自己的更新；重畫後需重新套用 `setupInteract`。

### Storage

WebSocket 不寫資料；它只反映 server payload。

### Validation / Result

同 user 的 Daily/Monthly 寫入後 Weekly 應更新；不同 user 不更新。重連 callback 沒傳回原本 `setupInteract` 是已知風險。

主要 symbols：`connectCalendarWS()`、`CALENDAR_CLIENT_ID`、`allSchedules`、`renderWeekFromMap()`、`calendar-updated`

## Shared Capability Modules

| Module | 依賴它的 Flows |
| --- | --- |
| Topbar / Navigation | 1、8-9 |
| Block Creation | 2 |
| Drag / Resize | 3 |
| Persistence | 1-7、9 |
| Recurring Schedule | 6 |
| Availability | 7 |
| `calendar.currentUserId` | 8-9 |
| `/schedule` API | 1-5 |
| `/calendar` API | 6-7 |
| WebSocket sync | 9 |

## Persistence Locations

- `data/{userId}.json`：日期 keys、recurring fields、availability fields、`_evergreen`。
- `localStorage["calendar.currentUserId"]`：目前 user。
- Runtime state：`viewStart`、`allSchedules`、`dayCols` / `getDayCols()`、DOM `.schedule-block`。

## 缺少測試或待確認

- Weekly WebSocket reconnect 會遺失 `setupInteract` callback，需驗證重連後 block 是否仍可互動。
- `serializeDay()` / `buildPayloadForDate()` 對未知欄位的保留能力有限。
- Recurring 與 availability 都會完整寫回資料，需用 fixture 驗證 `_evergreen` 與其他 mode fields 不遺失。
