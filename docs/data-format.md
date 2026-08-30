# Data Format

## Overview

每位使用者的持久化資料位於 `data/{userId}.json`。runtime object 同時包含日期 keys 與保留 key `_evergreen`；本文稱它為 `CalendarData`。

```json
{
  "2026-07-13": [
    {
      "id": "tabc123",
      "start_time": "08:30",
      "end_time": "09:30",
      "text": "Example",
      "completed": false
    }
  ],
  "_evergreen": []
}
```

## Top-level Fields

| Field | Type | Meaning | Owner |
| --- | --- | --- | --- |
| `YYYY-MM-DD` | `ScheduleItem[]` | 該日期的 timed items；空日期可不存在或為空 array | 三種 mode 共用 |
| `_evergreen` | `EvergreenItem[]` | 不綁定日期的 long-term items | Daily；server `/evergreen` 保留 |

未知的 top-level keys 應保留。`POST /calendar` 是整份覆寫，使用前尤其要注意。

Server 不提供 JSON Schema 驗證；以下格式是 frontend contract，而不是 server 強制限制。API 可以儲存不符合本文件的資料，但之後可能被各 view normalize、忽略、遺失或錯誤呈現。

## ScheduleItem

### 共用基礎欄位

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | item identity；前端通常用 `t...` 形式產生 |
| `start_time` | string | `HH:mm` |
| `end_time` | string | `HH:mm`，應晚於 `start_time` |
| `text` | string | 顯示文字 |
| `completed` | boolean, optional | Daily 使用；Weekly `serializeDay()` 也會在 block `data-completed="true"` 時寫回此欄位 |
| unknown fields | any, optional | Server 原樣 round-trip 會保留；前端重新 serialize 時不保證保留 |

### Weekly recurring 欄位

- `repeatGroupId`
- `repeatScope`
- `repeatPattern`
- `repeatYearMonth`
- `repeatDaysLabel`

同一批重複排程以 `repeatGroupId` 關聯。修改或刪除整組前要載入完整 CalendarData。

### Weekly availability 欄位

| Field | Expected value |
| --- | --- |
| `type` | availability item 使用特定 type 值；以 `availability-schedule.js` 實作為準 |
| `availabilityFrom` / `availabilityTo` | 日期範圍字串 |
| `availabilityWeekdays` | weekday number array；Weekly Availability 使用 MON=0 至 FRI=4 |
| `availabilityGroupId` | 同一 availability group identity |
| `availabilityPeople` | person objects array |

目前 availability item 的 `type` 是 `availability`。`availabilityPeople[]` 的已知欄位是：

| Field | Type / values |
| --- | --- |
| `name` | non-empty string |
| `status` | `free` 或 `not-free`；其他值會由 Weekly normalize 為 `free` |

其他 mode 必須能忽略上述 Weekly-only fields。修改基礎 item 時不要無意間丟失它們。

## EvergreenItem

Daily 的 `normalizeEvergreenItems()` 接受並正規化下列欄位：

- `id`: string
- `text`: string
- `priority`: `high`、`medium` 或 `low`
- `status`: `active`、`paused`、`done` 或 `archived`
- `completed`: boolean，相容欄位
- `createdAt`: ISO-like datetime string，用於缺少明確 order 時的排序 fallback
- `order`: number，用於排序

完整預設值與相容處理以 `daily-calendar/daily-calendar.js` 的 `normalizeEvergreenItems()`、`normalizePriority()`、`normalizeEvergreenStatus()` 為準。

## Daily Normalize Details

Daily 的 normalize 發生在前端讀取後、render 前，主要用來相容舊資料或不完整 payload；它不是 server-side schema validation，也不會在讀取當下自動 migration `data/{userId}.json`。

### `normalizeItems()`

- Input 不是 array 時視為空 array。
- Array 中非 object item 會被忽略。
- 使用 object spread 保留未知欄位。
- `id` 缺值時產生新的 Daily id。
- `start_time` 不符合 `HH:mm` 時 fallback 到 `08:00`。
- `end_time` 不符合 `HH:mm` 時 fallback 到 `09:00`。
- `text` 會轉成 string。
- `completed` 會轉成 boolean。

### `normalizeEvergreenItems()`

- Input 不是 array 時視為空 array。
- Array 中非 object item 會被忽略。
- 空白 `text` item 會被過濾。
- 使用 object spread 保留未知欄位。
- `id` 缺值時產生新的 Evergreen id。
- `priority` 只接受 `high`、`medium`、`low`；其他值 fallback 到 `high`。
- `status` 只接受 `active`、`paused`、`done`、`archived`；其他值會依 `completed` fallback 成 `done` 或 `active`。
- `completed` 在 normalized shape 中會與 `status: done` 相容。
- `createdAt` 缺值時補目前時間。
- `order` 可轉成 finite number 時保留為 number，否則先設為 `null`；Daily 載入 Evergreen 後通常會再呼叫 `normalizeEvergreenOrder()` 重寫連續 order。

## Serialization Ownership

- Daily：`normalizeItems()` / `normalizeEvergreenItems()` 載入；`saveCurrentDay()` / `saveEvergreen()` 寫入。
- Weekly：`serializeDay()` 從 DOM blocks 產生資料；`buildPayloadForDate()` 保留 recurring 與 availability 欄位。
- Monthly：`dayTasks` 保存完整 map；`getList()`、`renderTaskList()` 與 day panel 編輯日期 array。
- Server：不驗證 item schema，只驗證 top-level/body 是否為 object 或 array。因此資料相容性主要由前端負責。

## Field Preservation Matrix

| Operation | Preservation behavior |
| --- | --- |
| Server `GET` → `POST /calendar` 原樣 round-trip | 保留所有 JSON fields |
| `POST /evergreen` | 替換 `_evergreen`，保留其他 top-level data |
| `POST /schedule/:date` | 替換指定 key 的 array，保留其他 top-level data |
| Range `POST /schedule` | 只替換 range 內、body 明確提供的日期；忽略 range 外 keys |
| Daily normalize | 使用 object spread，保留未知 item fields 並補預設值 |
| Weekly `serializeDay()` / `buildPayloadForDate()` | 只輸出已知欄位；未知 item fields 可能遺失 |
| Monthly edit/reorder | 通常直接修改既有 item object；完整 `POST /calendar` 仍有覆寫整份 map 的風險 |

## Compatibility Rules

1. 新增 optional field 時，舊 view 應能忽略並在不相關寫入時盡量保留；目前 Weekly serializer 尚不能保證未知欄位 preservation。
2. 缺少 `completed` 視為未完成；缺少 mode-specific fields 視為一般 schedule item。
3. 時間字串應維持 `HH:mm`，日期 key 維持本地日曆的 `YYYY-MM-DD`，不要用 ISO UTC timestamp 取代。
4. 使用 `POST /calendar` 前先取得完整 map，以免刪除 `_evergreen` 或其他 mode 的欄位。
5. 若要更名或移除欄位，需同時更新三個 view 的 normalize/serialize/render，並設計 migration 或 fallback。

## Monthly Availability Projection

Availability records remain valid shared CalendarData items for Weekly mode.
Monthly mode excludes records with `type` or `itemType` equal to
`availability` from its task projection; the JSON schema and `/calendar`
persistence contract are unchanged.

## When To Update

JSON 欄位、預設值、排序、序列化、import/export、storage location 或 backward compatibility 規則改變時更新本文件。
