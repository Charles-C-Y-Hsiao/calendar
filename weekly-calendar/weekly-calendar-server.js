  // server.js
  const express = require('express');
  const fs = require('fs');
  const path = require('path');

  const app  = express();
  const port = 3010;

  // 檔案名稱
  const DATA_FILE = path.join(__dirname, 'weekly-calendar.json');
  // const DATA_FILE = path.join(
  //   "C:\\Web_Practice\\Function\\(calendar)javascript-calendar-design-main\\meeting_calendar_v5",
  //   "meeting_calendar.json"
  // );

  const http = require('http');
  const WebSocket = require('ws');
  // 先用 app 建立 http server，再掛 WebSocket
  const server = http.createServer(app);
  const wss    = new WebSocket.Server({ server });

  // 目前記憶體中的快取
  let dayTasksCache = {};

  app.use(express.json({ limit: '10mb' }));
  app.use(express.static(path.join(__dirname))); // 讓前端 HTML 可直接訪問

  // 初始化檔案
  function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '{}\n', 'utf8');
      console.log('[init] created weekly_schedule.json');
    }
  }
  ensureDataFile();

  // 安全讀取 JSON
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
  // 廣播工具
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

    // 一連上就送目前最新資料（初始化）
    ws.send(JSON.stringify({
      type: 'calendar-init',
      payload: dayTasksCache,
    }));
    ws.on('close', () => {
      // console.log('[WS] client disconnected');
    });
  });

  // ---------- 共用工具：日期 range ----------
  // 工具：取兩日期（含）之間的所有 yyyy-mm-dd
  function listDatesInRange(from, to) {
    const out = [];
    const d = new Date(from);
    const end = new Date(to);
    d.setHours(0,0,0,0); end.setHours(0,0,0,0);
    while (d.getTime() <= end.getTime()) {
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      out.push(`${y}-${m}-${day}`);
      d.setDate(d.getDate()+1);
    }
    return out;
  }

  // 首頁（你的日曆頁）
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'weekly-calendar.html'));
  });

  // 取得「全部」資料（備用）
  app.get('/schedule', (req, res) => {
    const { from, to } = req.query;
    const data = readJsonSafe();
    /*+++ws+++*/
    dayTasksCache = data;  // 順便更新記憶體

    if (from && to) {
      const range = listDatesInRange(from, to);
      const subset = {};
      for (const d of range) {
        if (data[d]) subset[d] = data[d];
      }
      return res.json(subset);
    }
    res.json(data);
  });

  // // 儲存（整份覆蓋：一次送整個 map）
  // app.post('/schedule', (req, res) => {
  //   const body = req.body;
  //   if (typeof body !== 'object' || body === null || Array.isArray(body)) {
  //     return res.status(400).json({ ok: false, error: 'payload 必須是物件（日期為 key 的 map）' });
  //   }

  //   try {
  //     fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2) + '\n', 'utf8');
  //     const stats = fs.statSync(DATA_FILE);
  //     return res.json({ ok: true, savedAt: new Date().toISOString(), bytes: stats.size });
  //   } catch (e) {
  //     console.error('[POST /schedule] write error:', e);
  //     return res.status(500).json({ ok: false, error: '寫入失敗' });
  //   }
  // });

  // // ✅ 新增或更新「單一天」資料（例如 2025-10-06）— 覆蓋該日
  // app.post('/schedule/:date', (req, res) => {
  //   const dateKey = req.params.date; // "YYYY-MM-DD"
  //   const dayBlocks = req.body;      // 一天陣列 [{ id, start_time, end_time, text }, ...]

  //   if (!Array.isArray(dayBlocks)) {
  //     return res.status(400).json({ ok: false, error: 'body 必須是陣列' });
  //   }

  //   const data = readJsonSafe();
  //   data[dateKey] = dayBlocks;

  //   try {
  //     fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  //     return res.json({ ok: true, savedDate: dateKey, count: dayBlocks.length });
  //   } catch (e) {
  //     console.error('[POST /schedule/:date] write error:', e);
  //     return res.status(500).json({ ok: false, error: '寫入失敗' });
  //   }
  // });

  // 儲存（整份覆蓋：一次送整個 map）
  app.post('/schedule', (req, res) => {
    const body = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'payload 必須是物件（日期為 key 的 map）' });
    }
    try {
      writeJsonSafe(body);
      dayTasksCache = body;
      const arrayCount = Object.values(body)
      .filter(v => Array.isArray(v))
      .length;
      console.log("整份共有陣列筆數（天數）:", arrayCount);    

      const stats = fs.statSync(DATA_FILE);

      // ★ 廣播給所有 WebSocket client：資料更新
      broadcast({
        type: 'calendar-updated',
        payload: dayTasksCache,
      });

      return res.json({ ok: true, savedAt: new Date().toISOString(), bytes: stats.size });
    } catch (e) {
      console.error('[POST /schedule] write error:', e);
      return res.status(500).json({ ok: false, error: '寫入失敗' });
    }
  });

  // 新增或更新「單一天」資料
  app.post('/schedule/:date', (req, res) => {
    const dateKey = req.params.date; // "YYYY-MM-DD"
    const dayBlocks = req.body;      // 一天陣列 [{ id, start_time, end_time, text }, ...]
    console.log(`單日item counts: ${dayBlocks.length}`);
    // const arrayCount = Object.values(dayBlocks)
    // .filter(v => Array.isArray(v))
    // .length;
    // console.log("單日共有陣列筆數（天數）:", arrayCount);

    if (!Array.isArray(dayBlocks)) {
      return res.status(400).json({ ok: false, error: 'body 必須是陣列' });
    }

    // 讀目前檔案，更新某一天，再整份寫回
    const data = readJsonSafe();
    data[dateKey] = dayBlocks;

    try {
      writeJsonSafe(data);
      dayTasksCache = data;

      // ★ 一樣廣播更新
      broadcast({
        type: 'calendar-updated',
        payload: dayTasksCache,
      });
      return res.json({ ok: true, savedDate: dateKey, count: dayBlocks.length });
    } catch (e) {
      console.error('[POST /schedule/:date] write error:', e);
      return res.status(500).json({ ok: false, error: '寫入失敗' });
    }
  });

  // ---------- 啟動伺服器 ----------
  dayTasksCache = readJsonSafe();

  server.listen(port, () => {
    console.log(`HTTP+WS server is running on http://localhost:${port}`);
  });
  // app.listen(port, () => {
  //   console.log(`Server is running on http://localhost:${port}`);
  // });