// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app  = express();
const port = 3009;

// 檔案路徑
const DATA_FILE = path.join(__dirname, 'monthly-calendar.json');

const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);       // 用同一個 server
const wss = new WebSocket.Server({ server }); // WebSocket 掛在同 host/port

// 目前記憶體中的 dayTasks 快取（單一資料來源）
let dayTasksCache = {};

app.use(express.json({ limit: '10mb' }));                // 允許最大 10MB JSON
app.use(express.static(path.join(__dirname)));           // 靜態檔案：同資料夾

// 啟動時若檔案不存在就建立
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}\n', 'utf8');
    console.log('[init] created meeting_calendar.json');
  }
}
ensureDataFile();

// 安全讀檔
function readJsonSafe() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (e) {
    console.error('[readJsonSafe] parse error:', e);
    return {};
  }
}

// 安全寫檔
function writeJsonSafe(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

// ---------- WebSocket 相關 ----------
// 簡單廣播工具：把 msgObj 丟給所有連線中的 client
function broadcast(msgObj) {
  const data = JSON.stringify(msgObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
// 有 client 連上 WebSocket
wss.on('connection', (ws) => {
  // console.log('[WS] client connected');

  // 一連上就送目前最新的 dayTasks 給他（初始化）
  ws.send(JSON.stringify({
    type: 'calendar-init',
    payload: dayTasksCache,
  }));

  ws.on('close', () => {
    // console.log('[WS] client disconnected');
  });
});

// 首頁：你的日曆頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'monthly-calendar.html'));
});

// 讀取目前伺服器端 JSON
app.get('/calendar', (req, res) => {
  // const data = readJsonSafe();
  // res.json(data);
  /* */
  // 一般來說 dayTasksCache 已經是最新的
  // 如果你擔心有人手動改檔，可以改成每次 readJsonSafe()
  res.json(dayTasksCache);
});

// // 寫入（覆蓋）伺服器端 JSON
// app.post('/calendar', (req, res) => {
//   const body = req.body;
//   if (typeof body !== 'object' || body === null || Array.isArray(body)) {
//     return res.status(400).json({ ok: false, error: 'payload 必須是物件（日期為 key 的 map）' });
//   }
//   try {
//     fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2) + '\n', 'utf8');
//     const stats = fs.statSync(DATA_FILE);
//     return res.json({
//       ok: true,
//       savedAt: new Date().toISOString(),
//       bytes: stats.size
//     });
//   } catch (e) {
//     console.error('[POST /calendar] write error:', e);
//     return res.status(500).json({ ok: false, error: '寫入失敗' });
//   }
// });

// 寫入（覆蓋）伺服器端 JSON
app.post('/calendar', (req, res) => {
  const body = req.body;
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'payload 必須是物件（日期為 key 的 map）' });
  }
  try {
    // 更新記憶體快取
    dayTasksCache = body;
    // 寫回檔案
    writeJsonSafe(dayTasksCache);

    const stats = fs.statSync(DATA_FILE);
    // ★ 重要：廣播給所有 WebSocket client，通知資料更新
    broadcast({
      type: 'calendar-updated',
      payload: dayTasksCache,
    });
    return res.json({
      ok: true,
      savedAt: new Date().toISOString(),
      bytes: stats.size
    });
  } catch (e) {
    console.error('[POST /calendar] write error:', e);
    return res.status(500).json({ ok: false, error: '寫入失敗' });
  }
});

// // 假設你的原始資料長得像：{ '2025-10-06': [{id,text}, ...], '2025-10-07': [...], ... }
// app.get('/calendar', (req, res) => {
//   const year  = Number(req.query.year);   // 2025
//   const month = Number(req.query.month);  // 1~12

//   // 如果沒帶參數，維持舊行為：整包回傳
//   if (!Number.isInteger(year) || !Number.isInteger(month)) {
//     return res.json(fullData); // 你的 meeting_calendar.json 全量
//   }

//   // 過濾當月
//   const mm = String(month).padStart(2, '0'); // '10'
//   const prefix = `${year}-${mm}-`;           // '2025-10-'
//   const filtered = {};
//   for (const [date, arr] of Object.entries(fullData)) {
//     if (date.startsWith(prefix)) filtered[date] = arr;
//   }
//   return res.json(filtered);
// });

dayTasksCache = readJsonSafe();

server.listen(port, () => {
  console.log(`HTTP+WS server is running on http://localhost:${port}`);
});

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });