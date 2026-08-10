// ============================================================
// vipService.js — VIP (Season Pass) satın alma servisi
// 'vip-action' Edge Function'ı altın bakiyesini SUNUCU tarafında
// doğrular (istemciye güvenilmez). Başarılıysa sunucudaki vip_until
// değeri döner; istemci bu değeri yerel ayarlara yazar.
// ============================================================
import { SUPABASE_URL } from '../config/supabase';

const VIP_FN_URL = `${SUPABASE_URL}/functions/v1/vip-action`;
const TIMEOUT_MS = 10000;

// VIP satın alır. Dönüş:
//   ok: true, { vipUntil, coins, price } → ödeme alındı
//   ok: false, error: 'already_vip' | 'insufficient_gold' | 'banned' | diğer
export async function purchaseVip(username) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(VIP_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
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
    if (res.status === 403) {
      return { ok: false, error: data?.error || 'banned' };
    }
    if (res.status === 409) {
      return {
        ok: false,
        error: data?.error || 'rejected',
        vipUntil: data?.vipUntil || null,
        coins: typeof data?.coins === 'number' ? data.coins : null,
      };
    }
    if (!res.ok) {
      return { ok: false, error: data?.error || `Sunucu hatası (${res.status})` };
    }
    return { ok: true, data: data || {} };
  } catch (e) {
    return { ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' };
  }
}
