// ============================================================
// adminService.js — Yönetici Paneli sunucu servisi
// admin-action Edge Function'ına istek gönderir. Yalnızca admin
// hesabı (P4SH4) kullanır; fonksiyon istekteki adminKey + actor
// doğrulamasını yapar. Her işlem denetim günlüğüne yazılır.
// ============================================================
import { ADMIN_KEY } from '../config/admin';
import { SUPABASE_URL } from '../config/supabase';

const FN_URL = `${SUPABASE_URL}/functions/v1/admin-action`;
const TIMEOUT_MS = 10000;

// Admin işlemi çalıştırır. Başarı: { ok: true, data } | { ok: false, error }.
// action: search_users | get_user | ban | unban | adjust | grant | revoke | unflag | logs
export async function adminAction(action, actor, payload = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: ADMIN_KEY, actor, action, ...payload }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // JSON olmayan yanıt: sunucu beklenmedik bir şey döndürdü.
    }
    if (!res.ok) {
      return { ok: false, error: data?.error || `Hata (${res.status})` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' };
  }
}
