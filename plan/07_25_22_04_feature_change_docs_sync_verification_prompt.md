# 07_25_22_04 feature_change_docs_sync_verification_prompt

## 使用目的

當需要修改 calendar 專案中的功能時，將本文件交給 LLM。LLM 必須先理解 module ownership、feature entry points 與資料契約，再進行最小範圍修改；完成後同步檢查並更新 `docs/`，避免程式與導航文件脫節。

## 專案範圍

- Daily：`daily-calendar/`，共用 `calendar-views-server.js`。
- Monthly：`monthly-calendar/`，共用 `calendar-views-server.js`。
- Weekly：`weekly-calendar/`，共用 `calendar-views-server.js`。
- 主要文件：`docs/architecture.md`、`docs/feature-map.md`、`docs/data-format.md`、`docs/api.md`、`docs/verification-status.md`。
- 不使用 line number 作為穩定契約；以檔案、DOM selector、API route、state key、function/class symbol 為契約。

## 交給 LLM 的任務模板

```text
請在 calendar-views-v3 中修改以下功能：

功能名稱：<功能名稱>
使用模式：<daily / monthly / weekly / shared>
使用者問題或需求：<描述預期行為>
目前問題證據：<錯誤、重現步驟或 API/Browser 證據>
允許修改範圍：<檔案、module 或明確 symbol>
不可修改範圍：<檔案、module、使用者資料或 API contract>

請依照下列流程完成，並在最後回報證據。
```

## 執行流程

### 1. 判斷 module boundary

先讀取對應的 `docs/modes/<mode>/architecture.md`，確認：

- 功能的 primary module 與 related modules。
- module owns / writes 的 state、DOM 與資料欄位。
- module reads / depends on 的 API、storage、event 與其他 helper。
- 不應從哪些 module 開始修改，以及哪些責任不可越界。

若 architecture 的 ownership 與實際程式不一致，先記錄差異；修改完成後更新 architecture，不要把不確定的推測當成契約。

### 2. 找到 feature entry points

讀取對應的 `docs/modes/<mode>/feature-map.md`，確認：

- 使用者介面元素與 DOM selectors。
- HTML、CSS、JS、state、storage、API、data-format 入口。
- event binding、主要 functions、資料流與驗證方式。
- 不建議從哪裡開始處理。

接著用 `rg` 或 PowerShell `Select-String` 以 symbol、selector、route、state key 搜尋實際程式。不要依賴 line number。

### 3. 閱讀程式並提出最小修改方案

閱讀完整相關 function 與直接呼叫者，整理：

```text
函式 / 程式 | 角色 | 讀取 | 寫入 | 依賴
```

確認修改不會破壞：

- Daily / Monthly / Weekly 共用 API contract。
- 其他 mode 的 projection 與 user isolation。
- recurring、availability、Evergreen、一般 task 的資料欄位。
- WebSocket source client、storage sync 與 persistence debounce。

只實作使用者要求的最小變更。若發現另一個產品問題但不在授權範圍，先記錄，不要順手修復。

### 4. 實作與資料安全

- 修改前保留目前工作樹內容，不得使用 destructive reset 或覆蓋不相關變更。
- 需要寫入資料時只能使用測試 userId `00000999`；不得寫入其他 userId。
- 優先使用可逆、最小資料 fixture；驗證結束後將測試 user restore 為 `{}` 或原始 snapshot。
- 不改變既有 API request / response 形狀，除非需求明確要求且同步更新 `docs/api.md` 與 `docs/data-format.md`。

### 5. 驗證修改

依風險選擇下列檢查：

```text
1. Select-String / rg：修改後 symbol、selector、route 與 docs 可互相找到。
2. Browser：只操作指定 mode 與測試 user 00000999，確認 UI、event、state 與錯誤路徑。
3. API：確認 GET/POST request、status、response shape 與 user isolation。
4. Data：確認日期 keys、item fields、group ids、unknown fields、_evergreen 與其他 mode projection。
5. Reload：重新載入頁面或切換 mode，確認 persistence 與 render 不依賴 stale DOM。
6. git diff --check：確認沒有 whitespace 或檔案格式問題。
```

高風險寫入功能必須先做只讀驗證，再用 `00000999` 做最小寫入；刪除、整組操作與 native confirm 必須明確記錄是否真正通過。

### 6. 同步更新 docs

若發現下列任一情況，直接更新對應 docs：

- 新增或變更 module ownership：更新 `architecture.md`。
- 新增 function、selector、state、event 或資料入口：更新 `feature-map.md`。
- 新增或變更欄位、weekday encoding、group metadata 或 serialization：更新 `data-format.md`。
- 新增或變更 endpoint、request / response、錯誤行為：更新 `api.md`。
- 驗證結果、限制、產品問題或未完成路徑：更新 `verification-status.md`。

文件應描述穩定 symbol、責任與契約，不要填入易漂移的 line number。若只是內部實作微調且 entry point、ownership 與 contract 未變，可不更新導航文件，但要在回報中說明判斷。

### 7. 最終回報格式

```text
修改結果：Done / Partial / Blocked

修改檔案：
- <absolute path>

Module boundary：
- Primary module：
- Related modules：
- Owns / writes：
- Reads / depends on：

驗證證據：
- Select-String / rg：
- Browser：
- API：
- Data / reload / cross-mode：

主要 functions：
函式 / 程式 | 簡短角色

Docs 更新：
- architecture：
- feature-map：
- data-format：
- api：
- verification-status：

產品問題（只記錄，未修復）：
- <問題與重現證據>

尚未驗證或被阻擋：
- <項目與原因>

測試資料清理：
- `00000999` restore 結果：
```

## LLM 執行限制

- 只修改使用者授權的功能與 docs；不得擴大成重構或順手修正其他產品問題。
- 不使用其他使用者資料做寫入驗證。
- 不把 `verification-status.md` 的歷史紀錄混入 architecture 或 feature-map。
- 不以 line number 作為穩定引用。
- 若 Browser、API、native dialog 或外部服務阻擋驗證，標記為 Partial/Blocked 並保留可重現證據。
