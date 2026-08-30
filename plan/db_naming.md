# db_naming

## 使用目的

本文件是 `plan/` 目錄的統一命名依據。LLM 建立任何新計畫文件前，必須先讀本文件並依規則命名。

## 檔案位置

所有計畫文件放在：

```text
plan/
```

## Plan Markdown Viewer

本專案的 `plan/Markdown_Viewer.html` 是 `plan/` 的預設 Markdown 讀取入口。透過專案 server 開啟後：

```text
http://localhost:3011/plan/Markdown_Viewer.html
```

- 預設文件：`db_naming.md`。
- 讀取目錄：Viewer 所在的 `plan/` 目錄（`./`）。
- 指定文件：使用 `?doc=檔名.md`，例如 `Markdown_Viewer.html?doc=07_13_01_16_calendar-feature-verification-plan.md`。
- 新增任何 plan Markdown 後，必須同步加入 `Markdown_Viewer.html` 的 `documents` catalog，讓側欄可以連結開啟。
- Viewer 連結使用相對 URL，不依賴固定主機 port；因此可在本專案 server 或其他靜態 server 下使用。
- `Markdown_Viewer.html` 本身是工具，不需依 `MM_DD_hh_ss` 命名；所有新增計畫文件仍必須遵守本文件的時間前綴規則。

## 檔名格式

```text
MM_DD_hh_ss_english_name.md
```

- `MM`：月份，兩位數，例如 `07`。
- `DD`：日期，兩位數，例如 `13`。
- `hh`：24 小時制小時，兩位數，例如 `09` 或 `21`。
- `ss`：秒，兩位數，例如 `05` 或 `42`。
- `english_name`：使用簡短、明確、能表示文件目的的英文名稱；檔名以 ASCII 小寫英文字母、數字與底線為主。
- 多個英文單字之間使用底線 `_`，不要使用空白、中文、連字號或 CamelCase。
- 時間一律使用 `Asia/Taipei` 當下時間。
- 時間與英文名稱之間使用一個底線。
- 英文名稱中不要加入 `/`、`\`、`:`、`*`、`?`、`"`、`<`、`>`、`|` 等不適合檔名的字元。
- 不可覆寫已有文件；若名稱相同，仍需重新取得當下時間產生新檔案。

正確範例：

```text
07_13_01_51_plan_file_naming_rules.md
07_14_09_05_weekly_drag_resize_verification_plan.md
07_15_14_32_shared_api_contract_check_plan.md
```

不建議：

```text
calendar-feature-plan.md
7_14_9_5_週曆計畫.md
07_14_09_05_weekly-plan.md
07_14_09_05_計畫.md
```

## Markdown 標題

文件第一行可使用與檔名相同的時間前綴與英文名稱，但不包含 `.md`；文件內容仍可使用中文說明：

```md
# MM_DD_hh_ss english_name
```

例如檔名：

```text
07_14_09_05_weekly_drag_resize_verification_plan.md
```

第一行應為：

```md
# 07_14_09_05 weekly_drag_resize_verification_plan
```

## 英文名稱選擇原則

名稱應優先包含：

1. 對象，例如 `daily`、`shared_api`、`markdown_viewer`。
2. 工作內容，例如 `feature_verification`、`refactor`、`contract_check`。
3. 文件性質，例如 `plan`、`spec` 或 `checklist`。

建議名稱：

```text
calendar_feature_verification_plan
daily_date_navigation_verification_plan
shared_api_contract_check_plan
weekly_drag_resize_fix_plan
```

避免只有「新計畫」、「修改文件」等無法辨識範圍的名稱。

## 給 LLM 的固定指令

```text
建立新計畫文件前，先完整閱讀：
plan/db_naming.md

使用目前 Asia/Taipei 時間產生 MM_DD_hh_ss 前綴，後面接英文 snake_case 名稱，並在 plan/ 建立 Markdown 文件。檔名格式必須是：
MM_DD_hh_ss_english_name.md

文件第一行必須使用：
# MM_DD_hh_ss english_name

不可覆寫既有計畫文件。

建立完成後，還要更新：

```text
plan/Markdown_Viewer.html 的 documents catalog
```

確認新文件可以由側欄連結開啟，並確認 `?doc=檔名.md` 直接讀取成功。
```

## 本規則自身的命名

```text
檔名：db_naming.md
文件用途：Plan Markdown filename rules
```
