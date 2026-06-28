  // calendar-server/server.js
  const express = require('express');
  const fs = require('fs');
  const path = require('path');
  const http = require('http');
  const WebSocket = require('ws');

  const app  = express();
  const port = 3011;   // 周曆 & 月曆共用這一個 port

  // ★ 路徑設定：兩個前端資料夾
  const WEEK_DIR = path.join(__dirname, 'weekly-calendar');
  const MONTH_DIR = path.join(__dirname, 'monthly-calendar');
  const DAILY_DIR = path.join(__dirname, 'daily-calendar');
  // console.log("[MONTH_DIR] =", MONTH_DIR);

  // ★ 每個使用者一個 json 檔：資料目錄
  const DATA_DIR = path.join(__dirname, 'data');   // 例如 calendar-server/data
  const DEFAULT_USER_ID = '00666888';

  // 確保 data 目錄存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('[init] created data dir:', DATA_DIR);
  }

  // HTTP + WS 共用一個 server
  const server = http.createServer(app);
  const wss    = new WebSocket.Server({ server });

  // in-memory cache: userId → dayTasks 物件
  const userCache = new Map();              // Map<string, Object>
  // userId → Set<WebSocket>
  const userSockets = new Map();            // Map<string, Set<WebSocket>>
  app.use(express.json({ limit: '10mb' }));

  // ---------------- 共用工具：userId & 檔案存取 ----------------
  function extractUserIdFromHttp(req) {
    // 可以日後再改成從 cookie / JWT 取得
    const headerId = req.get('x-user-id');
    const queryId  = req.query.userId;
    let userId = headerId || queryId || DEFAULT_USER_ID;
    // 簡單驗證：至少幾碼數字，避免奇怪字串
    if (!/^\d{5,}$/.test(userId)) {
      userId = DEFAULT_USER_ID;
    }
    return userId;
  }
  function getUserFilePath(userId) {
    return path.join(DATA_DIR, `${userId}.json`);
  }
  function loadUserData(userId) {
    // 1) 先看快取
    if (userCache.has(userId)) {
      return userCache.get(userId);
    }
    const filePath = getUserFilePath(userId);
    // 2) 確保檔案存在
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '{}\n', 'utf8');
      console.log(`[init] created data file for user ${userId}`);
    }
    // 3) 讀檔
    let data = {};
    try {
      const raw = fs.readFileSync(filePath, 'utf8') || '{}';
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`[loadUserData] parse error for user ${userId}:`, e);
      data = {};
    }
    userCache.set(userId, data);
    return data;
  }
  function saveUserData(userId, obj) {
    const filePath = getUserFilePath(userId);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    userCache.set(userId, obj);
    const stats = fs.statSync(filePath);
    return stats;
  }
  function getEvergreenItems(dayTasks) {
    return Array.isArray(dayTasks?._evergreen) ? dayTasks._evergreen : [];
  }
  function setEvergreenItems(dayTasks, items) {
    dayTasks._evergreen = items;
    return dayTasks;
  }
  // 讓每個 HTTP 請求都帶有 user 的資訊（userId + dayTasks）
  app.use((req, res, next) => {
    const userId = extractUserIdFromHttp(req);
    req.userId = userId;
    req.dayTasks = loadUserData(userId); // 此物件是該 user 的 day map
    next();
  });
  // ---------------- 靜態檔案路由 ----------------
  // 讓 /week/... 會對應到 week-schedule-ws 裡面的檔案
  app.use('/week', express.static(WEEK_DIR));
  // 讓 /month/... 對應到 meeting_calendar_v5
  app.use('/month', express.static(MONTH_DIR));
  app.use('/daily-calendar', express.static(DAILY_DIR));
  app.use('/day', express.static(DAILY_DIR));
  app.get('/', (req, res) => {
    res.redirect('/week');
  });
  // http://localhost:3010/week → 自動開啟 week-schedule.html
  // /week 是你自己「指定要回傳 week-schedule.html」
  // 所以 / → /week → week-schedule.html
  app.get('/week', (req, res) => {
    res.sendFile(path.join(WEEK_DIR, 'weekly-calendar.html'));
  });
  // http://localhost:3010/month → 自動開啟 meeting_calendar.html
  app.get('/month', (req, res) => {
    res.sendFile(path.join(MONTH_DIR, 'monthly-calendar.html'));
  });
  app.get('/daily-calendar', (req, res) => {
    res.sendFile(path.join(DAILY_DIR, 'daily-calendar.html'));
  });
  app.get('/day', (req, res) => {
    res.sendFile(path.join(DAILY_DIR, 'daily-calendar.html'));
  });
  // ---------------- WebSocket：每個 user 拿自己的資料 ----------------
  function extractUserIdFromWs(req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      let userId = url.searchParams.get('userId') || DEFAULT_USER_ID;
      if (!/^\d{5,}$/.test(userId)) {
        userId = DEFAULT_USER_ID;
      }
      return userId;
    } catch (e) {
      return DEFAULT_USER_ID;
    }
  }
  // 只對特定 user 發送 WS 訊息
  function broadcastToUser(userId, msgObj) {
    const sockets = userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    const data = JSON.stringify(msgObj);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) { ws.send(data); }
    }
  }
  wss.on('connection', (ws, req) => {
    const userId = extractUserIdFromWs(req);

    // 建立 user 對應的 socket set
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(ws);

    // 初次連線時，把該 user 的 dayTasks 丟給前端
    const dayTasks = loadUserData(userId);
    ws.send(JSON.stringify({
      type: 'calendar-init',
      payload: dayTasks,
    }));

    ws.on('close', () => {
      const set = userSockets.get(userId);
      if (!set) return;
      set.delete(ws);
      if (set.size === 0) {
        userSockets.delete(userId);
      }
    });
  });
  // ---------------- 周曆輔助：日期 range ----------------
  function listDatesInRange(from, to) {
    const out = [];
    const d   = new Date(from);
    const end = new Date(to);
    d.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    while (d.getTime() <= end.getTime()) {
      const y   = d.getFullYear();
      const m   = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      out.push(`${y}-${m}-${day}`);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  // ====================== 月曆 API ======================
  // 讀取全部資料（該 user）
  app.get('/calendar', (req, res) => {
    res.json(req.dayTasks || {});
  });
  // 覆蓋全部資料（給月曆用，該 user）
  app.post('/calendar', (req, res) => {
    const body = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'payload 必須是物件（日期 map）' });
    }

    const userId = req.userId;
    const sourceClientId = req.get('x-client-id') || null;
    try {
      const stats = saveUserData(userId, body);

      broadcastToUser(userId, {
        type: 'calendar-updated',
        sourceClientId,
        payload: body,
      });

      return res.json({
        ok: true,
        savedAt: new Date().toISOString(),
        bytes: stats.size,
      });
    } catch (e) {
      console.error('[POST /calendar] write error:', e);
      return res.status(500).json({ ok: false, error: '寫入失敗' });
    }
  });
  app.get('/evergreen', (req, res) => {
    res.json(getEvergreenItems(req.dayTasks));
  });
  app.post('/evergreen', (req, res) => {
    const body = req.body;
    if (!Array.isArray(body)) {
      return res.status(400).json({ ok: false, error: 'body must be an evergreen item array' });
    }

    const userId = req.userId;
    const sourceClientId = req.get('x-client-id') || null;
    const dayTasks = loadUserData(userId);
    setEvergreenItems(dayTasks, body);

    try {
      const stats = saveUserData(userId, dayTasks);

      broadcastToUser(userId, {
        type: 'calendar-updated',
        sourceClientId,
        payload: dayTasks,
      });

      return res.json({
        ok: true,
        count: body.length,
        bytes: stats.size,
        savedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[POST /evergreen] write error:', e);
      return res.status(500).json({ ok: false, error: 'save failed' });
    }
  });
  // ====================== 周曆 API（/schedule） ======================
  // 取區間或全部（該 user）
  app.get('/schedule', (req, res) => {
    const { from, to } = req.query;
    const dayTasks = req.dayTasks || {};

    if (from && to) {
      const range  = listDatesInRange(from, to);
      const subset = {};
      for (const d of range) {
        if (dayTasks[d]) subset[d] = dayTasks[d];
      }
      return res.json(subset);
    }
    res.json(dayTasks);
  });
  // // 整份覆蓋（周曆用，該 user）
  // app.post('/schedule', (req, res) => {
  //   const body = req.body;
  //   if (typeof body !== 'object' || body === null || Array.isArray(body)) {
  //     return res.status(400).json({ ok: false, error: 'payload 必須是物件（日期 map）' });
  //   }

  //   const userId = req.userId;

  //   try {
  //     const stats = saveUserData(userId, body);

  //     broadcastToUser(userId, {
  //       type: 'calendar-updated',
  //       payload: body,
  //     });

  //     return res.json({
  //       ok: true,
  //       savedAt: new Date().toISOString(),
  //       bytes: stats.size,
  //     });
  //   } catch (e) {
  //     console.error('[POST /schedule] write error:', e);
  //     return res.status(500).json({ ok: false, error: '寫入失敗' });
  //   }
  // });

  // 單一天更新（周曆用，該 user）
  app.post('/schedule/:date', (req, res) => {
    const dateKey   = req.params.date; // YYYY-MM-DD
    const dayBlocks = req.body;

    if (!Array.isArray(dayBlocks)) {
      return res.status(400).json({ ok: false, error: 'body 必須是陣列' });
    }

    const userId   = req.userId;
    const sourceClientId = req.get('x-client-id') || null;
    const dayTasks = loadUserData(userId);

    dayTasks[dateKey] = dayBlocks;

    try {
      const stats = saveUserData(userId, dayTasks);

      broadcastToUser(userId, {
        type: 'calendar-updated',
        sourceClientId,
        payload: dayTasks,
      });

      return res.json({
        ok: true,
        savedDate: dateKey,
        count: dayBlocks.length,
        bytes: stats.size,
      });
    } catch (e) {
      console.error('[POST /schedule/:date] write error:', e);
      return res.status(500).json({ ok: false, error: '寫入失敗' });
    }
  });
  // 一週（或區間）批次更新：body 是 { "YYYY-MM-DD": [blocks...], ... }
  app.post('/schedule', (req, res) => {
    const { from, to } = req.query;
    const patch = req.body; // 期望是物件：dateKey -> blocks(array)

    if (!from || !to) {
      return res.status(400).json({ ok: false, error: '需要 from & to' });
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({ ok: false, error: 'body 必須是物件 {dateKey: blocks[]}' });
    }

    const userId = req.userId;
    const sourceClientId = req.get('x-client-id') || null;
    const dayTasks = loadUserData(userId);

    // 只更新 from~to 範圍內的日期
    const range = listDatesInRange(from, to);
    for (const dateKey of range) {
      if (Object.prototype.hasOwnProperty.call(patch, dateKey)) {
        const blocks = patch[dateKey];
        if (!Array.isArray(blocks)) {
          return res.status(400).json({ ok: false, error: `${dateKey} 必須是陣列` });
        }
        dayTasks[dateKey] = blocks;
      }
    }

    try {
      const stats = saveUserData(userId, dayTasks);

      // ✅ 只廣播一次
      broadcastToUser(userId, {
        type: 'calendar-updated',
        sourceClientId,
        payload: dayTasks,
      });

      return res.json({ ok: true, from, to, bytes: stats.size });
    } catch (e) {
      console.error('[POST /schedule] write error:', e);
      return res.status(500).json({ ok: false, error: '寫入失敗' });
    }
  });
  // ---------- 啟動 ----------
  server.listen(port, () => {
    console.log(`HTTP+WS server is running on:`);
    console.log(`  http://localhost:${port}`);
    console.log(`  http://localhost:${port}/week/`);
    console.log(`  http://localhost:${port}/month/`);
    console.log(`  http://localhost:${port}/day/`);
    console.log(`預設 userId = ${DEFAULT_USER_ID}（沒帶 userId 時會用這個）`);
  });
