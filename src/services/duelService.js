// ============================================================
// duelService.js — arkadaş düellosu servisi (7 günlük XP yarışı)
// Tüm işlemler "duel-action" edge function'ından geçer; istemci anahtarı
// düello tablosuna YAZAMAZ (RLS). Kazanan ödülünü sunucu verir (tavanlı).
// - challengeFriend: arkadaşına düello daveti gönderir
// - getMyDuels: açık düellolarını canlı skorla getirir
// - acceptDuel / declineDuel: gelen daveti kabul/red eder
// - finishDuel: bitiş saatinden sonra kazananı belirletir
// ============================================================
import { SUPABASE_URL } from '../config/supabase';

const FN_URL = `${SUPABASE_URL}/functions/v1/duel-action`;
const TIMEOUT_MS = 10000;

async function callDuel(body) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // JSON olmayan yanıt — aşağıda genel hata döndürülür.
    }
    if (!res.ok) {
      return { ok: false, error: data?.error || `Düello hatası (${res.status})` };
    }
    return { ok: true, data: data || {} };
  } catch (e) {
    return { ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' };
  }
}

// Arkadaşını düelloya davet eder. 409 → bu çiftte zaten açık düello var.
export async function challengeFriend(username, opponent) {
  return callDuel({ action: 'challenge', username, opponent });
}

// Kullanıcının açık düellolarını canlı skorla döndürür.
// Her öğe: { id, status, isChallenger, opponent, opponentXp,
//           startXpMe, startXpThem, myXp, endsAt, createdAt }
export async function getMyDuels(username) {
  return callDuel({ action: 'my', username });
}

// Gelen daveti kabul eder (yalnızca davetli taraf).
export async function acceptDuel(username, duelId) {
  return callDuel({ action: 'accept', username, duelId });
}

// Gelen daveti reddeder (kayıt silinir).
export async function declineDuel(username, duelId) {
  return callDuel({ action: 'decline', username, duelId });
}

// Bitiş saatinden sonra kazananı belirler; sunucu ödülü verir.
// Yanıt: { winner, challengerGain, opponentGain, reward }
export async function finishDuel(username, duelId) {
  return callDuel({ action: 'finish', username, duelId });
}
