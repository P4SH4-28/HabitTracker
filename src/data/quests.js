// ============================================================
// Görev (quest) sistemi — GÜNDE 4 TEMEL + 4 VIP GÖREV (rotasyonlu)
// - Her gün gece yarısı sıfırlanır (gün anahtarı SUNUCU saatinden gelir).
// - Görevler havuzdan GÜNE GÖRE SEÇİLİR (seeded rastgele): her gün aynı
//   görevler gelmez, ama aynı gün içinde seçim sabittir (cihaz/saat fark
//   etmez). Seçim yalnızca gün anahtarından türetilir → saklama gerekmez.
// - Her görev günde BİR KEZ ödül verir; tekrar alınamaz.
// - Tüm görevler OTOMATİK ölçülür (alışkanlık tamamlama, odak seansı
//   süresi, seri koruma, günlük hedef yüzdesi). Manuel "Yaptım" yoktur.
// - VIP kullanıcılar +4 ekstra VIP görev görür (toplam 8) ve temel
//   görevlerde ×1.5 ödül çarpanı kazanır.
// ============================================================
import { calcStreak, completionForDay } from '../logic';

// Zorluk seviyeleri: etiket + taban ödüller (VIP çarpanı ayrıca uygulanır).
export const QUEST_DIFFICULTIES = {
  warmup: {
    label: 'Basit / Isınma',
    emoji: '🟢',
    xp: 20,
    gold: 20,
    colorKey: 'accent',
  },
  hard1: {
    label: 'Zor (I. Aşama)',
    emoji: '🟠',
    xp: 50,
    gold: 50,
    colorKey: 'danger',
  },
  hard2: {
    label: 'Zor (II. Aşama)',
    emoji: '🔴',
    xp: 75,
    gold: 75,
    colorKey: 'primary',
  },
  impossible: {
    label: 'İmkansız',
    emoji: '💀',
    xp: 200,
    gold: 150,
    colorKey: 'gold',
  },
};

export const QUEST_DIFFICULTY_ORDER = ['warmup', 'hard1', 'hard2', 'impossible'];

// VIP ödül çarpanı: temel 4 görev VIP kullanıcıya ×1.5 verir.
// Kesirli sonuçlar en yakın 5'e yuvarlanır (20→30, 50→75, 75→115, 200→300).
export const VIP_QUEST_MULTIPLIER = 1.5;

// VIP süresi ve fiyatı (altınla satın alma).
export const VIP_PRICE_GOLD = 5000;
export const VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

// Ölçülebilir metrikler → stats.day anahtarı veya anlık türetme:
// - completions : bugün tamamlanan alışkanlık sayısı (sayaç)
// - pomodoro    : bugün bitirilen odak seansı sayısı (sayaç)
// - focusMinutes: bugün toplam odak seansı süresi (dakika, sayaç)
// - streaksKept : bugün SERİSİ DEVAM EDEN farklı alışkanlık sayısı (türetilir)
// - goalsPct    : bugünkü alışkanlık hedeflerinin tamamlanma yüzdesi (türetilir)
export const METRIC = {
  completions: 'completions',
  pomodoro: 'pomodoro',
  focusMinutes: 'focusMinutes',
  streaksKept: 'streaksKept',
  goalsPct: 'goalsPct',
};

// Bir odak seansının dakika karşılığı (25 dakikalık varsayılan süre).
export const POMODORO_MINUTES = 25;

// -------- TEMEL GÖREV HAVUZU (her zorlukta birden fazla seçenek) --------
// "gold" metriği KALDIRILDI: "40 altın topla" gibi kısır döngü görevleri
// yok. Görevler gerçek davranışa bağlıdır (tamamlama / odak süresi /
// seri koruma / hedef yüzdesi).
export const BASE_QUEST_POOL = [
  // --- Isınma (kolay) ---
  {
    id: 'daily_warmup_habit2',
    type: 'auto',
    metric: METRIC.completions,
    target: 2,
    difficulty: 'warmup',
    emoji: '✅',
    title: '2 alışkanlık tamamla',
    desc: 'Isınma turu: bugün 2 alışkanlığını işaretle',
  },
  {
    id: 'daily_warmup_focus1',
    type: 'auto',
    metric: METRIC.pomodoro,
    target: 1,
    difficulty: 'warmup',
    emoji: '🍅',
    title: '1 odak seansı bitir',
    desc: 'Isınma: tek bir odak seansıyla güne başla',
  },
  {
    id: 'daily_warmup_streak2',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 2,
    difficulty: 'warmup',
    emoji: '🔥',
    title: '2 seriyi devam ettir',
    desc: 'Isınma: 2 farklı alışkanlık serini bugün de koru',
  },
  // --- Zor (I. Aşama) ---
  {
    id: 'daily_hard1_habit5',
    type: 'auto',
    metric: METRIC.completions,
    target: 5,
    difficulty: 'hard1',
    emoji: '🎯',
    title: '5 alışkanlık tamamla',
    desc: 'I. Aşama: 5 alışkanlığı tamamlayıp günü zorla',
  },
  {
    id: 'daily_hard1_focus45',
    type: 'auto',
    metric: METRIC.focusMinutes,
    target: 45,
    difficulty: 'hard1',
    emoji: '🍅',
    title: '45 dakika odak seansı yap',
    desc: 'I. Aşama: toplam 45 dakika derin çalış',
  },
  {
    id: 'daily_hard1_streak3',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 3,
    difficulty: 'hard1',
    emoji: '🔥',
    title: '3 seriyi devam ettir',
    desc: 'I. Aşama: 3 farklı alışkanlık serini koru',
  },
  // --- Zor (II. Aşama) ---
  {
    id: 'daily_hard2_habit8',
    type: 'auto',
    metric: METRIC.completions,
    target: 8,
    difficulty: 'hard2',
    emoji: '🏆',
    title: '8 alışkanlık tamamla',
    desc: 'II. Aşama: günün çoğunu tamamla',
  },
  {
    id: 'daily_hard2_focus75',
    type: 'auto',
    metric: METRIC.focusMinutes,
    target: 75,
    difficulty: 'hard2',
    emoji: '🍅',
    title: '75 dakika odak seansı yap',
    desc: 'II. Aşama: toplam 75 dakika derin çalış',
  },
  {
    id: 'daily_hard2_goals100',
    type: 'auto',
    metric: METRIC.goalsPct,
    target: 100,
    difficulty: 'hard2',
    emoji: '💯',
    title: 'Günlük hedeflerini %100 tamamla',
    desc: 'II. Aşama: bugünkü tüm alışkanlıklarını bitir',
  },
  {
    id: 'daily_hard2_streak4',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 4,
    difficulty: 'hard2',
    emoji: '🔥',
    title: '4 seriyi devam ettir',
    desc: 'II. Aşama: 4 farklı alışkanlık serini koru',
  },
  // --- İmkansız ---
  {
    id: 'daily_impossible_habit10',
    type: 'auto',
    metric: METRIC.completions,
    target: 10,
    difficulty: 'impossible',
    emoji: '💀',
    title: '10 alışkanlık tamamla',
    desc: 'İmkansız: tüm alışkanlıklarını bitir',
  },
  {
    id: 'daily_impossible_focus100',
    type: 'auto',
    metric: METRIC.focusMinutes,
    target: 100,
    difficulty: 'impossible',
    emoji: '💀',
    title: '100 dakika odak seansı yap',
    desc: 'İmkansız: toplam 100 dakika derin çalış',
  },
  {
    id: 'daily_impossible_streak5',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 5,
    difficulty: 'impossible',
    emoji: '💀',
    title: '5 seriyi devam ettir',
    desc: 'İmkansız: 5 farklı alışkanlık serini koru',
  },
  {
    id: 'daily_impossible_focus3',
    type: 'auto',
    metric: METRIC.pomodoro,
    target: 3,
    difficulty: 'impossible',
    emoji: '💀',
    title: '3 odak seansı bitir',
    desc: 'İmkansız: üç tam odak turu tamamla',
  },
];

// -------- VIP GÖREV HAVUZU (yalnızca Pass sahipleri görür) --------
export const VIP_QUEST_POOL = [
  {
    id: 'vip_warmup_habit3',
    type: 'auto',
    metric: METRIC.completions,
    target: 3,
    difficulty: 'warmup',
    emoji: '👑',
    title: '3 alışkanlık tamamla (VIP)',
    desc: 'VIP ısınma: 3 alışkanlıkla başla',
  },
  {
    id: 'vip_warmup_focus1',
    type: 'auto',
    metric: METRIC.pomodoro,
    target: 1,
    difficulty: 'warmup',
    emoji: '👑',
    title: '1 odak seansı bitir (VIP)',
    desc: 'VIP ısınma: tek odak turu tamamla',
  },
  {
    id: 'vip_warmup_streak2',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 2,
    difficulty: 'warmup',
    emoji: '👑',
    title: '2 seriyi devam ettir (VIP)',
    desc: 'VIP ısınma: 2 alışkanlık serini koru',
  },
  {
    id: 'vip_hard1_habit7',
    type: 'auto',
    metric: METRIC.completions,
    target: 7,
    difficulty: 'hard1',
    emoji: '👑',
    title: '7 alışkanlık tamamla (VIP)',
    desc: 'VIP I. Aşama: 7 alışkanlığı tamamla',
  },
  {
    id: 'vip_hard1_focus45',
    type: 'auto',
    metric: METRIC.focusMinutes,
    target: 45,
    difficulty: 'hard1',
    emoji: '👑',
    title: '45 dakika odak seansı yap (VIP)',
    desc: 'VIP I. Aşama: 45 dakika derin çalış',
  },
  {
    id: 'vip_hard1_streak3',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 3,
    difficulty: 'hard1',
    emoji: '👑',
    title: '3 seriyi devam ettir (VIP)',
    desc: 'VIP I. Aşama: 3 alışkanlık serini koru',
  },
  {
    id: 'vip_hard2_habit9',
    type: 'auto',
    metric: METRIC.completions,
    target: 9,
    difficulty: 'hard2',
    emoji: '👑',
    title: '9 alışkanlık tamamla (VIP)',
    desc: 'VIP II. Aşama: neredeyse hepsini bitir',
  },
  {
    id: 'vip_hard2_focus75',
    type: 'auto',
    metric: METRIC.focusMinutes,
    target: 75,
    difficulty: 'hard2',
    emoji: '👑',
    title: '75 dakika odak seansı yap (VIP)',
    desc: 'VIP II. Aşama: 75 dakika derin çalış',
  },
  {
    id: 'vip_hard2_goals100',
    type: 'auto',
    metric: METRIC.goalsPct,
    target: 100,
    difficulty: 'hard2',
    emoji: '💯',
    title: 'Günlük hedeflerini %100 tamamla (VIP)',
    desc: 'VIP II. Aşama: bugünkü tüm alışkanlıklarını bitir',
  },
  {
    id: 'vip_hard2_streak4',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 4,
    difficulty: 'hard2',
    emoji: '👑',
    title: '4 seriyi devam ettir (VIP)',
    desc: 'VIP II. Aşama: 4 alışkanlık serini koru',
  },
  {
    id: 'vip_impossible_habit10',
    type: 'auto',
    metric: METRIC.completions,
    target: 10,
    difficulty: 'impossible',
    emoji: '💎',
    title: '10 alışkanlık tamamla (VIP)',
    desc: 'VIP İmkansız: tüm alışkanlıklarını bitir',
  },
  {
    id: 'vip_impossible_focus100',
    type: 'auto',
    metric: METRIC.focusMinutes,
    target: 100,
    difficulty: 'impossible',
    emoji: '💎',
    title: '100 dakika odak seansı yap (VIP)',
    desc: 'VIP İmkansız: 100 dakika derin çalış',
  },
  {
    id: 'vip_impossible_streak5',
    type: 'auto',
    metric: METRIC.streaksKept,
    target: 5,
    difficulty: 'impossible',
    emoji: '💎',
    title: '5 seriyi devam ettir (VIP)',
    desc: 'VIP İmkansız: 5 alışkanlık serini koru',
  },
  {
    id: 'vip_impossible_focus6',
    type: 'auto',
    metric: METRIC.pomodoro,
    target: 6,
    difficulty: 'impossible',
    emoji: '💎',
    title: '6 odak seansı bitir (VIP)',
    desc: 'VIP İmkansız: altı tam odak turu tamamla',
  },
];

// Tüm olası görev id'leri (kayıt filtresi + sunucu kataloğu eşleşmesi için).
export const ALL_QUEST_IDS = [...BASE_QUEST_POOL, ...VIP_QUEST_POOL].map((q) => q.id);

// ---------- Günlük rotasyon: gün anahtarından seeded seçim ----------
// Aynı günde herkes aynı görevleri görür (rekabet adil), ama her gün
// farklı görevler gelir. Seçim saklanmaz — her zaman gün anahtarından
// aynı şekilde türetilir (cihaz değişse bile tutarlı kalır).
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministik rastgele üretici (mulberry32).
function mulberry32(seed) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne(pool, rnd) {
  return pool[Math.floor(rnd() * pool.length)];
}

// "dayKey" için günün görevlerini üretir: { base: [4], vip: [4] }.
// Her zorluktan bir görev seçilir (havuzdaki seçeneklerden).
export function getDailyQuests(dayKey) {
  const rnd = mulberry32(hashSeed(dayKey || ''));
  const base = QUEST_DIFFICULTY_ORDER.map((d) =>
    pickOne(BASE_QUEST_POOL.filter((q) => q.difficulty === d), rnd)
  );
  const vip = QUEST_DIFFICULTY_ORDER.map((d) =>
    pickOne(VIP_QUEST_POOL.filter((q) => q.difficulty === d), rnd)
  );
  return { base, vip };
}

// Görev id'sine göre görevi bulur (havuzlarda; yoksa null).
export function getQuest(id) {
  return (
    BASE_QUEST_POOL.find((q) => q.id === id) ||
    VIP_QUEST_POOL.find((q) => q.id === id) ||
    null
  );
}

// Görevin ŞU ANKİ ham değeri (anlık görüntü almak için — ödül kaydına yazılır).
// "habits" yalnızca türetilmiş metrikler için gerekir.
export function questMetricValue(quest, dayStats, habits, today) {
  if (!quest || quest.type !== 'auto') return 0;
  const current = dayStats?.key === today ? dayStats : emptyLike(dayStats, today);
  switch (quest.metric) {
    case METRIC.streaksKept:
      return (habits || []).filter((h) => calcStreak(h.completedDates, today) >= 1).length;
    case METRIC.goalsPct: {
      const total = (habits || []).length;
      const done = completionForDay(habits || [], today);
      return total > 0 ? Math.round((done / total) * 100) : 0;
    }
    default:
      return current?.[quest.metric] ?? 0;
  }
}

function emptyLike(dayStats, today) {
  return dayStats && dayStats.key === today
    ? dayStats
    : { key: today, completions: 0, pomodoro: 0, focusMinutes: 0, goldEarned: 0 };
}

// Otomatik görevin bugünkü ilerlemesi: günlük sayaç - son alım anlık görüntüsü.
// Gün değişince sayaçlar zaten sıfırlanır; eski anlık görüntü yeni günde
// ilerlemeyi etkilemez (day kontrolü ayrıca yapılır).
export function questProgress(quest, dayStats, claims, today, habits) {
  if (!quest || quest.type !== 'auto') return 0;
  const snapshot = claims?.[quest.id]?.value ?? 0;
  const snapDay = claims?.[quest.id]?.day ?? null;
  const current = questMetricValue(quest, dayStats, habits, today);
  const base = snapDay === today ? snapshot : 0;
  return Math.max(0, current - base);
}

// Görev bu gün ödül alındı mı? (claims içinde aynı gün kaydı var mı)
export function questClaimedToday(quest, claims, today) {
  if (!quest) return false;
  const c = claims?.[quest.id];
  return !!c && c.day === today;
}

// Görev ödülü şu an alınabilir mi?
// - Bugün daha önce alınmamış olmalı (günlük sıfırlama).
// - Otomatik görevlerde hedef bugünkü sayaçlarla tamamlanmış olmalı.
export function canClaimQuest(quest, dayStats, claims, today, habits) {
  if (!quest) return false;
  if (questClaimedToday(quest, claims, today)) return false;
  if (quest.type !== 'auto') return false;
  return questProgress(quest, dayStats, claims, today, habits) >= quest.target;
}

// Görevin ödülünü hesaplar. VIP: temel görevlerde ×1.5 çarpan (5'e yuvarlı),
// VIP görevler zaten kendi ödüllerini taşır (temel ×1.5 değerleriyle tanımlı).
export function questReward(quest, isVip) {
  const diff = QUEST_DIFFICULTIES[quest.difficulty] || QUEST_DIFFICULTIES.warmup;
  const base = { xp: diff.xp, gold: diff.gold };
  if (isVip && !quest.id.startsWith('vip_')) {
    const round5 = (n) => Math.round((n * VIP_QUEST_MULTIPLIER) / 5) * 5;
    return { xp: round5(base.xp), gold: round5(base.gold) };
  }
  return base;
}

// Günlük "günlük sayaçları" güncelleme yardımcısı (saf fonksiyon).
// stats.day = { key, completions, pomodoro, focusMinutes, goldEarned,
// xpEarned, bankReleased } — gün değişince sayaçlar sıfırlanır.
// focusMinutes: odak seansı süresi (dakika) — "45 dk odak" görevi buradan okur.
export function bumpDay(stats, today, delta) {
  const base =
    stats.day && stats.day.key === today
      ? stats.day
      : {
          key: today,
          completions: 0,
          pomodoro: 0,
          focusMinutes: 0,
          goldEarned: 0,
          xpEarned: 0,
          bankReleased: 0,
        };
  return {
    ...stats,
    day: {
      key: today,
      completions: Math.max(0, base.completions + (delta.completions || 0)),
      pomodoro: Math.max(0, base.pomodoro + (delta.pomodoro || 0)),
      focusMinutes: Math.max(0, (base.focusMinutes || 0) + (delta.focusMinutes || 0)),
      goldEarned: Math.max(0, base.goldEarned + (delta.goldEarned || 0)),
      xpEarned: Math.max(0, base.xpEarned + (delta.xpEarned || 0)),
      bankReleased: Math.max(0, (base.bankReleased || 0) + (delta.bankReleased || 0)),
    },
  };
}
