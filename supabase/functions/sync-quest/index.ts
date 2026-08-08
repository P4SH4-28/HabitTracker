// ============================================================
// sync-quest — Supabase Edge Function (Habit Tracker Katman 3)
// Görev ödüllerini SUNUCU SAATİNE göre doğrular (hileci duvarı):
// - Bekleme süresi (cooldown) sunucu saatiyle hesaplanır → cihaz saati
//   ileri alınsa bile görev süresinden önce yeniden ödül alınamaz.
// - Günlük ödül sayısı sunucuda sınırlanır (MAX_CLAIMS_PER_DAY) → "Yaptım"
//   spam'ı ile sınırsız altın kasılamaz.
// - Yasaklı hesapların ödül onayı tamamen durdurulur.
// - Fonksiyon ödül MİKTARI vermez; yalnızca onay döner. Altın/XP miktarları
//   yine sync-profile'in günlük tavan defterinden geçer (çifte sayım olmaz).
//
// Gereksinim: quest_claims tablosu (bkz. supabase/quest-claims.sql).
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
  easy: { cooldownMs: 30 * 60 * 1000, xp: 10, gold: 5 },
  medium: { cooldownMs: 45 * 60 * 1000, xp: 25, gold: 10 },
  hard: { cooldownMs: 60 * 60 * 1000, xp: 50, gold: 20 },
  veryHard: { cooldownMs: 120 * 60 * 1000, xp: 100, gold: 40 },
} as const;

type Difficulty = keyof typeof DIFF;

// Görev kataloğu — istemcideki QUEST_CATALOG ile aynı id'ler.
const CATALOG: Record<string, { type: 'auto' | 'manual'; difficulty: Difficulty }> = {
  // BASİT (22)
  q_auto_completions_3: { type: 'auto', difficulty: 'easy' },
  q_auto_pomodoro_1: { type: 'auto', difficulty: 'easy' },
  q_auto_gold_10: { type: 'auto', difficulty: 'easy' },
  q_walk_10: { type: 'manual', difficulty: 'easy' },
  q_stretch_2: { type: 'manual', difficulty: 'easy' },
  q_water_1: { type: 'manual', difficulty: 'easy' },
  q_sleep_8: { type: 'manual', difficulty: 'easy' },
  q_fruit_1: { type: 'manual', difficulty: 'easy' },
  q_veg_1: { type: 'manual', difficulty: 'easy' },
  q_read_10: { type: 'manual', difficulty: 'easy' },
  q_podcast_20: { type: 'manual', difficulty: 'easy' },
  q_breath_5: { type: 'manual', difficulty: 'easy' },
  q_journal_3: { type: 'manual', difficulty: 'easy' },
  q_todo_1: { type: 'manual', difficulty: 'easy' },
  q_inbox_5: { type: 'manual', difficulty: 'easy' },
  q_bed_1: { type: 'manual', difficulty: 'easy' },
  q_laundry_1: { type: 'manual', difficulty: 'easy' },
  q_msg_1: { type: 'manual', difficulty: 'easy' },
  q_hi_1: { type: 'manual', difficulty: 'easy' },
  q_airplane_30: { type: 'manual', difficulty: 'easy' },
  q_desk_1: { type: 'manual', difficulty: 'easy' },
  q_expense_1: { type: 'manual', difficulty: 'easy' },
  // ORTA (16)
  q_auto_completions_5: { type: 'auto', difficulty: 'medium' },
  q_auto_pomodoro_2: { type: 'auto', difficulty: 'medium' },
  q_auto_gold_20: { type: 'auto', difficulty: 'medium' },
  q_walk_30: { type: 'manual', difficulty: 'medium' },
  q_home_workout_15: { type: 'manual', difficulty: 'medium' },
  q_sit_1: { type: 'manual', difficulty: 'medium' },
  q_water_1_5: { type: 'manual', difficulty: 'medium' },
  q_cook_1: { type: 'manual', difficulty: 'medium' },
  q_read_30: { type: 'manual', difficulty: 'medium' },
  q_lesson_15: { type: 'manual', difficulty: 'medium' },
  q_meditate_10: { type: 'manual', difficulty: 'medium' },
  q_puzzle_1: { type: 'manual', difficulty: 'medium' },
  q_deepwork_1: { type: 'manual', difficulty: 'medium' },
  q_plan_tomorrow: { type: 'manual', difficulty: 'medium' },
  q_clean_15: { type: 'manual', difficulty: 'medium' },
  q_call_30: { type: 'manual', difficulty: 'medium' },
  // ZOR (12)
  q_auto_completions_8: { type: 'auto', difficulty: 'hard' },
  q_auto_pomodoro_3: { type: 'auto', difficulty: 'hard' },
  q_auto_gold_35: { type: 'auto', difficulty: 'hard' },
  q_run_5k: { type: 'manual', difficulty: 'hard' },
  q_processed_0: { type: 'manual', difficulty: 'hard' },
  q_read_50: { type: 'manual', difficulty: 'hard' },
  q_write_500: { type: 'manual', difficulty: 'hard' },
  q_meditate_20: { type: 'manual', difficulty: 'hard' },
  q_finish_project: { type: 'manual', difficulty: 'hard' },
  q_deep_clean: { type: 'manual', difficulty: 'hard' },
  q_meet_1: { type: 'manual', difficulty: 'hard' },
  q_phone_off_2h: { type: 'manual', difficulty: 'hard' },
  // ÇOK ZOR (10)
  q_auto_completions_10: { type: 'auto', difficulty: 'veryHard' },
  q_auto_pomodoro_4: { type: 'auto', difficulty: 'veryHard' },
  q_auto_gold_50: { type: 'auto', difficulty: 'veryHard' },
  q_run_10k: { type: 'manual', difficulty: 'veryHard' },
  q_training_2h: { type: 'manual', difficulty: 'veryHard' },
  q_course_1h: { type: 'manual', difficulty: 'veryHard' },
  q_detox_1h: { type: 'manual', difficulty: 'veryHard' },
  q_day_project: { type: 'manual', difficulty: 'veryHard' },
  q_house_1: { type: 'manual', difficulty: 'veryHard' },
  q_quality_time: { type: 'manual', difficulty: 'veryHard' },
};

// Bir günde alınabilecek maksimum görev ödülü (spam koruması).
const MAX_CLAIMS_PER_DAY = 12;

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
  const diff = DIFF[meta.difficulty];

  const now = new Date();
  const today = utcDayKey(now);

  // ---------- Profili getir ----------
  let { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('username, banned, ban_reason')
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

  // ---------- Bekleme süresi (SUNUCU saati) ----------
  const { data: lastClaim } = await supabase
    .from('quest_claims')
    .select('claimed_at')
    .eq('username', username)
    .eq('quest_id', questId)
    .maybeSingle();

  if (lastClaim?.claimed_at) {
    const claimedAt = Date.parse(lastClaim.claimed_at);
    if (!Number.isNaN(claimedAt)) {
      const remainingMs = claimedAt + diff.cooldownMs - now.getTime();
      if (remainingMs > 0) {
        return json(req, 409, { error: 'cooldown', remainingMs });
      }
    }
  }

  // ---------- Günlük ödül limiti (SUNUCU günü) ----------
  const { count, error: countErr } = await supabase
    .from('quest_claims')
    .select('quest_id', { count: 'exact', head: true })
    .eq('username', username)
    .eq('day', today);

  if (countErr) return json(req, 500, { error: 'claim_count_failed' });
  if ((count ?? 0) >= MAX_CLAIMS_PER_DAY) {
    return json(req, 409, { error: 'daily_claim_limit' });
  }

  // ---------- Ödülü onayla: alımı kaydet ----------
  const { error: writeErr } = await supabase.from('quest_claims').upsert(
    { username, quest_id: questId, claimed_at: now.toISOString(), day: today },
    { onConflict: 'username,quest_id' }
  );
  if (writeErr) return json(req, 500, { error: 'claim_write_failed' });

  return json(req, 200, {
    ok: true,
    claimedAt: now.toISOString(),
    day: today,
  });
});
