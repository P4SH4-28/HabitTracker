// ============================================================
// Habit Tracker Sunucu — arkadaşlık + liderlik
// Express + libSQL (yerelde dosya DB, bulutta Turso URL'si).
// Kimlik: her cihaz kendi gizli token'ını saklar ("x-device-token"
// başlığıyla gönderir). İsim tüm sunucuda benzersizdir.
// ============================================================
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@libsql/client');

const PORT = process.env.PORT || 3000;

// TURSO_URL verilmezse yerelde bir dosya veritabanı kullanılır.
const db = createClient({
  url: process.env.TURSO_URL || 'file:' + path.join(__dirname, 'data.db'),
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// ---------- Şema ----------
async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      token TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT NOT NULL DEFAULT '😀',
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      streak INTEGER NOT NULL DEFAULT 0,
      avatar_id TEXT NOT NULL DEFAULT 'av_fox',
      frame_id TEXT,
      gold INTEGER NOT NULL DEFAULT 0,
      last_active TEXT,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS friends (
      a TEXT NOT NULL,
      b TEXT NOT NULL,
      PRIMARY KEY (a, b)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      from_token TEXT NOT NULL,
      to_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `);
}

// ---------- Yardımcılar ----------
function rowToProfile(r) {
  if (!r) return null;
  return {
    token: r.token,
    name: r.name,
    emoji: r.emoji,
    xp: r.xp,
    level: r.level,
    streak: r.streak,
    avatarId: r.avatar_id,
    frameId: r.frame_id,
    gold: r.gold,
    lastActive: r.last_active,
    updatedAt: r.updated_at,
  };
}

function json(res, status, body) {
  res.status(status).json(body);
}

// Token başlığından profil bulur; yoksa 401 döner.
async function requireProfile(req, res) {
  const token = (req.headers['x-device-token'] || '').toString().trim();
  if (!token) {
    json(res, 401, { ok: false, error: 'Token eksik' });
    return null;
  }
  const r = await db.execute({ sql: 'SELECT * FROM profiles WHERE token = ?', args: [token] });
  const row = r.rows[0];
  if (!row) {
    json(res, 401, { ok: false, error: 'Geçersiz token' });
    return null;
  }
  return row;
}

const now = () => new Date().toISOString();

// ---------- Uygulama ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (req, res) => {
  json(res, 200, { ok: true, time: now() });
});

// Profil oluşturur; cihazın kalıcı token'ını döner.
// İsim tüm sunucuda benzersizdir (ilk alan kazanır).
app.post('/api/profiles/register', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    if (name.length < 2 || name.length > 30) {
      return json(res, 400, { ok: false, error: 'İsim 2-30 karakter olmalı' });
    }
    const existing = await db.execute({ sql: 'SELECT token FROM profiles WHERE name = ?', args: [name] });
    if (existing.rows[0]) {
      return json(res, 409, { ok: false, error: 'Bu isim kullanımda' });
    }
    const token = crypto.randomUUID();
    const ts = now();
    await db.execute({
      sql: 'INSERT INTO profiles (token, name, emoji, xp, level, streak, avatar_id, frame_id, gold, last_active, updated_at) VALUES (?, ?, ?, 0, 1, 0, ?, NULL, 0, ?, ?)',
      args: [token, name, '😀', 'av_fox', ts, ts],
    });
    const r = await db.execute({ sql: 'SELECT * FROM profiles WHERE token = ?', args: [token] });
    json(res, 200, { ok: true, token, profile: rowToProfile(r.rows[0]) });
  } catch (e) {
    console.error('register hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// Kendi profilini günceller (XP, seviye, seri, avatar vb.).
// "name" gönderilirse isim değişikliği yapılır (token sahipliği kanıtı).
app.post('/api/profiles/update', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const b = req.body || {};
    const ts = now();
    const fields = {};
    if (typeof b.xp === 'number' && Number.isFinite(b.xp)) fields.xp = Math.max(0, Math.round(b.xp));
    if (typeof b.level === 'number' && Number.isFinite(b.level)) fields.level = Math.max(1, Math.round(b.level));
    if (typeof b.streak === 'number' && Number.isFinite(b.streak)) fields.streak = Math.max(0, Math.round(b.streak));
    if (typeof b.emoji === 'string' && b.emoji) fields.emoji = b.emoji.slice(0, 8);
    if (typeof b.avatarId === 'string' && b.avatarId) fields.avatar_id = b.avatarId.slice(0, 40);
    if (typeof b.frameId === 'string' && b.frameId) fields.frame_id = b.frameId.slice(0, 40);
    if (typeof b.gold === 'number' && Number.isFinite(b.gold)) fields.gold = Math.max(0, Math.round(b.gold));

    // İsim değişikliği: ayrılmış/kullanımda olan isimleri kontrol et.
    if (typeof b.name === 'string' && b.name.trim()) {
      const newName = b.name.trim();
      if (newName.length < 2 || newName.length > 30) {
        return json(res, 400, { ok: false, error: 'İsim 2-30 karakter olmalı' });
      }
      if (newName !== me.name) {
        const clash = await db.execute({ sql: 'SELECT token FROM profiles WHERE name = ? AND token != ?', args: [newName, me.token] });
        if (clash.rows[0]) return json(res, 409, { ok: false, error: 'Bu isim kullanımda' });
        fields.name = newName;
        // Bekleyen isteklerde alıcı ismi de güncellenir.
        await db.execute({ sql: 'UPDATE friend_requests SET to_name = ? WHERE to_name = ?', args: [newName, me.name] });
      }
    }

    fields.last_active = ts;
    fields.updated_at = ts;
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    const args = Object.values(fields);
    await db.execute({ sql: `UPDATE profiles SET ${sets} WHERE token = ?`, args: [...args, me.token] });

    const r = await db.execute({ sql: 'SELECT * FROM profiles WHERE token = ?', args: [me.token] });
    json(res, 200, { ok: true, profile: rowToProfile(r.rows[0]) });
  } catch (e) {
    console.error('update hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// Global liderlik tablosu: XP'ye göre sıralı.
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const r = await db.execute({
      sql: 'SELECT * FROM profiles ORDER BY xp DESC, name ASC LIMIT ?',
      args: [limit],
    });
    json(res, 200, { ok: true, players: r.rows.map(rowToProfile) });
  } catch (e) {
    console.error('leaderboard hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// İsim arama: tam eşleşme önce, sonra başlangıca göre eşleşmeler.
app.get('/api/profiles/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 1) return json(res, 200, { ok: true, results: [] });
    const exact = await db.execute({ sql: 'SELECT * FROM profiles WHERE name = ?', args: [q] });
    const prefix = await db.execute({
      sql: 'SELECT * FROM profiles WHERE name != ? AND name LIKE ? ORDER BY name ASC LIMIT 10',
      args: [q, q + '%'],
    });
    json(res, 200, {
      ok: true,
      results: [...exact.rows, ...prefix.rows].map(rowToProfile),
    });
  } catch (e) {
    console.error('search hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// Arkadaşlık isteği gönderir (isme göre). Durum döner:
// "pending" | "already_friends" | "already_pending"
app.post('/api/friends/request', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const name = (req.body?.name || '').trim();
    if (!name) return json(res, 400, { ok: false, error: 'İsim gerekli' });
    const target = await db.execute({ sql: 'SELECT * FROM profiles WHERE name = ?', args: [name] });
    const t = target.rows[0];
    if (!t) return json(res, 404, { ok: false, error: 'Kullanıcı bulunamadı' });
    if (t.token === me.token) return json(res, 400, { ok: false, error: 'Kendine istek gönderemezsin' });

    const isFriend = await db.execute({
      sql: 'SELECT 1 FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)',
      args: [me.token, t.token, t.token, me.token],
    });
    if (isFriend.rows[0]) return json(res, 200, { ok: true, state: 'already_friends' });

    const pending = await db.execute({
      sql: "SELECT 1 FROM friend_requests WHERE status = 'pending' AND ((from_token = ? AND to_name = ?) OR (from_token = ? AND to_name = ?))",
      args: [me.token, t.name, t.token, me.name],
    });
    if (pending.rows[0]) return json(res, 200, { ok: true, state: 'already_pending' });

    const id = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO friend_requests (id, from_token, to_name, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
      args: [id, me.token, t.name, now()],
    });
    json(res, 200, { ok: true, state: 'pending' });
  } catch (e) {
    console.error('request hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// Gelen bekleyen istekleri döner (gönderenin canlı profiliyle).
app.get('/api/friends/requests', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const r = await db.execute({
      sql: "SELECT * FROM friend_requests WHERE to_name = ? AND status = 'pending' ORDER BY created_at DESC",
      args: [me.name],
    });
    const out = [];
    for (const row of r.rows) {
      const sender = await db.execute({ sql: 'SELECT * FROM profiles WHERE token = ?', args: [row.from_token] });
      if (sender.rows[0]) {
        out.push({ id: row.id, createdAt: row.created_at, from: rowToProfile(sender.rows[0]) });
      }
    }
    json(res, 200, { ok: true, requests: out });
  } catch (e) {
    console.error('requests hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// İsteği onaylar → iki yönlü arkadaşlık oluşur.
app.post('/api/friends/accept', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const id = (req.body?.requestId || '').toString();
    const r = await db.execute({ sql: 'SELECT * FROM friend_requests WHERE id = ?', args: [id] });
    const reqRow = r.rows[0];
    if (!reqRow || reqRow.to_name !== me.name) {
      return json(res, 404, { ok: false, error: 'İstek bulunamadı' });
    }
    if (reqRow.status !== 'pending') return json(res, 400, { ok: false, error: 'İstek artık geçerli değil' });

    await db.execute({
      sql: 'INSERT OR IGNORE INTO friends (a, b) VALUES (?, ?), (?, ?)',
      args: [me.token, reqRow.from_token, reqRow.from_token, me.token],
    });
    await db.execute({ sql: "UPDATE friend_requests SET status = 'accepted' WHERE id = ?", args: [id] });

    const sender = await db.execute({ sql: 'SELECT * FROM profiles WHERE token = ?', args: [reqRow.from_token] });
    json(res, 200, { ok: true, friend: rowToProfile(sender.rows[0]) });
  } catch (e) {
    console.error('accept hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// İsteği reddeder (kayıt silinir).
app.post('/api/friends/decline', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const id = (req.body?.requestId || '').toString();
    const r = await db.execute({ sql: 'SELECT * FROM friend_requests WHERE id = ?', args: [id] });
    const reqRow = r.rows[0];
    if (!reqRow || reqRow.to_name !== me.name) {
      return json(res, 404, { ok: false, error: 'İstek bulunamadı' });
    }
    await db.execute({ sql: 'DELETE FROM friend_requests WHERE id = ?', args: [id] });
    json(res, 200, { ok: true });
  } catch (e) {
    console.error('decline hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// Arkadaşlarımın güncel profilleri.
app.get('/api/friends', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const r = await db.execute({
      sql: 'SELECT b AS token FROM friends WHERE a = ? UNION SELECT a AS token FROM friends WHERE b = ?',
      args: [me.token, me.token],
    });
    const out = [];
    for (const row of r.rows) {
      const f = await db.execute({ sql: 'SELECT * FROM profiles WHERE token = ?', args: [row.token] });
      if (f.rows[0]) out.push(rowToProfile(f.rows[0]));
    }
    json(res, 200, { ok: true, friends: out });
  } catch (e) {
    console.error('friends hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

// Arkadaşlığı kaldırır (iki yönlü).
app.delete('/api/friends/remove', async (req, res) => {
  try {
    const me = await requireProfile(req, res);
    if (!me) return;
    const name = (req.query.name || '').trim();
    if (!name) return json(res, 400, { ok: false, error: 'İsim gerekli' });
    const target = await db.execute({ sql: 'SELECT token FROM profiles WHERE name = ?', args: [name] });
    const t = target.rows[0];
    if (!t) return json(res, 404, { ok: false, error: 'Kullanıcı bulunamadı' });
    await db.execute({
      sql: 'DELETE FROM friends WHERE (a = ? AND b = ?) OR (a = ? AND b = ?)',
      args: [me.token, t.token, t.token, me.token],
    });
    json(res, 200, { ok: true });
  } catch (e) {
    console.error('remove hata:', e);
    json(res, 500, { ok: false, error: 'Sunucu hatası' });
  }
});

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Habit Tracker sunucusu ${PORT} portunda çalışıyor (${process.env.TURSO_URL ? 'Turso' : 'yerel dosya DB'})`);
    });
  })
  .catch((e) => {
    console.error('Veritabanı başlatılamadı:', e);
    process.exit(1);
  });
