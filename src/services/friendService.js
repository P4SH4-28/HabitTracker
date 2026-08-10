// ============================================================
// friendService.js — Supabase arkadaşlık servisi
// Kimlik, mevcut uygulama modeline uygun olarak kullanıcı adı
// (username) üzerinden yürütülür; Supabase Auth oturumu gerekmez.
// Tüm fonksiyonlar try-catch ile korunur; hata durumunda
// uygulama çökmez, { ok: false, error } döner.
// ============================================================
import { supabase } from '../config/supabase';

const STATUS_PENDING = 'pending';
const STATUS_ACCEPTED = 'accepted';

// Kullanıcı adına profilin id'sini getirir; bulunamazsa null.
async function getProfileId(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

// Kullanıcı adıyla profil arar (arkadaş ekleme ekranı için).
export async function searchProfiles(query, currentUsername = null) {
  try {
    let builder = supabase
      .from('profiles')
      .select('id, username, xp, coins, avatar_id, frame_id, photo_url')
      .ilike('username', `%${query.trim()}%`)
      .order('username')
      .limit(20);
    if (currentUsername) builder = builder.neq('username', currentUsername);
    const { data, error } = await builder;
    if (error) return { ok: false, error: error.message };
    return { ok: true, results: data || [] };
  } catch (e) {
    return { ok: false, error: 'Arama yapılamadı (çevrimdışı mısın?)' };
  }
}

// Hedef kullanıcıya arkadaşlık isteği gönderir.
// Sonuç durumları: pending | already_friends | already_pending | not_found
export async function sendFriendRequest(currentUsername, friendUsername) {
  try {
    if (friendUsername === currentUsername) {
      return { ok: false, state: 'self', error: 'Kendine istek gönderemezsin' };
    }
    const [myId, friendId] = await Promise.all([
      getProfileId(currentUsername),
      getProfileId(friendUsername),
    ]);
    if (!myId) return { ok: false, state: 'no_profile', error: 'Profilin bulunamadı' };
    if (!friendId) {
      return { ok: false, state: 'not_found', error: `"${friendUsername}" bulunamadı` };
    }

    // İki yönlü mevcut ilişkiyi kontrol et (zaten arkadaş / istek beklemede).
    const { data: existing, error: checkError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(
        `and(user_id.eq.${myId},friend_id.eq.${friendId}),` +
          `and(user_id.eq.${friendId},friend_id.eq.${myId})`
      );
    if (checkError) throw checkError;

    const active = (existing || []).find((f) => f.status === STATUS_ACCEPTED);
    if (active) return { ok: true, state: 'already_friends' };
    const pending = (existing || []).find((f) => f.status === STATUS_PENDING);
    if (pending) return { ok: true, state: 'already_pending' };

    const { error: insertError } = await supabase.from('friendships').insert({
      user_id: myId,
      friend_id: friendId,
      status: STATUS_PENDING,
    });
    if (insertError) throw insertError;
    return { ok: true, state: 'pending' };
  } catch (e) {
    return { ok: false, state: 'error', error: 'İstek gönderilemedi' };
  }
}

// Oturum açmış kullanıcının kabul edilmiş ('accepted') arkadaşlarını getirir.
export async function getFriends(currentUsername) {
  try {
    const myId = await getProfileId(currentUsername);
    if (!myId) return { ok: false, error: 'Profilin bulunamadı' };

    const { data, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id')
      .eq('status', STATUS_ACCEPTED)
      .or(`user_id.eq.${myId},friend_id.eq.${myId}`);
    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) return { ok: true, friends: [] };

    const otherIds = rows.map((f) => (f.user_id === myId ? f.friend_id : f.user_id));
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, xp, coins, avatar_id, frame_id, photo_url')
      .in('id', otherIds);
    if (profilesError) throw profilesError;

    const friends = (profiles || []).map((p) => ({
      id: p.id,
      name: p.username,
      xp: p.xp,
      coins: p.coins,
      avatarId: p.avatar_id || null,
      frameId: p.frame_id || null,
      photoUrl: p.photo_url || null,
    }));
    return { ok: true, friends };
  } catch (e) {
    return { ok: false, error: 'Arkadaşlar getirilemedi' };
  }
}

// Gelen isteği onaylar ('accepted' yapar). Yalnızca isteği alan taraf onaylayabilir.
export async function acceptFriendRequest(currentUsername, requestId) {
  try {
    const myId = await getProfileId(currentUsername);
    if (!myId) return { ok: false, error: 'Profilin bulunamadı' };

    const { data, error } = await supabase
      .from('friendships')
      .update({ status: STATUS_ACCEPTED })
      .eq('id', requestId)
      .eq('friend_id', myId)
      .eq('status', STATUS_PENDING)
      .select();
    if (error) throw error;

    if (!data || data.length === 0) {
      return { ok: false, error: 'İstek bulunamadı veya zaten yanıtlandı' };
    }
    const requesterId = data[0].user_id;
    const { data: requester } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', requesterId)
      .maybeSingle();
    return {
      ok: true,
      friendId: requesterId,
      friendUsername: requester?.username || null,
    };
  } catch (e) {
    return { ok: false, error: 'İstek onaylanamadı' };
  }
}

// Gelen isteği reddeder (bekleyen kaydı siler). Yalnızca isteği alan taraf reddedebilir.
export async function declineFriendRequest(currentUsername, requestId) {
  try {
    const myId = await getProfileId(currentUsername);
    if (!myId) return { ok: false, error: 'Profilin bulunamadı' };

    const { data, error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
      .eq('friend_id', myId)
      .eq('status', STATUS_PENDING);
    if (error) throw error;

    if (!data || data.length === 0) {
      return { ok: false, error: 'İstek bulunamadı veya zaten yanıtlandı' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'İstek reddedilemedi' };
  }
}

// Oturum açmış kullanıcıya gelen bekleyen istekleri getirir (gönderenin bilgisiyle).
export async function getFriendRequests(currentUsername) {
  try {
    const myId = await getProfileId(currentUsername);
    if (!myId) return { ok: false, error: 'Profilin bulunamadı' };

    const { data, error } = await supabase
      .from('friendships')
      .select('id, created_at, user_id')
      .eq('friend_id', myId)
      .eq('status', STATUS_PENDING)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) return { ok: true, requests: [] };

    const senderIds = rows.map((r) => r.user_id);
    const { data: senders, error: sError } = await supabase
      .from('profiles')
      .select('id, username, xp, coins, avatar_id, frame_id, photo_url')
      .in('id', senderIds);
    if (sError) throw sError;

    const byId = new Map((senders || []).map((p) => [p.id, p]));
    const requests = rows.map((r) => {
      const sender = byId.get(r.user_id) || {};
      return {
        requestId: r.id,
        createdAt: r.created_at,
        name: sender.username || 'Bilinmeyen',
        emoji: '👤',
        streak: 0,
        totalXp: sender.xp || 0,
        avatarId: sender.avatar_id || null,
        frameId: sender.frame_id || null,
        photoUrl: sender.photo_url || null,
      };
    });
    return { ok: true, requests };
  } catch (e) {
    return { ok: false, error: 'İstekler getirilemedi' };
  }
}

// Kabul edilmiş arkadaşlığı siler (iki yönde).
export async function removeFriend(currentUsername, friendUsername) {
  try {
    const myId = await getProfileId(currentUsername);
    const friendId = await getProfileId(friendUsername);
    if (!myId || !friendId) return { ok: false, error: 'Profil bulunamadı' };

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('status', STATUS_ACCEPTED)
      .or(
        `and(user_id.eq.${myId},friend_id.eq.${friendId}),` +
          `and(user_id.eq.${friendId},friend_id.eq.${myId})`
      );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Arkadaş silinemedi' };
  }
}
