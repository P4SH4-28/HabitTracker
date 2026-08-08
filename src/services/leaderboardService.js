// ============================================================
// leaderboardService.js — Supabase liderlik servisi
// Oturum açmış kullanıcı ve kabul edilmiş ('accepted') arkadaşları,
// XP'ye göre yüksekten düşüğe sıralanır; XP eşitliğinde coin'e
// bakılır. Tüm fonksiyonlar try-catch ile korunur; hata durumunda
// { ok: false, error } döner.
// Katman 4: her satıra 7 günlük XP kazancı (xp7d) ve şüpheli kullanıcı
// bayrağı (flagged) eklenir — anormal hızlar liderlikte görünür olur.
// ============================================================
import { supabase } from '../config/supabase';

const STATUS_ACCEPTED = 'accepted';

// Oturum açmış kullanıcı + arkadaşlarının XP/Coin sıralaması.
// Her satır: { id, username, xp, coins, rank, isCurrentUser, xp7d, flagged }.
export async function getLeaderboardData(currentUsername) {
  try {
    if (!currentUsername) return { ok: false, error: 'Oturum bilgisi yok' };

    const meRes = await supabase
      .from('profiles')
      .select('id, username, xp, coins, flagged, flagged_reason')
      .eq('username', currentUsername)
      .maybeSingle();
    if (meRes.error) throw meRes.error;

    // Kullanıcının Supabase profili henüz yoksa boş tablo dön.
    if (!meRes.data) return { ok: true, leaderboard: [] };

    const myId = meRes.data.id;
    const { data: friendships, error: fError } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', STATUS_ACCEPTED)
      .or(`user_id.eq.${myId},friend_id.eq.${myId}`);
    if (fError) throw fError;

    // İki yönlü kayıtlardan arkadaş id'lerini topla (tekilleştirerek).
    const friendIds = (friendships || []).map((f) =>
      f.user_id === myId ? f.friend_id : f.user_id
    );
    const ids = [...new Set([myId, ...friendIds])];

    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, username, xp, coins, flagged, flagged_reason')
      .in('id', ids)
      .eq('banned', false);
    if (pError) throw pError;

    // Son 7 günün kazanç defterinden günlük XP toplamları (Katman 4 trendi).
    // daily_earnings anon'a kapalıysa trend boş kalır (sessizce geçilir).
    let xp7dByUser = {};
    try {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 6);
      const sinceKey = since.toISOString().slice(0, 10);
      const usernames = (profiles || []).map((p) => p.username);
      const { data: earnings, error: eError } = await supabase
        .from('daily_earnings')
        .select('username, xp')
        .in('username', usernames)
        .gte('day', sinceKey);
      if (!eError && earnings) {
        const sums = {};
        for (const e of earnings) sums[e.username] = (sums[e.username] || 0) + (e.xp || 0);
        xp7dByUser = sums;
      }
    } catch (e) {
      // Trend verisi alınamadıysa liderlik yine de çalışır.
    }

    const leaderboard = (profiles || [])
      .map((p) => ({
        id: p.id,
        username: p.username,
        xp: p.xp || 0,
        coins: p.coins || 0,
        isCurrentUser: p.id === myId,
        xp7d: xp7dByUser[p.username] || 0,
        flagged: !!p.flagged,
        flaggedReason: p.flagged_reason || null,
      }))
      .sort((a, b) => b.xp - a.xp || b.coins - a.coins)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    return { ok: true, leaderboard };
  } catch (e) {
    return { ok: false, error: 'Liderlik verisi alınamadı' };
  }
}
