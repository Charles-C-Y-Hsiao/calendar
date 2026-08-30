# 07_25_15_53 end_to_end_prompt_enhancement

## 使用目的

本文件將原始 `End_to_end_flow_analysis_prompt.md` 與這次 Calendar Views 專案整理後得到的補強建議整合在一起。

這份文件可以直接交給 LLM 使用，用來讀取一個專案並產出完整功能流程文件。重點是追蹤每個使用者或系統動作從 entry point、controller、API/storage、validation 到結果回傳的完整路徑，而不是只依檔案名稱或函式名稱整理。

## 整合後完整提詞

```text
請讀取整個專案，整理目前存在的完整功能流程（End-to-End Action Flows）。

這次只分析與整理，不修改產品程式碼。

開始前請先：

1. 讀取 AGENTS.md、README、docs、package.json、設定檔及其他專案規則。
2. 如果專案有 plan/db_naming.md、docs naming rule 或類似文件，建立輸出檔前必須先讀取並遵守命名規則。
3. 掃描檔案結構。
4. 找出 UI、Browser、Server、CLI、API、use case、core、storage、validation、background job 等主要 modules。
5. 如果已有 docs/architecture.md、docs/**/architecture.md 或 feature-map.md，請沿用既有 module 名稱；若發現分類不一致，請在輸出中標示差異，不要自行創造第三套 module taxonomy。
6. 使用 symbol 搜尋確認實際 function、class、route、DOM id、state key、storage key 與資料檔案。
7. 不要只根據檔名推測；找不到實作時請標示「待確認」。

「完整流程」是指：

使用者或系統觸發動作
→ UI／CLI entry
→ controller／handler
→ API／server
→ use case
→ core logic
→ storage／external service
→ validation
→ 結果回傳

請找出專案中所有能形成完整流程的動作，包括但不限於：

- UI 按鈕或表單操作
- 查詢、搜尋、建立、修改、刪除
- import / export
- upload / download
- API request
- CLI command
- background job
- authentication
- persistence
- validation / lint
- dashboard / reporting
- application launch
- 文件或檔案讀取
- realtime sync / WebSocket / subscription
- user / account / workspace 切換

請區分：

- Feature module：代表使用者可感知的功能。
- Shared capability module：被多個功能共用的能力。
- Storage：實際讀寫的檔案、資料庫、localStorage、cache、table 或 external service。
- Validation：流程最後如何確認成功或檢查錯誤。
- Risk boundary：完整覆寫、批次寫入、跨資料區域寫入、沒有 rollback 的流程。

如果專案明顯有多個 mode、app、subsystem 或大型 feature area，請優先拆成多份文件，而不是全部塞進一份。每份文件只整理該 subsystem 的 flows，shared modules 另外在各文件中標示依賴。

每條流程請給一個簡短英文名稱，並依實際經過順序整理。

輸出格式如下：

## 1. Flow Name

### Static UI

接收什麼輸入、提供什麼操作，以及會把資料交給哪一層。若沒有 UI，請省略本段，不要硬加。

### Browser controller

使用哪些主要函式收集資料、建立 payload、呼叫哪個 API。若是非 browser 專案，請省略本段。

### UI server

接收哪個 route、由哪個 handler 處理，以及交給哪個下游 module。若沒有 UI server，請省略本段。

### CLI dispatcher

如果有 CLI，說明接收什麼 command，以及分派給哪個 use case。若沒有 CLI，請省略本段。

### Use case

說明如何協調主要業務流程，以及呼叫哪些 core functions。若專案沒有明確 use case layer，請省略本段。

### Core logic

說明主要資料處理、驗證、轉換、排序、同步、計算或狀態更新。

### Storage

說明會讀寫哪些資料、檔案、storage key、cache、table 或 external service。

本段必須標明寫入類型：

- 只讀。
- 單筆或單日局部寫入。
- range patch。
- append。
- 完整覆寫。
- 僅 runtime state，不持久化。

若是完整覆寫，必須標明可能影響的其他資料區域。

### Validation / Result

說明如何驗證流程，以及結果如何回傳。

每條會寫資料的 flow 都必須說明失敗時是否 rollback；若程式沒有明確 rollback，請標示「沒有完整 rollback」。

### Main symbols

列出主要 function、class、route、DOM id、state key、storage key 與資料檔案。不要複製大量 implementation details。

規則：

1. 不存在的層不要硬加。
2. 每一層只使用一段簡短說明，每段不超過 100 個中文字。
3. 函式、class、route、DOM id、state key、storage key 與 file path 保留原文。
4. 說明文字使用繁體中文。
5. 每個流程列出主要 symbols，不要複製大量 implementation details。
6. 清楚說明哪些步驟會寫入資料，哪些步驟只讀取。
7. 如果流程包含 preview，指出 preview 與正式寫入的界線。
8. 如果流程失敗後不會 rollback，必須明確標示。
9. 如果多個功能共用同一個 module，列出影響到哪些流程。
10. 最後提供一份「Module → 依賴它的 Flows」對照表。
11. 使用搜尋工具驗證所有列出的 symbols 確實存在。
12. Action flow 文件只記錄目前功能路徑與驗證方法，不記錄歷史驗證狀態。驗證狀態應放在 verification-status.md 或獨立 status 文件。
13. 不要使用 line number 作為穩定契約；使用 symbol、route、DOM id、state key、file path。
14. 若發現 docs 與程式不一致，請在輸出中標示「Docs mismatch」與實際證據；除非使用者要求，先不要直接修改產品程式。

完成時請回報：

- 找到幾條完整流程。
- 每條流程的名稱。
- 主要 shared modules。
- 主要 persistence locations。
- 哪些流程缺少測試或驗證。
- 哪些部分仍屬於待確認。
- 可供下一次 LLM 驗證使用的 feature 名稱清單，名稱應和文件中的 flow 標題一致。

如果需要同時建立 Markdown 文件：

1. 請依專案命名規則建立文件；若沒有命名規則，預設保存為 readme/PROJECT_ACTION_FLOWS.md。
2. 文件需要使用標準 Markdown。
3. `#` 作為文件標題。
4. `## 1. Flow Name` 作為第一層流程。
5. `### Module Name` 作為流程內部層級。
6. 導航目錄只需要顯示 `##` 流程，不要顯示 `###` modules。
7. 若拆成多份文件，每份文件都要有自己的「Module → 依賴它的 Flows」與 persistence locations。

如果專案已有 Markdown_Viewer.html：

1. 確認它能讀取輸出的 action flow Markdown。
2. Server 模式可透過 Markdown_Viewer.html?doc=... 開啟。
3. 靜態 file:// 模式使用 FileReader 和檔案選擇器。
4. 左側 TOC 只顯示 `## 1.`、`## 2.` 等完整流程。
5. `###` module 標題保留在正文，但不要加入 TOC。
6. 不要破壞原本的 Markdown 或 Mermaid rendering。

核心要求：

請追蹤每個使用者動作從 entry point 到 storage、validation 與結果回傳的完整路徑，不要只依檔案名稱整理。
```

## 建議輸出文件骨架

若 LLM 要把分析結果保存為 Markdown，建議使用以下骨架：

```md
# Project Action Flows

## 使用目的

本文件整理目前專案存在的完整功能流程，供後續功能驗證、修改定位與文件維護使用。

## 掃描範圍

- Entry files：
- Controllers：
- Server / API：
- Storage：
- Docs：

## 1. Flow Name

### Static UI

...

### Browser controller

...

### UI server

...

### Core logic

...

### Storage

...

### Validation / Result

...

### Main symbols

- ...

## Shared Capability Modules

| Module | 依賴它的 Flows |
| --- | --- |
| ... | ... |

## Persistence Locations

- ...

## 缺少測試或待確認

- ...

## 可供下一次驗證的 Feature 名稱

- ...
```

## 本次補強摘要

這次相較於原始 `End_to_end_flow_analysis_prompt.md`，已整合以下補強：

1. 建立輸出檔前先讀 `plan/db_naming.md` 或類似命名規則。
2. 專案有多個 mode / subsystem 時，優先拆成多份文件。
3. module 名稱要對齊既有 `architecture.md` / `feature-map.md`。
4. `Storage` 段落必須標示寫入類型。
5. 寫資料的 flow 必須說明失敗時是否 rollback。
6. flow 文件不記錄歷史驗證狀態。
7. 最後列出可供下一次 LLM 驗證使用的 feature 名稱。
8. 不使用 line number 作為穩定契約。
9. docs 與程式不一致時，先標示 mismatch 與證據。

## 優先導入建議

若只想先改最重要的部分，建議優先導入：

1. subsystem 可拆多份文件。
2. module taxonomy 對齊既有 docs。
3. Storage 寫入類型與完整覆寫風險。

這三點最能降低大型專案文件變成「看似完整但不好用」的機率。
