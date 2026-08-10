// ============================================================
// socialService.js — Sosyal sekme servisi (Supabase Realtime)
// - Genel sohbet: mesaj geçmişi anon key ile SELECT (RLS açık),
//   gönderim 'chat-action' Edge Function'ı ile (yazma kapalı),
//   yeni mesajlar Realtime kanalıyla anında düşer.
// - Canlı odalar: oda listesi aynı şekilde okunur/yazılır; oda
//   tablosundaki değişiklikler (katılımcı, yeni oda) Realtime'den gelir.
// ============================================================
import { supabase, SUPABASE_URL } from '../config/supabase';

const CHAT_FN_URL = `${SUPABASE_URL}/functions/v1/chat-action`;
const TIMEOUT_MS = 10000;

function post(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(CHAT_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        // JSON olmayan yanıt.
      }
      if (!res.ok) {
        return {
          ok: false,
          error: data?.error || `Sunucu hatası (${res.status})`,
          remainingMs: typeof data?.remainingMs === 'number' ? data.remainingMs : 0,
        };
      }
      return { ok: true, data: data || {} };
    })
    .catch(() => ({ ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' }))
    .finally(() => clearTimeout(timer));
}

// ---------------- Genel sohbet ----------------

// Son N mesajı çeker (en yeniler en altta olacak şekilde sıralanır).
export async function fetchChatHistory(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, username, name, avatar_id, avatar_photo, message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { ok: false, error: error.message };
    return { ok: true, messages: (data || []).reverse() };
  } catch (e) {
    return { ok: false, error: 'Sohbet yüklenemedi' };
  }
}

// Mesaj gönderir (uzunluk + spam koruması sunucuda).
export function sendChatMessage({ username, name, avatarId, avatarPhoto, message }) {
  return post({ action: 'send', username, name, avatarId, avatarPhoto, message });
}

// Yeni mesajları dinler. Dönüş: unsubscribe fonksiyonu.
export function subscribeChat(onMessage) {
  const channel = supabase
    .channel('genel_sohbet')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => {
        if (payload.new) onMessage(payload.new);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
}

// ---------------- Canlı pomodoro odaları ----------------

export function fetchRooms() {
  return post({ action: 'rooms', username: '' });
}

export function createRoom(username, name) {
  return post({ action: 'room_create', username, name });
}

export function joinRoom(username, roomId) {
  return post({ action: 'room_join', username, roomId });
}

export function leaveRoom(username, roomId) {
  return post({ action: 'room_leave', username, roomId });
}

// Oda değişikliklerini dinler (yeni oda, katılımcı güncellemesi).
// Dönüş: unsubscribe fonksiyonu.
export function subscribeRooms(onChange) {
  const channel = supabase
    .channel('canli_odalar')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pomodoro_rooms' },
      (payload) => {
        onChange(payload.new || payload.old, payload.eventType);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel).catch(() => {});
  };
}
