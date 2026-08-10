// ============================================================
// chat-action — Supabase Edge Function (Sosyal sekme)
// Servis rolüyle çalışır; anon key ile yazmaya kapalı tablolara
// yazar. Eylemler:
//   send        → genel sohbete mesaj at (uzunluk + spam korumalı)
//   room_join   → odaya katıl (üyelik ekle + katılımcı sayısını artır)
//   room_leave  → odadan ayrıl (üyelik sil + katılımcı sayısını azalt)
//   rooms       → canlı oda listesi (sohbete göre sıralı)
// Okumalar (mesaj geçmişi, oda listesi) anon key ile doğrudan yapılır
// (RLS yalnızca SELECT'e izin verir) — burada yalnızca YAZMALAR var.
//
// Deploy: Supabase Dashboard → Edge Functions (Verify JWT KAPALI).
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MAX_MESSAGE_LEN = 500;
const MIN_MESSAGE_LEN = 1;
// Sohbet spam koruması: aynı kullanıcı 5 saniyede en fazla 1 mesaj.
const SPAM_MS = 5000;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function json(res, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(req, 405, { error: 'method_not_allowed' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: 'bad_json' });
  }

  const action = typeof body?.action === 'string' ? body.action : '';
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  if (!username) return json(req, 400, { error: 'username_required' });

  const now = new Date();

  // Yasak kontrolü tüm eylemlerde ortak.
  const { data: prof } = await supabase
    .from('profiles')
    .select('banned, ban_reason')
    .eq('username', username)
    .maybeSingle();
  if (prof?.banned) {
    return json(req, 403, { error: 'banned', reason: prof.ban_reason || null });
  }

  // ---------------- send: genel sohbet ----------------
  if (action === 'send') {
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (message.length < MIN_MESSAGE_LEN) return json(req, 400, { error: 'message_required' });
    if (message.length > MAX_MESSAGE_LEN) {
      return json(req, 400, { error: 'message_too_long', max: MAX_MESSAGE_LEN });
    }
    const name = typeof body?.name === 'string' ? body.name.slice(0, 30) : username;
    const avatarId = typeof body?.avatarId === 'string' ? body.avatarId.slice(0, 40) : null;
    const avatarPhoto =
      typeof body?.avatarPhoto === 'string' && body.avatarPhoto.trim().length > 0
        ? body.avatarPhoto.trim().slice(0, 300)
        : null;

    // Spam koruması: son mesajdan bu yana SPAM_MS geçmediyse reddet.
    const { data: last } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.created_at) {
      const diff = now.getTime() - Date.parse(last.created_at);
      if (diff < SPAM_MS) {
        return json(req, 429, { error: 'slow_down', remainingMs: SPAM_MS - diff });
      }
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ username, name, avatar_id: avatarId, avatar_photo: avatarPhoto, message, created_at: now.toISOString() })
      .select('id, username, name, avatar_id, avatar_photo, message, created_at')
      .single();
    if (error) return json(req, 500, { error: 'send_failed' });

    return json(req, 200, { ok: true, message: data });
  }

  // ---------------- room_create: yeni oda aç ----------------
  if (action === 'room_create') {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name.length < 2 || name.length > 40) {
      return json(req, 400, { error: 'invalid_room_name', max: 40 });
    }
    const { data: room, error: createErr } = await supabase
      .from('pomodoro_rooms')
      .insert({ name, host: username, participants: 1, created_at: now.toISOString(), last_active_at: now.toISOString() })
      .select('id')
      .single();
    if (createErr || !room) return json(req, 500, { error: 'room_create_failed' });
    // Kurucu otomatik üye olur (ilk katılımcı).
    await supabase.from('pomodoro_room_members').insert({ room_id: room.id, username });
    const { data: full } = await supabase
      .from('pomodoro_rooms')
      .select('id, name, host, participants, created_at, last_active_at')
      .eq('id', room.id)
      .single();
    return json(req, 200, { ok: true, room: full || null });
  }

  // ---------------- rooms: canlı oda listesi ----------------
  if (action === 'rooms') {
    const { data: rooms, error } = await supabase
      .from('pomodoro_rooms')
      .select('id, name, host, participants, created_at, last_active_at')
      .order('last_active_at', { ascending: false })
      .limit(50);
    if (error) return json(req, 500, { error: 'rooms_failed' });
    return json(req, 200, { ok: true, rooms: rooms || [] });
  }

  // ---------------- room_join: odaya katıl ----------------
  if (action === 'room_join') {
    const roomId = typeof body?.roomId === 'string' ? body.roomId : '';
    if (!roomId) return json(req, 400, { error: 'room_id_required' });

    const { data: room } = await supabase
      .from('pomodoro_rooms')
      .select('id')
      .eq('id', roomId)
      .maybeSingle();
    if (!room) return json(req, 404, { error: 'room_not_found' });

    // Zaten üyeyse çift sayma yapma.
    const { data: existing } = await supabase
      .from('pomodoro_room_members')
      .select('username')
      .eq('room_id', roomId)
      .eq('username', username)
      .maybeSingle();
    if (!existing) {
      const { error: memberErr } = await supabase
        .from('pomodoro_room_members')
        .insert({ room_id: roomId, username });
      if (memberErr) return json(req, 500, { error: 'join_failed' });
    }
    // Katılımcı sayısı üyelik tablosundan doğru hesaplanır (çift sayma olmaz).
    const { count } = await supabase
      .from('pomodoro_room_members')
      .select('username', { count: 'exact', head: true })
      .eq('room_id', roomId);
    const { error: touchErr } = await supabase
      .from('pomodoro_rooms')
      .update({ participants: count ?? 1, last_active_at: now.toISOString() })
      .eq('id', roomId);
    if (touchErr) return json(req, 500, { error: 'join_failed' });
    const { data: roomFull } = await supabase
      .from('pomodoro_rooms')
      .select('id, name, host, participants, created_at, last_active_at')
      .eq('id', roomId)
      .single();
    return json(req, 200, { ok: true, room: roomFull || null });
  }

  // ---------------- room_leave: odadan ayrıl ----------------
  if (action === 'room_leave') {
    const roomId = typeof body?.roomId === 'string' ? body.roomId : '';
    if (!roomId) return json(req, 400, { error: 'room_id_required' });

    const { error: delErr } = await supabase
      .from('pomodoro_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('username', username);
    if (delErr) return json(req, 500, { error: 'leave_failed' });
    return json(req, 200, { ok: true });
  }

  return json(req, 400, { error: 'unknown_action' });
});
