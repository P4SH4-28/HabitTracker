// ============================================================
// sync-profile — Supabase Edge Function (Habit Tracker Katman 3)
// Günlük XP/Altın kazançlarını sunucu tarafında doğrular:
// - Yalnızca DELTA (fark) kabul eder; mutlak değerler güvenilmez.
// - daily_earnings defterine günlük tavanı (500 XP / 150 🪙) uygular.
// - Cihaz tarihi ileri alınmışsa (claimedDay > sunucuGünü + 1) isteği
//   reddetmez ama günü sunucu gününe kıstırır (warn: clock_ahead).
// - Rate limit: aynı profil 10 saniyede bir defadan fazla sync edemez.
// - Tavan aşımı tespit edilirse profil "flagged" işaretlenir (Katman 4).
// - Yalnızca servis rolüyle yazar (RLS'yi bypass eder); istemci anahtarı
//   profiles tablosunda yazma yapamaz (bkz. supabase-anti-farm.sql).
//
// Deploy: Supabase Dashboard → Edge Functions → yapıştır → Deploy
// (JWT doğrulaması KAPALI olmalı: "Verify JWT" işaretsiz bırakılır —
//  istemci anon key ile değil doğrudan HTTP ile çağırır).
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const DAY_XP_CAP = 500;
const DAY_GOLD_CAP = 150;
const MIN_SYNC_MS = 10_000;
// Cihaz günü sunucu gününden en fazla +1 gün ileride olabilir
// (saat dilimi toleransı; daha fazlası = saat oynatma).
const MAX_DAY_AHEAD = 1;

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
  if (!username) return json(req, 400, { error: 'username_required' });

  // Deltalar sayı olmalı; eksikse 0 kabul edilir. NaN → reddet.
  const deltaXpRaw = Number(body?.deltaXp);
  const deltaGoldRaw = Number(body?.deltaGold);
  if (!Number.isFinite(deltaXpRaw) || !Number.isFinite(deltaGoldRaw)) {
    return json(req, 400, { error: 'invalid_delta' });
  }
  const claimedDay = typeof body?.claimedDay === 'string' ? body.claimedDay : null;

  // Profil meta bilgisi (isteğe bağlı; yalnızca verilirse yazılır).
  const bio = typeof body?.bio === 'string' ? body.bio.trim().slice(0, 200) : null;
  const photoUrl =
    typeof body?.photoUrl === 'string' && body.photoUrl.trim().length > 0
      ? body.photoUrl.trim().slice(0, 300)
      : typeof body?.photoUrl === 'string'
        ? ''
        : null;

  const now = new Date();
  const serverDay = utcDayKey(now);

  // ---------- Profili getir ----------
  let { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('xp, coins, last_sync_at, banned, ban_reason')
    .eq('username', username)
    .maybeSingle();

  if (profErr && profErr.code !== 'PGRST116') {
    return json(req, 500, { error: 'profile_lookup_failed' });
  }

  // ---------- Yasak kontrolü ----------
  // Banlı kullanıcının kazanç senkronu tamamen durdurulur; uygulaması
  // yasak ekranı gösterir (403 + reason). Yeni profiller asla banlı doğmaz.
  if (prof?.banned) {
    return json(req, 403, {
      error: 'banned',
      warn: 'banned',
      reason: prof.ban_reason || null,
    });
  }

  // ---------- Rate limit (10 sn) ----------
  // Yalnızca KAYITLI profillere uygulanır: yeni oluşturulan profil zaten
  // last_sync_at = şimdi taşır; kontrol edilirse ilk senkron hep 429 olur.
  if (prof?.last_sync_at) {
    const last = Date.parse(prof.last_sync_at);
    if (!Number.isNaN(last) && now.getTime() - last < MIN_SYNC_MS) {
      return json(req, 429, {
        error: 'rate_limited',
        warn: 'rate_limited',
        retryAfterMs: MIN_SYNC_MS - (now.getTime() - last),
      });
    }
  }

  // ---------- Profili oluştur (yoksa) ----------
  if (!prof) {
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .insert({ username, xp: 0, coins: 0, last_sync_at: now.toISOString() })
      .select('xp, coins, last_sync_at')
      .single();
    if (createErr) return json(req, 500, { error: 'profile_create_failed' });
    prof = created;
  }

  // ---------- Gün seçimi: cihazın "bugün"ü mü, sunucu günü mü? ----------
  // claimedDay sunucu gününü +MAX_DAY_AHEAD aşarsa saat ileri alınmıştır:
  // isteği reddetmek yerine günü sunucu gününe kıstır ve kullanıcıyı uyar.
  let day = serverDay;
  let clockAhead = false;
  if (claimedDay && /^\d{4}-\d{2}-\d{2}$/.test(claimedDay)) {
    if (claimedDay <= serverDay) {
      day = claimedDay; // geçmiş/güncel gün normal kabul edilir
    } else {
      const daysDiff = Math.round(
        (Date.parse(claimedDay + 'T00:00:00Z') - Date.parse(serverDay + 'T00:00:00Z')) / 86400000
      );
      if (daysDiff <= MAX_DAY_AHEAD) {
        day = claimedDay; // saat dilimi toleransı
      } else {
        day = serverDay; // kıstır
        clockAhead = true;
      }
    }
  }

  // ---------- Günlük defter ----------
  const { data: dayRow } = await supabase
    .from('daily_earnings')
    .select('xp, gold')
    .eq('username', username)
    .eq('day', day)
    .maybeSingle();
  const usedXp = dayRow?.xp ?? 0;
  const usedGold = dayRow?.gold ?? 0;

  // ---------- Tavan doğrulaması ----------
  // Pozitif kazançlar tavana kıstırılır; negatif deltalar (geri alma/ceza)
  // serbestçe düşülür — böylece birikmiş tavan asla aşılamaz.
  let acceptedXp = deltaXpRaw;
  let acceptedGold = deltaGoldRaw;
  let clamped = false;
  if (acceptedXp > 0) {
    acceptedXp = Math.min(acceptedXp, Math.max(0, DAY_XP_CAP - usedXp));
    if (acceptedXp < deltaXpRaw) clamped = true;
  }
  if (acceptedGold > 0) {
    acceptedGold = Math.min(acceptedGold, Math.max(0, DAY_GOLD_CAP - usedGold));
    if (acceptedGold < deltaGoldRaw) clamped = true;
  }

  const newXp = Math.max(0, (prof.xp ?? 0) + Math.round(acceptedXp));
  const newGold = Math.max(0, (prof.coins ?? 0) + Math.round(acceptedGold));
  const newDayXp = Math.max(0, usedXp + Math.round(acceptedXp));
  const newDayGold = Math.max(0, usedGold + Math.round(acceptedGold));

  // ---------- Yaz: defter + profil ----------
  const { error: dayErr } = await supabase.from('daily_earnings').upsert(
    { username, day, xp: newDayXp, gold: newDayGold, updated_at: now.toISOString() },
    { onConflict: 'username,day' }
  );
  if (dayErr) return json(req, 500, { error: 'ledger_write_failed' });

  // Katman 4: tavan aşımı tespiti → profil bayraklanır (liderlikte ⚠️).
  const flagged = clamped || clockAhead;
  const updateFields = {
    xp: newXp,
    coins: newGold,
    last_sync_at: now.toISOString(),
    ...(flagged
      ? {
          flagged: true,
          flagged_reason: clockAhead
            ? `clock_ahead (claimed ${claimedDay})`
            : `daily_cap_clamped (${day})`,
        }
      : {}),
  };
  if (bio !== null) updateFields.bio = bio;
  if (photoUrl !== null) updateFields.photo_url = photoUrl || null;
  const { error: profUpdErr } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('username', username);
  if (profUpdErr) return json(req, 500, { error: 'profile_update_failed' });

  return json(req, 200, {
    ok: true,
    serverXp: newXp,
    serverGold: newGold,
    acceptedXp,
    acceptedGold,
    day,
    flagged,
    ...(clockAhead ? { warn: 'clock_ahead' } : {}),
  });
});
