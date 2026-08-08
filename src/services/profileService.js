// ============================================================
// profileService.js — Supabase profil servisi (Katman 3 doğrulamalı)
// Kullanıcının XP/Altın kazançları 'sync-profile' Edge Function'ına
// DELTA olarak gönderilir; fonksiyon günlük tavanı sunucu tarafında
// doğrular (daily_earnings defteri) ve yalnızca kabul edilen farkı
// 'profiles' tablosuna yazar. Böylece saat ileri alma, veri oynatma
// ve doğrudan tabloya yazma ile farm yapılamaz.
// - Fonksiyon henüz deploy edilmemişse (404) geçiş dönemi olarak eski
//   upsert yolu kullanılır; RLS sıkılaştırıldıktan sonra o yol kapanır.
// - Kimlik kullanıcı adıyla yürütülür (uygulama Supabase Auth kullanmaz).
// ============================================================
import { supabase, SUPABASE_URL } from '../config/supabase';

const SYNC_FN_URL = `${SUPABASE_URL}/functions/v1/sync-profile`;
// Görev ödülü onayı (Katman 3): bekleme süresi ve günlük ödül limitleri
// 'sync-quest' Edge Function'ında SUNUCU saatine göre doğrulanır. Cihaz
// saati oynatılsa bile ödül verilmez; bu fonksiyon yalnızca "onay" döner,
// ödül miktarları yine sync-profile'in günlük tavanından geçer.
const QUEST_FN_URL = `${SUPABASE_URL}/functions/v1/sync-quest`;
const TIMEOUT_MS = 10000;

// Sunucudaki mevcut profil toplamlarını döndürür (delta köprüsü için).
// Profil yoksa null döner. Hata durumunda da null (güvenli).
// Yanıt ayrıca ban durumunu ve admin hediyesi ürünleri içerir
// (uygulama bunları yerel envantere birleştirir).
export async function getServerProfile(currentUsername) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('xp, coins, banned, ban_reason, granted_items')
      .eq('username', currentUsername)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      xp: data.xp || 0,
      coins: data.coins || 0,
      banned: !!data.banned,
      banReason: data.ban_reason || null,
      grantedItems: Array.isArray(data.granted_items) ? data.granted_items : [],
    };
  } catch (e) {
    return null;
  }
}

// Kullanıcının kazanç deltasını sunucuya gönderir.
// - deltaXp: son senkrondan bu yana kazanılan XP (geri alma negatif olabilir)
// - deltaGold: son senkrondan bu yana kazanılan altın (ceza negatif olabilir)
// - claimedDay: cihazın "bugün" anahtarı (sunucu günüyle +1 gün toleransı)
// - totalXp/totalGold: geçiş dönemi fallback'i için mutlak değerler
// Başarı: { ok: true, data: { serverXp, serverGold, acceptedXp, acceptedGold, day, flagged } }
export async function updateProfileData(
  currentUsername,
  { deltaXp = 0, deltaGold = 0, totalXp = 0, totalGold = 0, claimedDay = null } = {}
) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(SYNC_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          deltaXp,
          deltaGold,
          claimedDay,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Edge Function henüz deploy edilmedi: geçiş dönemi eski yol (mutlak upsert).
    if (res.status === 404) {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { username: currentUsername, xp: totalXp ?? 0, coins: totalGold ?? 0 },
          { onConflict: 'username' }
        );
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        data: {
          serverXp: totalXp ?? 0,
          serverGold: totalGold ?? 0,
          acceptedXp: deltaXp,
          acceptedGold: deltaGold,
          day: claimedDay,
        },
      };
    }

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // JSON olmayan yanıt: sunucu beklenmedik bir şey döndürdü.
    }
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Senkron hatası (${res.status})`,
        warn: data?.warn,
      };
    }
    return { ok: true, data, warn: data?.warn };
  } catch (e) {
    return { ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' };
  }
}

// Görev ödülünü sunucuda onaylatır. Dönüş:
//   ok: true → onaylandı (bekleme + günlük limit temiz)
//   ok: false, error: 'cooldown' + remainingMs → bekleme süresi dolmadı
//   ok: false, error: 'daily_claim_limit' → günlük ödül limiti doldu
//   ok: false, error: 'banned' → hesap yasaklandı
//   ok: false, error: diğer → bağlantı/sunucu hatası
export async function claimQuestServer(username, questId) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(QUEST_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, questId }),
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
        remainingMs: typeof data?.remainingMs === 'number' ? data.remainingMs : 0,
      };
    }
    if (!res.ok) {
      return { ok: false, error: data?.error || `Sunucu hatası (${res.status})` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' };
  }
}
