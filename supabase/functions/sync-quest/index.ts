// ============================================================
// sync-quest — Supabase Edge Function (Habit Tracker Katman 3)
// Günlük görev ödüllerini SUNUCU SAATİNE göre doğrular (hileci duvarı):
// - Yeni nesil sistem: her görev günde BİR KEZ ödül verir (günlük
//   sıfırlama). Bekleme süresi (cooldown) yoktur; gün anahtarı
//   sunucu saatinden alınır → cihaz saati ileri alınsa bile aynı
//   günün ödülü ikinci kez alınamaz.
// - VIP durumu sunucudan okunur (profiles.vip_until); temel görevler
//   VIP kullanıcıya ×1.5 çarpanla ödüllendirilir. İstemcinin gönderdiği
//   VIP bayrağına GÜVENİLMEZ — karar sunucu verisine dayanır.
// - Ödül MİKTARI burada hesaplanıp istemciye döner (istemci aynı
//   miktarı uygular). Altın/XP toplamları yine sync-profile'in günlük
//   tavan defterinden geçer (çifte sayım olmaz).
//
// Gereksinim: quest_claims tablosu (bkz. supabase/quest-claims.sql) ve
// profiles.vip_until sütunu (bkz. supabase/social.sql).
//
// Deploy: Supabase Dashboard → Edge Functions → yapıştır → Deploy
// (JWT doğrulaması KAPALI olmalı: "Verify JWT" işaretsiz bırakılır —
//  istemci anon key ile değil doğrudan HTTP ile çağırır).
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Zorluklar — istemcideki src/data/quests.js ile BİREBİR aynı olmalı.
const DIFF = {
  warmup: { xp: 20, gold: 20 },
  hard1: { xp: 50, gold: 50 },
  hard2: { xp: 75, gold: 75 },
  impossible: { xp: 200, gold: 150 },
} as const;

type Difficulty = keyof typeof DIFF;

// Görev kataloğu — istemcideki DAILY_QUESTS / VIP_QUESTS ile aynı id'ler.
const CATALOG: Record<string, { difficulty: Difficulty; vip: boolean }> = {
  // Temel 4 görev
  daily_warmup: { difficulty: 'warmup', vip: false },
  daily_hard1: { difficulty: 'hard1', vip: false },
  daily_hard2: { difficulty: 'hard2', vip: false },
  daily_impossible: { difficulty: 'impossible', vip: false },
  // VIP 4 görev
  vip_warmup: { difficulty: 'warmup', vip: true },
  vip_hard1: { difficulty: 'hard1', vip: true },
  vip_hard2: { difficulty: 'hard2', vip: true },
  vip_impossible: { difficulty: 'impossible', vip: true },
};

// VIP ödül çarpanı: temel görevlerde ×1.5, 5'e yuvarlı.
const VIP_MULTIPLIER = 1.5;

function rewardFor(difficulty: Difficulty, isVip: boolean, isVipQuest: boolean) {
  const base = DIFF[difficulty];
  if (isVip && !isVipQuest) {
    const round5 = (n: number) => Math.round((n * VIP_MULTIPLIER) / 5) * 5;
    return { xp: round5(base.xp), gold: round5(base.gold) };
  }
  return { xp: base.xp, gold: base.gold };
}

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

  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const questId = typeof body?.questId === 'string' ? body.questId.trim() : '';
  if (!username) return json(req, 400, { error: 'username_required' });
  if (!questId) return json(req, 400, { error: 'quest_id_required' });

  const meta = CATALOG[questId];
  if (!meta) return json(req, 400, { error: 'invalid_quest' });

  const now = new Date();
  const today = utcDayKey(now);

  // ---------- Profili getir (ban + VIP durumu sunucudan) ----------
  let { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('username, banned, ban_reason, vip_until')
    .eq('username', username)
    .maybeSingle();

  if (profErr && profErr.code !== 'PGRST116') {
    return json(req, 500, { error: 'profile_lookup_failed' });
  }

  // Yasaklı hesabın ödül onayı tamamen durdurulur.
  if (prof?.banned) {
    return json(req, 403, { error: 'banned', reason: prof.ban_reason || null });
  }

  // Profil yoksa oluştur (sync-profile ile aynı davranış).
  if (!prof) {
    const { error: createErr } = await supabase
      .from('profiles')
      .insert({ username, xp: 0, coins: 0, last_sync_at: now.toISOString() });
    if (createErr) return json(req, 500, { error: 'profile_create_failed' });
  }

  // VIP bayrağı: sunucudaki vip_until geçerliyse aktif (istemciye güvenilmez).
  const vipUntil = prof?.vip_until ? Date.parse(prof.vip_until) : NaN;
  const isVip = !Number.isNaN(vipUntil) && vipUntil > now.getTime();

  // VIP görevlerini yalnızca VIP kullanıcılar alabilir.
  if (meta.vip && !isVip) {
    return json(req, 403, { error: 'vip_required' });
  }

  // ---------- Günlük kontrol: bu görev bugün daha önce alındı mı? ----------
  const { data: lastClaim } = await supabase
    .from('quest_claims')
    .select('day')
    .eq('username', username)
    .eq('quest_id', questId)
    .maybeSingle();

  if (lastClaim?.day === today) {
    return json(req, 409, { error: 'already_claimed_today' });
  }

  // ---------- Ödülü onayla: alımı kaydet ----------
  const { error: writeErr } = await supabase.from('quest_claims').upsert(
    { username, quest_id: questId, claimed_at: now.toISOString(), day: today },
    { onConflict: 'username,quest_id' }
  );
  if (writeErr) return json(req, 500, { error: 'claim_write_failed' });

  // Onaylanan ödül miktarını istemciye döndür (istemci bu miktarı uygular).
  const reward = rewardFor(meta.difficulty, isVip, meta.vip);

  return json(req, 200, {
    ok: true,
    claimedAt: now.toISOString(),
    day: today,
    isVip,
    reward,
  });
});
