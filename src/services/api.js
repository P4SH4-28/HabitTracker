// ============================================================
// api.js — Sunucu iletişim katmanı
// - EXPO_PUBLIC_SERVER_URL ile sunucu adresi verilir (build zamanı).
//   Boşsa yerel geliştirme sunucusu (localhost:3000) kullanılır.
// - Her cihaz kendi gizli token'ını AsyncStorage'da saklar;
//   tüm kimlik gerektiren istekler "x-device-token" başlığıyla gider.
// - Her istek 10 sn zaman aşımına sahiptir; hata durumunda çökmez,
//   { ok: false } döner (çevrimdışı mod ekranları böyle çalışır).
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@habit_tracker_device_token';

export const BASE_URL = (
  process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3000'
).replace(/\/$/, '');

const TIMEOUT_MS = 10000;

async function request(path, { method = 'GET', token, body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-device-token': token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // JSON olmayan yanıt: sunucu beklenmedik bir şey döndürdü.
    }
    return { ok: res.status < 400, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: e?.name === 'AbortError' ? 'Zaman aşımı' : 'Bağlantı kurulamadı',
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getToken() {
  try {
    return (await AsyncStorage.getItem(TOKEN_KEY)) || null;
  } catch (e) {
    return null;
  }
}

// Token yoksa isimle sunucuya kayıt olur. İsim doluysa (409) başarısız döner.
export async function ensureProfile(name) {
  let token = await getToken();
  if (token) return { ok: true, token };
  const r = await request('/api/profiles/register', { method: 'POST', body: { name } });
  if (r.ok && r.data?.token) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, r.data.token);
    } catch (e) {
      // Token kaydedilemese bile oturum içinde kullanılabilir.
    }
    return { ok: true, token: r.data.token };
  }
  return { ok: false, status: r.status, error: r.data?.error || 'Sunucuya ulaşılamadı' };
}

export function updateProfile(token, fields) {
  return request('/api/profiles/update', { method: 'POST', token, body: fields });
}

export function getLeaderboard(limit = 50) {
  return request(`/api/leaderboard?limit=${limit}`);
}

export function searchProfiles(q) {
  return request(`/api/profiles/search?q=${encodeURIComponent(q)}`);
}

export function sendFriendRequest(token, name) {
  return request('/api/friends/request', { method: 'POST', token, body: { name } });
}

export function getFriendRequests(token) {
  return request('/api/friends/requests', { token });
}

export function acceptFriendRequest(token, requestId) {
  return request('/api/friends/accept', { method: 'POST', token, body: { requestId } });
}

export function declineFriendRequest(token, requestId) {
  return request('/api/friends/decline', { method: 'POST', token, body: { requestId } });
}

export function getFriends(token) {
  return request('/api/friends', { token });
}

export function removeFriend(token, name) {
  return request(`/api/friends/remove?name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
    token,
  });
}

export function ping() {
  return request('/api/health');
}
