# Realtime Sync

## Module Boundary

Primary module 是 `calendar-views-server.js` 的 WebSocket connection registry 與 broadcast pipeline。

| Module | Owns / Writes | Reads / Depends On | Responsibility |
| --- | --- | --- | --- |
| Server realtime | `userSockets` | HTTP write endpoints、`loadUserData()`、`ws` | socket 依 userId 分組、init、broadcast、close cleanup |
| Daily `User / sync` | `ws`、`dayItems`、`evergreenItems`、目前 DOM | `DAILY_CLIENT_ID`、目前日期 | 連線、略過自己更新、normalize 並 render |
| Weekly inline sync | `allSchedules`、目前週 DOM | `CALENDAR_CLIENT_ID`、`setupInteract`、`renderWeekFromMap()` | init/update 後重畫目前週 |
| Monthly persistence/sync | `dayTasks`、日期格 DOM | `CALENDAR_CLIENT_ID`、`rerenderFromDayTasks()` / `rerenderFromMemory()` | init/update 後重畫月曆 tasks |

Server 不擁有任何 mode 的 DOM；client 不擁有 socket group 或 broadcast routing。修改單一 view 的 render 時不要改 server protocol，修改 protocol 時必須驗證三個 client。

## Feature Entry Points

| Area | Entry points |
| --- | --- |
| Server connection | `extractUserIdFromWs()`、`wss.on('connection')`、`userSockets` |
| Server init | `loadUserData()`、`ws.send({ type: 'calendar-init' })` |
| Server update | `/calendar`、`/evergreen`、`/schedule/:date`、range `/schedule` 的 `broadcastToUser()` callers |
| Daily | `DAILY_CLIENT_ID`、`connectWs()`、`normalizeItems()`、`normalizeEvergreenItems()` |
| Weekly | `CALENDAR_CLIENT_ID`、HTML inline `connectCalendarWS(setupInteract)`、`renderWeekFromMap()` |
| Monthly | `CALENDAR_CLIENT_ID`、`connectCalendarWS()`、`rerenderFromDayTasks()`、`rerenderFromMemory()` |
| User routing | WebSocket `/?userId=...`、REST `X-User-Id`、optional `X-Client-Id` |

Realtime Sync 沒有獨立 CSS 或專用 DOM；可見證據是各 mode 的 `#save-status`、task/block render 結果與 console WS messages。不要從 legacy `weekly-calendar-server.js` 或 `monthly-calendar-server.js` 開始處理。

## Server Behavior

`calendar-views-server.js` 的 `userSockets` 以 userId 分組。`broadcastToUser()` 只廣播給相同 userId 的連線。

連線時：

```json
{ "type": "calendar-init", "payload": {} }
```

成功寫入 `/calendar`、`/evergreen` 或 `/schedule` 後：

```json
{
  "type": "calendar-updated",
  "sourceClientId": "optional-client-id",
  "payload": {}
}
```

`payload` 永遠是完整 CalendarData，不是只有變更日期的 patch。

`sourceClientId` 不會讓 server 排除發起 socket。server 仍向同 userId 的所有 open sockets 廣播；各 client 收到後自行比較自己的 client ID 並決定是否略過 render。沒有傳 `X-Client-Id` 時，broadcast 的 `sourceClientId` 是 `null`。

## Client Behavior

- Daily：`connectWs()` 接收 init/update，更新 evergreen 與目前日期；自己的 `DAILY_CLIENT_ID` 會略過；目前沒有 open/close/error handlers 或自動重連。
- Monthly：`connectCalendarWS()` 接收 init/update；自己的 `CALENDAR_CLIENT_ID` 會略過，close 後 3 秒重連。
- Weekly：`weekly-calendar.html` inline `connectCalendarWS(setupInteract)` 接收 init/update；自己的 `CALENDAR_CLIENT_ID` 會略過並重新 render 目前週；頁面初始化也先透過 REST `loadWeek()` 載入。

### Reconnect Matrix

| Mode | Reconnect | Known behavior |
| --- | --- | --- |
| Daily | No | 網路斷線後不會自行恢復；切 user 時 `connectWs()` 會關舊 socket 再建新 socket |
| Monthly | 3 seconds | callback 重新呼叫 `connectCalendarWS()`，不需要額外 render dependency |
| Weekly | 3 seconds intended | close callback 使用 `setTimeout(connectCalendarWS, 3000)`，沒有保留原本的 `setupInteract`；重連收到資料後可能以 `undefined` 傳給 render pipeline |

Weekly reconnect 的參數遺失是產品風險，目前只記錄，不在 docs 驗證任務中修改。

## Main Program Roles

| Function / Program | Role |
| --- | --- |
| `extractUserIdFromWs()` | 驗證 query userId 並選擇 socket group |
| `broadcastToUser()` | serialize 一次並傳給同 user 的所有 open sockets |
| `wss.on('connection')` | 登記 socket、傳完整 init payload、close 時清除 group |
| Write endpoint `sourceClientId` handling | 從 `X-Client-Id` 讀取來源並放入 broadcast envelope |
| Daily `connectWs()` | 建 socket、過濾自己 update、取目前日期與 evergreen 後 normalize/render |
| Weekly `connectCalendarWS()` | 建 socket、以完整 payload 替換 `allSchedules` 並重畫目前週 |
| Monthly `connectCalendarWS()` | 建 socket、init 時重讀 REST、update 時以 payload 重畫記憶體 state |
| `renderWeekFromMap()` / `rerenderFromMemory()` | 將完整 CalendarData 投影成各 view DOM |

## Consistency Risks

- server 是 last-write-wins，沒有 revision、ETag 或 conflict resolution。
- `POST /calendar` 覆寫完整 map；兩個 client 同時修改可能互相覆蓋。
- server `userCache` 是 process-local；不可同時啟動多個 process 指向同一 data directory 並期待 cache 一致。
- 修改 user 時應關閉或取代舊 socket，否則可能混入舊帳號事件。
- 沒有 heartbeat、revision、message acknowledgement 或 server replay；短暫斷線期間的更新只能靠 init/REST 重新取得完整資料。
- client 收到 malformed JSON 時只記錄或忽略；server 不接收 client 主動送入的 WebSocket mutation，所有寫入仍走 REST。
- Monthly `rerenderFromMemory()` 只為目前 `dayTasks` 中有資料的日期呼叫 `ensureTaskUI()`；當完整 update 刪除日期或還原成 `{}` 時，既有 `.task-item` 可能留在 DOM，直到 reload 或其他完整重建。

## Verification

用相同 userId 開啟 Daily、Weekly 與 Monthly：在一邊新增或編輯 item，另外兩邊應更新。再以不同 userId 開第二組頁面，確認不會收到第一組資料。

### 2026-07-13 Verification Evidence

- 兩個 `99999` WebSocket clients 連線後都收到 `calendar-init`，初始 payload 相同。
- 以 `X-User-Id: 99999`、`X-Client-Id: realtime-test-a` 寫入 `/schedule/:date` 後，兩個同 user sockets 都收到 `calendar-updated`，並保留相同 `sourceClientId` 與測試 item。
- 一個只讀的不同 user socket 只收到自己的 `calendar-init`，沒有收到 `99999` update。
- 以 `X-Client-Id: realtime-test-restore` 恢復原始資料後，兩個 `99999` sockets 都收到第二次 update；`data/99999.json` 已確認恢復為 `{}`。
- Browser 只讀確認三個 view 均顯示載入成功，Weekly/Monthly console 可見 connection/init；但因 `99999` 不符合前端 8 位規則，畫面實際採用既存的 `00000003`，未用 Browser 完成三 view 的 `99999` DOM 同步。
- 2026-07-13 Shared API/Data 驗證：以有效 8 位帳號 `00000999` 還原 `{}` 時，Monthly 收到 update 並顯示「已同步 ✓」，但舊 `.task-item` 仍留在 DOM；reload 後才正確清空。此為產品問題，尚未修復。
