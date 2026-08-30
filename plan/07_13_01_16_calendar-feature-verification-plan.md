# 07_13_01_16 calendar_feature_verification_plan

## 文件用途

本文件用來指導 LLM 逐一驗證 Calendar Views 專案的使用者功能。每次任務原則上只驗證一個 feature，完成文件、程式 symbol、Browser、API 與資料的一致性檢查，再更新 `docs/verification-status.md`。

計畫文件的命名規則已獨立放在：

```text
plan/db_naming.md
```

建立任何新計畫前，必須先讀該文件。本文件只負責 Calendar Views 的功能驗證流程，不再同時維護命名規則。

## 驗證完成條件

每個 feature 必須依序確認：

1. `architecture.md` 能判斷 module 邊界。
2. `feature-map.md` 能找到 HTML、CSS、JavaScript、state、API 與 data 入口。
3. `rg` 或 PowerShell `Select-String` 搜尋結果與 docs 一致。
4. Browser、API 與 data 操作符合該 feature 的風險等級並且結果正常。
5. 讀完相關程式後沒有明顯依賴或 helper 遺漏。
6. 發現 docs 缺漏時已更新對應文件。
7. `docs/verification-status.md` 已記錄驗證狀態與證據。

不要因為靜態閱讀看起來正確就標記為 `Done`。必要的實際操作尚未完成時，應標記為 `Partial` 或 `Blocked`。

## 驗證分類原則

驗證清單以各 mode 的 `architecture.md` 分類為主。`Module Areas` 用來決定驗證工作的主要歸屬；`feature-map.md` 的 user-facing features 則是該 module area 底下的實際驗證案例。

因此兩份文件的用途是：

```text
architecture.md / Module Areas
    -> 我現在在驗證哪一類程式責任

feature-map.md / Features
    -> 使用者實際操作什麼，以及要檢查哪些 DOM、function、API 和 data
```

一個 Module Area 可以包含多個 feature；一個 feature 也可能需要驗證其他 Related Modules，但只指定一個 Primary Module。若兩者分類對不上，先以 architecture 的 ownership 決定 Primary Module，再補正 feature-map 的 module mapping。

## 驗證順序

### 第一階段：共用邊界

1. Account / User：使用者切換、mode links、REST user header、WebSocket user query。
2. Realtime Sync：WebSocket 初始載入、更新廣播與跨 view 同步。
3. Shared API / Data：只讀確認 `/calendar`、`/schedule`、`/evergreen` 與 JSON schema。

### 第二階段：Daily Module Areas

以下順序直接對齊 `docs/modes/daily/architecture.md` 的 `Module Areas`：

1. **Bootstrap / events**
   - 驗證 `init()`、`bindEvents()`、`els` 與主要 DOM/event bindings。
   - 包含日期選擇與導覽的 UI trigger。
2. **Timed tasks**
   - 驗證新增、顯示、編輯、刪除 timed task。
   - 驗證完成狀態與 All/Complete/Incomplete 篩選。
3. **Ordering**
   - 驗證 edit mode、pointer drag、排序與連續一小時時段重排。
   - 驗證整日刪除的確認與 userId 保護。
4. **Evergreen**
   - 驗證 long-term item 新增、編輯、排序、狀態、封存及排入今日。
5. **Persistence**
   - 驗證 `/schedule`、`/schedule/:date`、`/evergreen` 的載入與寫入。
   - 驗證重新整理及跨 mode 的持久化結果。
6. **Normalize**
   - 驗證缺少 optional fields、舊資料、錯誤值與排序 fallback。
   - 確認 normalize 後沒有遺失需要保留的資料欄位。
7. **User / sync**
   - 驗證使用者切換、mode links、localStorage 與 WebSocket 更新。

### 第三階段：Monthly Modules

1. Calendar Renderer：月曆產生、月份切換、跨年與日期 cells。
2. Task List：日期格 task list、新增、編輯、刪除與排序。
3. Day Panel：單日 panel、時間編輯與跨日期移動。
4. Persistence / Sync：完整 CalendarData 寫入、WebSocket 與 user 切換。

### 第四階段：Weekly Modules

1. Topbar / Navigation：週載入、上一週、下一週與日期欄。
2. Block Creation：建立 schedule block 與 ghost lifecycle。
3. Drag / Resize：拖曳、跨日、吸附、縮放與時間編輯。
4. Persistence：單日與整週 serialize/write/reload。
5. Recurring Schedule：建立、編輯與刪除重複排程 group。
6. Availability：日期範圍、people、overlap、manager 與 group deletion。

## 單一 Feature 驗證流程

### 第 1 步：判斷 module 邊界

先讀：

- `docs/architecture.md`
- `docs/modes/<mode>/architecture.md`

確認並記錄：

- Primary Module。
- Related Modules。
- module responsibility。
- owns / writes 的 state。
- reads / depends on 的內容。
- 預設不應修改的區域。

### 第 2 步：找到 feature entry points

讀對應的 `docs/modes/<mode>/feature-map.md`，確認是否包含：

- 使用者介面元素。
- Primary Module 與 Related Modules。
- HTML、CSS、DOM entry points。
- JavaScript functions 與 event bindings。
- state、storage、API 與 data-format 入口。
- 驗證方式。
- 不建議從哪個區域開始修改。

如果 feature 涉及共用契約，再讀：

- `docs/api.md`
- `docs/data-format.md`
- `docs/shared/account-and-user.md`
- `docs/shared/realtime-sync.md`

### 第 3 步：搜尋 symbols

優先使用 `rg`：

```powershell
rg -n "domId|functionName|stateName|apiRoute" daily-calendar monthly-calendar weekly-calendar docs
```

也可以使用 PowerShell：

```powershell
Select-String -Path .\path\to\file.js -Pattern 'domId|functionName|stateName|apiRoute'
```

判讀方式：

- docs 有但程式沒有：docs 可能過時。
- 程式有重要 entry/helper 但 docs 沒有：feature map 可能缺漏。
- DOM id 與 selector 不一致：記錄為產品問題。
- API caller 與 `api.md` 不一致：補 API 文件。
- 只有行號改變但 symbol 仍一致：不需更新 docs。

### 第 4 步：Browser、API 與 data 驗證

低風險功能可以直接操作，例如切日期、切週、切月、打開 dialog 或切換 view。

高風險功能先做只讀驗證：

- API GET。
- DOM state inspection。
- 讀取 `data/{userId}.json`。
- 打開操作介面但暫不新增、刪除或套用。

需要寫資料時使用專用測試帳號：

```text
00000999
```

寫入前先取得該測試帳號的完整資料，記錄是否需要在驗證後還原。不可使用或改動其他使用者資料。

只讀 API 範例：

```powershell
$headers = @{ 'X-User-Id' = '00000999' }

Invoke-RestMethod `
  -Uri 'http://localhost:3011/schedule?from=2026-07-13&to=2026-07-13' `
  -Headers $headers
```

```powershell
Invoke-RestMethod `
  -Uri 'http://localhost:3011/calendar' `
  -Headers $headers
```

跨 mode 的寫入驗證應包含：

```text
來源 mode 寫入
    -> 其他 mode 顯示相同資料
    -> 重新整理後資料仍存在
    -> data/00000999.json 與預期一致
```

### 第 5 步：整理程式角色

讀完主要程式後整理：

| 函式 / 程式 | 簡短描述 |
| --- | --- |
| `functionName()` | 一句話說明它在此 feature 中的角色 |

描述只需讓下一位維護者知道入口與責任，不需逐行重述實作。

### 第 6 步：更新 docs

下列情況要更新 docs：

- feature map 漏掉重要 helper 或 event binding。
- 缺少 server/API 或 data-format 入口。
- architecture 的 ownership 或 dependency 不正確。
- data format 漏掉欄位、default 或 compatibility 行為。
- API 漏掉 endpoint、caller、request 或 response 行為。
- 實際驗證方式與文件不同。

下列情況通常不需更新：

- function 內部小改且 entry point 沒變。
- 純文字或樣式微調。
- line number 漂移但 symbol 與責任不變。

### 第 7 步：更新驗證狀態

每次驗證完成後更新 `docs/verification-status.md`，欄位至少包含：

```text
Feature
Primary Module
Related Modules
Status
Last Verified
Browser/API
Docs Updated
Notes
```

允許狀態：

- `Not Started`
- `In Progress`
- `Done`
- `Partial`
- `Needs Docs Update`
- `Blocked`

驗證狀態不要寫進 architecture 或 feature map，避免導航文件混入歷史紀錄。

## 建議的 verification-status.md 結構

```md
# Feature Verification Status

| Feature | Primary Module | Related Modules | Status | Last Verified | Browser/API | Docs Updated | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Daily：日期選擇與導覽 | Daily timed-task view | Shared API | Not Started | — | — | No | — |
```

`Done` 表示文件、symbols、實際操作與必要的跨 mode 影響都已驗證。只完成靜態閱讀或部分 Browser/API 驗證時，使用 `Partial`。

## 可直接交給 LLM 的單一功能任務

```text
請依照 plan/07_13_01_16_calendar-feature-verification-plan.md，驗證「<Mode：Feature Name>」。

一次只處理這個 feature，依序完成 module boundary、feature entry points、symbol 搜尋、程式閱讀、Browser/API/data 驗證與 docs 檢查。

需要寫資料時只能使用測試 userId 00000999。不要修改其他使用者資料。

發現 docs 缺漏時直接更新對應 docs。不要使用 line number 作為穩定契約。

最後更新 docs/verification-status.md，並回報：
- 驗證結果與證據
- Browser/API/data checks
- 主要 functions 的簡短角色
- 文件缺漏與更新內容
- 尚未驗證或被阻擋的部分

這次任務只允許驗證與更新 docs；發現產品程式問題時先記錄，不要直接修復。
```

## 執行原則

```text
一個 LLM 任務
    = 一個 feature
    + 一次文件檢查
    + 一次 Browser/API/data 驗證
    + 一筆 verification-status 更新
```

建議第一個任務從「Daily：日期選擇與導覽」開始。它是低風險功能，可以先確認整套驗證流程是否適合目前專案。
