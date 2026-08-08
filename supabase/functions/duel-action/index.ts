// ============================================================
// duel-action — Supabase Edge Function (Arkadaş Düellosu)
// 7 günlük XP yarışını servis rolüyle yönetir:
//   challenge — düello daveti oluşturur (başlangıç XP anlık görüntüleri)
//   accept    — davetli taraf kabul eder (status → active)
//   decline   — davetli taraf reddeder (kayıt silinir)
//   my        — kullanıcının açık düellolarını döndürür (canlı skorla)
//   finish    — yalnızca bitiş saati geçince çalışır; kazananı belirler
//               ve +100 XP / +50 🪙 ödülünü günlük tavana kıstırarak verir
// Anti-farm: kimlik yok (kullanıcı adı bazlı) — bu yüzden tüm kararlar
// sunucuda; anon yazma yok (RLS). Ödül deftere (daily_earnings) tavanlı
// yazılır; istemci ödülü kendisi ekleyemez.
//
// Deploy: Supabase Dashboard → Edge Functions → duel-action →
// index.ts içeriğini yapıştır → Deploy (JWT doğrulaması KAPALI).
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const DUEL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
const DAY_XP_CAP = 500;
const DAY_GOLD_CAP = 150;
const WIN_XP = 100;
const WIN_GOLD = 50;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function json(res, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

async function getProfile(username) {
  const { data } = await supabase
    .from('profiles')
    .select('username, xp, coins')
    .eq('username', username)
    .maybeSingle();
  return data || null;
}

// Çift arasında açık düello var mı (iki yön de kontrol edilir).
async function findOpenDuel(a, b) {
  const { data } = await supabase
    .from('duels')
    .select('*')
    .or(`and(challenger.eq.${a},opponent.eq.${b}),and(challenger.eq.${b},opponent.eq.${a})`)
    .neq('status', 'done')
    .limit(1);
  return (data || [])[0] || null;
}

// Kazanan ödülünü günlük kazanca kıstırarak verir (Katman 1 tavan).
async function awardWinner(username) {
  const now = new Date();
  const day = utcDayKey(now);
  const { data: dayRow } = await supabase
    .from('daily_earnings')
    .select('xp, gold')
    .eq('username', username)
    .eq('day', day)
    .maybeSingle();
  const usedXp = dayRow?.xp ?? 0;
  const usedGold = dayRow?.gold ?? 0;
  const xpGain = Math.min(WIN_XP, Math.max(0, DAY_XP_CAP - usedXp));
  const goldGain = Math.min(WIN_GOLD, Math.max(0, DAY_GOLD_CAP - usedGold));

  const prof = await getProfile(username);
  const newXp = Math.max(0, (prof?.xp ?? 0) + xpGain);
  const newGold = Math.max(0, (prof?.coins ?? 0) + goldGain);

  await supabase.from('daily_earnings').upsert(
    { username, day, xp: usedXp + xpGain, gold: usedGold + goldGain, updated_at: now.toISOString() },
    { onConflict: 'username,day' }
  );
  await supabase.from('profiles').update({ xp: newXp, coins: newGold }).eq('username', username);
  return { xp: xpGain, gold: goldGain };
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
  if (!username || username.length < 2) return json(req, 400, { error: 'username_required' });

  const now = new Date();

  // ---------- challenge: düello daveti ----------
  if (action === 'challenge') {
    const opponent = typeof body?.opponent === 'string' ? body.opponent.trim() : '';
    if (!opponent || opponent.length < 2) return json(req, 400, { error: 'opponent_required' });
    if (opponent === username) return json(req, 400, { error: 'self_challenge' });

    const [me, opp] = await Promise.all([getProfile(username), getProfile(opponent)]);
    if (!me) return json(req, 404, { error: 'no_profile' });
    if (!opp) return json(req, 404, { error: 'opponent_not_found' });

    const open = await findOpenDuel(username, opponent);
    if (open) return json(req, 409, { error: 'duel_exists' });

    const ends = new Date(now.getTime() + DUEL_DURATION_MS);
    const { error } = await supabase.from('duels').insert({
      challenger: username,
      opponent,
      start_xp_challenger: me.xp || 0,
      start_xp_opponent: opp.xp || 0,
      status: 'pending',
      created_at: now.toISOString(),
      ends_at: ends.toISOString(),
    });
    if (error) return json(req, 500, { error: 'duel_create_failed' });
    return json(req, 200, { ok: true });
  }

  // ---------- accept / decline: daveti yanıtla (yalnızca davetli) ----------
  if (action === 'accept' || action === 'decline') {
    const duelId = typeof body?.duelId === 'string' ? body.duelId : '';
    if (!duelId) return json(req, 400, { error: 'duel_id_required' });
    const { data: duel } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .maybeSingle();
    if (!duel) return json(req, 404, { error: 'duel_not_found' });
    if (duel.opponent !== username) return json(req, 403, { error: 'not_opponent' });
    if (duel.status !== 'pending') return json(req, 409, { error: 'duel_not_pending' });

    if (action === 'accept') {
      const { error } = await supabase
        .from('duels')
        .update({ status: 'active' })
        .eq('id', duelId);
      if (error) return json(req, 500, { error: 'duel_accept_failed' });
      return json(req, 200, { ok: true });
    }
    const { error: delErr } = await supabase.from('duels').delete().eq('id', duelId);
    if (delErr) return json(req, 500, { error: 'duel_decline_failed' });
    return json(req, 200, { ok: true });
  }

  // ---------- my: kullanıcının açık düelloları + canlı skor ----------
  if (action === 'my') {
    const { data: rows } = await supabase
      .from('duels')
      .select('*')
      .or(`challenger.eq.${username},opponent.eq.${username}`)
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(20);
    const myProfile = await getProfile(username);
    const out = [];
    for (const r of rows || []) {
      const isChallenger = r.challenger === username;
      const me = isChallenger ? r.challenger : r.opponent;
      const them = isChallenger ? r.opponent : r.challenger;
      const theirProfile = await getProfile(them);
      out.push({
        id: r.id,
        status: r.status,
        isChallenger,
        opponent: them,
        opponentXp: theirProfile?.xp ?? 0,
        startXpMe: isChallenger ? r.start_xp_challenger : r.start_xp_opponent,
        startXpThem: isChallenger ? r.start_xp_opponent : r.start_xp_challenger,
        myXp: myProfile?.xp ?? 0,
        endsAt: r.ends_at,
        createdAt: r.created_at,
      });
    }
    return json(req, 200, { ok: true, duels: out });
  }

  // ---------- finish: yalnızca bitişten sonra; kazanan + ödül ----------
  if (action === 'finish') {
    const duelId = typeof body?.duelId === 'string' ? body.duelId : '';
    if (!duelId) return json(req, 400, { error: 'duel_id_required' });
    const { data: duel } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duelId)
      .maybeSingle();
    if (!duel) return json(req, 404, { error: 'duel_not_found' });
    if (duel.challenger !== username && duel.opponent !== username) {
      return json(req, 403, { error: 'not_participant' });
    }
    if (duel.status !== 'active') return json(req, 409, { error: 'duel_not_active' });
    if (now.getTime() < Date.parse(duel.ends_at)) {
      return json(req, 409, { error: 'duel_not_finished', endsAt: duel.ends_at });
    }

    const [challengerP, opponentP] = await Promise.all([
      getProfile(duel.challenger),
      getProfile(duel.opponent),
    ]);
    const challengerGain = (challengerP?.xp ?? 0) - (duel.start_xp_challenger || 0);
    const opponentGain = (opponentP?.xp ?? 0) - (duel.start_xp_opponent || 0);

    let winner = null;
    let reward = { xp: 0, gold: 0 };
    if (challengerGain !== opponentGain) {
      winner = challengerGain > opponentGain ? duel.challenger : duel.opponent;
      reward = await awardWinner(winner);
    }

    await supabase
      .from('duels')
      .update({ status: 'done', winner, reward_claimed: true })
      .eq('id', duelId);

    return json(req, 200, {
      ok: true,
      winner,
      challengerGain,
      opponentGain,
      reward: winner ? reward : null,
    });
  }

  return json(req, 400, { error: 'invalid_action' });
});
