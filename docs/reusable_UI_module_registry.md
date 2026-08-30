# reusable_UI_module_registry

本文件是可跨專案流通的 UI 模組登錄表。登錄內容以實際存在於 `shared/` 的檔案與 standalone preview 為準；本專案未直接整合的模組，不視為 Daily、Monthly、Weekly 的正式功能。

## Registry 收錄規格

每個收錄模組必須同時具備 `registry_id` 與 `module_id`。標題格式固定為：

```markdown
<!-- registry_id: <5碼ID>; module_id: <module_id>; unique: true -->
## <5碼 registry_id>：<module_id>
```

目前正式記錄的標題範例是 `## B7N4Q：tabbed_workspace`；不得另外複製一筆相同 ID 作為範例。

收錄與調用規則：

1. `registry_id` 必須是剛好 5 碼的大寫英文字母或數字，符合 `^[A-Z0-9]{5}$`。
2. `registry_id` 在本文件中必須唯一；新增前先搜尋整份 registry 確認沒有重複。
3. `registry_id` 建立後視為穩定識別碼；模組改名、搬移或版本更新時不得變更，也不可重新分配給其他模組。
4. `module_id` 應與 `shared/<module_id>/`、HTML 的 `data-module`、JavaScript 模組宣告及 CSS scope 一致；若現況不一致，必須標示待修正，不可自行假定一致。
5. 每筆記錄標題前必須放置唯一性註解，且註解、標題與 YAML 的 ID 完全一致。
6. YAML 必須記錄 `registry_id`、`module_id`、`status`、`integration_state`、`callbacks` 與 `global_namespace`。
7. 提示詞可使用 `registry_id` 或 `module_id`，但執行前必須互相核對；核對失敗時先停止修改並回報。

## 給 Codex 的通用套用提示詞

```text
請讀取 docs/reusable_UI_module_registry.md，套用 <registry_id 或 module_id> 模組。

target_project: <目標專案絕對路徑>
target_html: <目標 HTML 檔案絕對路徑>
target_position: <插入位置、selector 或區塊說明>
customize: <none 或需要調整的設定>
callback: <依此模組 registry 定義的 callback 行為；未指定時只接收 payload，不執行業務動作>

套用規則：
1. 先讀取本文件中對應模組的設定、callback 與 Shared files。
2. 若指定的是 `registry_id`，先核對對應的 `module_id`；反之亦然。
3. 讀取 `shared/<module_id>/module.html`、`module.css`、`module.js`，確認實際 DOM、初始化 API 與 selector。
4. 將 HTML 結構放入 `target_html` 的 `target_position`；CSS/JS 從目標專案 `shared/` 載入，不得改成 inline。
5. 依 registry 記錄的初始化函式與 callback 接線，不可一律假定為 `onButtonClick`。
6. 沒有客製需求時使用 default 值；只有名稱、版面或行為需要變更時才追問。
7. 不修改來源模組；來源需要變更時先回報差異並取得明確指示。
8. 驗證初始狀態、點擊、hover、focus-visible、鍵盤操作與 callback payload。
```

最小複製結構：

```text
target-project/
├─ docs/
│  └─ reusable_UI_module_registry.md
└─ shared/
   └─ <module_id>/
      ├─ module.html
      ├─ module.css
      └─ module.js
```

可直接調用：

```text
套用 docs/reusable_UI_module_registry.md 的 <module_id>
```

或：

```text
套用 reusable_UI_module_registry 的 <registry_id>
```

### 跨專案搬移題詞

```text
source_project: <來源專案絕對路徑>
registry_id_or_module_id: <registry_id 或 module_id>
target_project: <目標專案絕對路徑>
target_html: <目標 HTML 絕對路徑>
customize: none
callback: <依 registry 定義的 callback>
```

### 修改範圍限制

- 預設只修改 `target_project` 與 `target_html` 指定的目標專案。
- 不修改本專案既有頁面或三個 mode，除非使用者明確指定。
- 不修改 `shared/<module_id>/` 來源；若來源需要調整，先回報差異並取得明確指示。

## 給 Codex 的直接調用方式

```text
套用 docs/reusable_UI_module_registry.md 的 <registry_id 或 module_id>
target_html: <目標 HTML 路徑>
callback: <callback 行為>
```

套用前應完成：

1. 讀取 registry 對應的 `module.html`、`module.css`、`module.js`。
2. 互相核對 `registry_id`、`module_id`、來源目錄與三件來源檔案；失敗時先停止。
3. 確認目標頁面沒有同名 selector 或 state 衝突。
4. 將 HTML 複製到 `target_html`，並從目標專案 `shared/` 載入 CSS/JS。
5. 保留模組 root、ARIA attributes、keyboard interaction 與 callback payload。
6. 驗證初始狀態、點擊、hover、focus-visible、鍵盤操作、responsive layout 與 console error。
7. 若本專案未直接整合，維持 `Project usage` 的 standalone 狀態，不要為了登錄而修改三個 mode。

## 目前實作對照補充

`shared/user-account/` 已納入本 registry，定位是提供其他專案直接套用的 standalone reusable module；為維持本專案既有功能不變，Daily、Monthly、Weekly 不直接引用它，仍各自維持獨立的 account implementation。

`shared/action-dialogs/` 也已納入本 registry，而且是本專案正在使用的 integrated reusable module。Daily、Monthly、Weekly 均從該目錄載入 `module.css` 與 `module.js`；`module.html` 僅作 standalone preview，不是 calendar mode 的頁面入口。

## 首次產出品質門檻

- standalone `module.html` 必須能以 `file:///` 或本地 server 開啟。
- 宣告可互動的 preview 必須自動初始化；靜態 preview 必須由目標專案呼叫 `create()`。
- HTML、CSS、JS 的 module id、DOM selector、callback 名稱必須一致；若不一致要標示待修正。
- 必須驗證初始狀態、點擊、hover、focus-visible、鍵盤操作與 callback payload。
- 按鈕使用 `type="button"`，並提供適當的 ARIA 語意。
- CSS/JS 必須保留在 `shared/<module_id>/`，不得複製成 inline。

## 共用整合規則

- HTML、CSS 與 JavaScript 維持在對應的 shared/<module_id>/。
- 不修改來源模組功能；套用前核對 
egistry_id、module_id 與 Shared files。

<!-- registry_id: B7N4Q; module_id: tabbed_workspace; unique: true -->
## 模組登錄管理

## B7N4Q：tabbed_workspace

```yaml
registry_id: B7N4Q
module_id: tabbed_workspace
status: standalone-only
integration_state: not-integrated
callbacks:
  - onTabChange
global_namespace: KnowledgeForgeModules.tabbed_workspace
```

**用途**：可切換多個 workspace tabs 的通用 UI 外殼，提供 tab list、panel placeholder 與 tab change callback。

**狀態**：`standalone-only`

**Project usage**：目前沒有被 `daily-calendar/`、`monthly-calendar/` 或 `weekly-calendar/` 的 HTML/JS/CSS 引用；不可視為目前行事曆頁面的正式功能入口。

**Standalone structure**：

```text
shared/tabbed_workspace/
├─ module.html
├─ module.css
└─ module.js
```

**預設行為**：

- 維護 active tab 與對應 panel。
- tab 切換時觸發 `onTabChange` callback。
- 不呼叫 API、不寫入 calendar data、不依賴 Daily/Monthly/Weekly state。

**Callback payload**：

```js
onTabChange({ sheetId, tabElement, sheetElement, moduleId })
```

**Shared files**：

- `shared/tabbed_workspace/module.html`
- `shared/tabbed_workspace/module.css`
- `shared/tabbed_workspace/module.js`

<!-- registry_id: 58321; module_id: user-account; unique: true -->
## 58321：user-account

```yaml
registry_id: 58321
module_id: user-account
status: standalone-only
integration_state: reusable-for-other-projects
callbacks:
  - window.onUserAccountLogin
global_namespace: none
source_directory: shared/user-account
```

用途是 standalone Account / User UI preview。它提供 userId 輸入、8 碼數字驗證、counter、Clear / Log-in、鍵盤與 ARIA 基礎行為；不呼叫 Calendar API，也不依賴 Daily / Monthly / Weekly state。

**Standalone structure**：

```text
shared/user-account/
├─ module.html
├─ module.css
└─ module.js
```

**預設互動**：

- `.account-user-trigger` 點擊後，`#userDialog` 出現在按鈕下方；靠近視窗底部時會在可視範圍內調整。
- `#textInput` 僅接受 0–9 數字，輸入長度上限為 8；格式錯誤會顯示 `#userAccountWarning`。
- 警告框與 `#userDialog` 的水平、垂直中心線對齊，會重疊覆蓋在登入框上，不移動 `#userDialog`。
- `Clear` 清空輸入並重新聚焦；Close 可關閉登入框或警告框。
- `window.onUserAccountLogin(userId)` 是 standalone callback；preview 預設只更新 `.btn-word`，保留右側 user icon。

**DOM contract**：

- Trigger：`#show-user-name.account-user-trigger`、`.btn-word`、`.fa-regular.fa-user`
- Login dialog：`#userDialog`、`#textInput`、`.counter`、`#dialogClose`、`.clear`、`.login`
- Warning dialog：`#userAccountWarning`、`#warningTitle`、`#warningClose`

**Project usage**：本專案目前不直接引用此模組，避免改動 Daily、Monthly、Weekly 的既有登入流程；其他專案可依本 registry 複製並接上 `window.onUserAccountLogin(userId)`。

**Shared files**：

- `shared/user-account/module.html`
- `shared/user-account/module.css`
- `shared/user-account/module.js`

**Registry alignment note**：目前 `module_id: user-account` 已與來源目錄 `shared/user-account/` 一致；其他專案套用時仍應核對目標專案的 module path。

<!-- registry_id: A9D2K; module_id: action-dialogs; unique: true -->
## A9D2K：action-dialogs

```yaml
registry_id: A9D2K
module_id: action-dialogs
status: integrated
integration_state: integrated-daily-monthly-weekly
callbacks: []
global_namespace: window.actionDialogs
source_directory: shared/action-dialogs
```

**用途**：提供跨 mode 共用的 alert 與 confirm 對話框外殼、overlay、按鈕狀態、鍵盤關閉行為及 Promise 結果。模組不讀寫 calendar state、不呼叫 API，業務流程由呼叫端保留。

**Standalone structure**：

```text
shared/action-dialogs/
├─ module.html
├─ module.css
└─ module.js
```

**JavaScript API**：

```js
await window.actionDialogs.alert(message, {
  title,
  okText,
  timeoutMs,
});

const accepted = await window.actionDialogs.confirm({
  title,
  message,
  okText,
  cancelText,
  danger,
  autoConfirm: { enabled, seconds }, // optional; enabled only for the calling dialog
});

window.actionDialogs.removeExisting();
```

**Promise contract**：

- `alert()` 關閉後 resolve `true`。
- `confirm()` 的確認按鈕 resolve `true`；取消按鈕或點擊 overlay resolve `false`。
- `confirm()` 可選擇 `autoConfirm`；啟用時按鈕顯示 `OK (Ns)`，每秒倒數並在 1–5 秒後 resolve `true`。秒數無效時回退為 2 秒並以 `console.warn` 提示；Cancel、overlay click 或 Esc 會取消倒數並 resolve `false`。
- `removeExisting()` 移除現存的共用 action overlay，不觸發 calendar persistence。

**DOM / CSS contract**：

- Overlay：`.action-dialog-overlay`
- Surface：`.action-dialog`、`.action-alert-dialog`、`.action-confirm-dialog`
- Content：`.action-alert-title`、`.action-alert-message`、`.action-alert-actions`
- Buttons：`.action-alert-ok`、`.action-confirm-ok`、`.action-confirm-cancel`、`.is-danger`
- 相容既有 mode shell：`.dt-dialog-overlay`、`.dt-dialog`、`.daily-confirm-overlay`、`.daily-confirm-dialog`

**Project usage**：

- Daily：`daily-calendar/daily-calendar.html` 載入模組；`openDailyConfirmDialog()` 委派至 `window.actionDialogs.confirm()`。僅「Enter edit mode?」從伺服器的 `/runtime-config.js` 讀取 `editModeAutoConfirm`，可在 `calendar-views-server.js` 以 `EDIT_MODE_AUTO_CONFIRM` 與 `EDIT_MODE_AUTO_CONFIRM_SECONDS` 控制；變更後需重啟服務。
- Monthly：`monthly-calendar/monthly-calendar.html` 載入模組；day panel 的驗證提示使用 `window.actionDialogs.alert()`，並共用 `.dt-dialog` shell 樣式。
- Weekly：`weekly-calendar/weekly-calendar.html` 載入模組；Availability、Recurring Schedule、Date/Time 與 core feedback 使用共用 alert / confirm API。

**Standalone preview**：`shared/action-dialogs/module.html` 會自動初始化兩個示範按鈕，可分別檢查 alert 與 confirm；preview 不呼叫 calendar API，也不修改 calendar data。

**Shared files**：

- `shared/action-dialogs/module.html`
- `shared/action-dialogs/module.css`
- `shared/action-dialogs/module.js`

**Registry alignment note**：`module_id: action-dialogs` 與來源目錄、preview 的 `data-module="action-dialogs"`、JavaScript `moduleId` 宣告一致；既有全域 API 名稱維持 `window.actionDialogs`，避免破壞三個 mode 的呼叫端。

## 套用檢查清單

1. 確認調用的 `registry_id` 或 `module_id`，並核對兩者對應關係。
2. 確認 `shared/<module_id>/module.html`、`module.css`、`module.js` 三個檔案都存在。
3. 讀取 registry 設定與 shared 三件檔，確認 root、data attribute、selector、初始化 API、參數與 callback 一致。
4. 確認 CSS 與 JavaScript 從目標專案的 `shared/<module_id>/` 外部載入，不改成 inline，不引用來源專案絕對路徑。
5. 確認模組使用自己的 root、參數、狀態與 callback，不共用其他模組的 state。
6. 確認沒有複製來源專案的帳號資料、API URL、服務設定、PID、log 或其他業務資料。
7. 驗證 standalone 與目標頁的預設內容、初始化、互動、hover、focus-visible、支援的鍵盤操作與 callback payload。
8. 若模組宣告 CDN、npm、字型或其他外部依賴，確認依賴可載入；離線限制必須回報。
9. 確認沒有重複初始化、console error、selector 污染或 CSS/JS 污染其他模組。
10. 套用完成後更新目標專案自己的 registry，並回報實際使用的 `registry_id`、`module_id`、檔案與驗證結果。
專案特別確認：
- `user-account` 的 `module_id` 必須與 `shared/user-account/` 一致。
- 驗證 Font Awesome／Flaticon CDN icon 與離線載入限制。
- `action-dialogs` 必須維持 `window.actionDialogs.alert()`、`confirm()`、`removeExisting()` 相容性，並驗證三個 mode 的外部 CSS/JS 路徑。
## 目前專案對應關鍵字

截至本次更新，`shared/` 的可重用 UI module 包含：

- `tabbed_workspace/`：已登錄，standalone-only，尚未被三種 calendar mode 使用。
- `user-account/`：已登錄，供其他專案套用；本專案刻意不直接引用，各 mode 使用自己的 `*-account.css/js` 以維持既有功能。
- `action-dialogs/`：已登錄且由 Daily、Monthly、Weekly 實際使用；三種 mode 共用 `module.css`、`module.js`，standalone preview 位於 `module.html`。
