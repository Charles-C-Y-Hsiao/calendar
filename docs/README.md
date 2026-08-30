# Calendar Views 文件導航

本目錄是 `daily-calendar/`、`weekly-calendar/`、`monthly-calendar/` 與共用服務 `calendar-views-server.js` 的維護入口。三個畫面共用同一份使用者行事曆資料，但各自擁有不同的 UI、互動與前端模組。

## 快速入口

| 要處理的工作 | 先讀 | 視需要再讀 |
| --- | --- | --- |
| 修改整體啟動、路由、同步或模組邊界 | [architecture.md](architecture.md) | [api.md](api.md)、[data-format.md](data-format.md) |
| 修改 Daily 畫面 | [modes/daily/architecture.md](modes/daily/architecture.md)、[modes/daily/feature-map.md](modes/daily/feature-map.md) | API 或資料有變更時再讀共用文件 |
| 修改 Weekly 畫面 | [modes/weekly/architecture.md](modes/weekly/architecture.md)、[modes/weekly/feature-map.md](modes/weekly/feature-map.md) | API 或資料有變更時再讀共用文件 |
| 修改 Monthly 畫面 | [modes/monthly/architecture.md](modes/monthly/architecture.md)、[modes/monthly/feature-map.md](modes/monthly/feature-map.md) | API 或資料有變更時再讀共用文件 |
| 修改 endpoint 或 frontend `fetch()` | [api.md](api.md) | [data-format.md](data-format.md) 與三份 feature map |
| 修改 JSON 欄位、序列化或相容性 | [data-format.md](data-format.md) | [api.md](api.md) |
| 修改帳號切換 | [shared/account-and-user.md](shared/account-and-user.md) | 各 mode 的 feature map |
| 修改跨分頁更新 | [shared/realtime-sync.md](shared/realtime-sync.md) | [api.md](api.md) |

## 執行入口

- 正式 server：`calendar-views-server.js`，port `3011`
- Weekly：`/week`，靜態檔位於 `weekly-calendar/`
- Monthly：`/month`，靜態檔位於 `monthly-calendar/`
- Daily：`/day` 或 `/daily-calendar`，靜態檔位於 `daily-calendar/`
- 根路徑 `/` 會轉址到 `/week`

`weekly-calendar/weekly-calendar-server.js` 與 `monthly-calendar/monthly-calendar-server.js` 是舊的獨立 server 實作，不是目前三種 mode 的正式共用入口。除非任務明確要求維護 legacy server，否則不要修改它們。

## LLM 工作順序

1. 從本頁判斷變更屬於共用層或特定 mode。
2. 讀對應的 architecture 與 feature map。
3. 用 `rg` 搜尋文件列出的 function、DOM id、CSS class、state key 或 route，確認 symbol 仍存在。
4. 只在涉及資料或網路契約時讀 `data-format.md`、`api.md`。
5. 修改後執行該 feature 的驗證；若資料會被其他 mode 顯示，也要跨 mode 驗證。
6. 若 entry point、責任歸屬、route、資料欄位或驗證方式改變，同步更新本目錄。

行號只可當暫時提示，不能當穩定契約；優先使用檔案路徑與 symbol 定位。
