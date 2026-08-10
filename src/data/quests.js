// ============================================================
// Görev (quest) sistemi — GÜNDE 4 TEMEL GÖREV (yeni nesil)
// Eski 60 görevlik katalog + bekleme süresi sistemi kaldırıldı.
// Yeni sistem: her gün sıfırlanan 4 görev (Isınma / Zor I /
// Zor II / İmkansız). VIP kullanıcılar +4 ekstra VIP görev görür
// (toplam 8) ve temel görev ödüllerinde ×1.5 çarpan alır.
// - Tüm görevler OTOMATİK ölçülür (günlük sayaçlar: alışkanlık,
//   odak seansı, kazanılan altın). Manuel "Yaptım" yoktur — hileci
//   duvarı için her şey uygulamanın kendi sayaçlarından sayılır.
// - Her görev günde BİR KEZ ödül verir; gün anahtarı değişince
//   (yerel saat değil SUNUCU saati) yeniden ödüllendirilebilir.
// ============================================================

// Zorluk seviyeleri: etiket + taban ödüller (VIP çarpanı ayrıca uygulanır).
export const QUEST_DIFFICULTIES = {
  warmup: {
    label: 'Isınma',
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

// Otomatik görevlerin ölçüleceği günlük sayaç adı → stats.day anahtarı.
export const METRIC = {
  completions: 'completions',
  pomodoro: 'pomodoro',
  gold: 'goldEarned',
};

// -------- GÜNÜN TEMEL 4 GÖREVİ (her kullanıcıya açık) --------
export const DAILY_QUESTS = [
  {
    id: 'daily_warmup',
    type: 'auto',
    metric: METRIC.completions,
    target: 3,
    difficulty: 'warmup',
    emoji: '✅',
    title: '3 alışkanlık tamamla',
    desc: 'Isınma turu: bugün 3 alışkanlığını işaretle',
  },
  {
    id: 'daily_hard1',
    type: 'auto',
    metric: METRIC.completions,
    target: 5,
    difficulty: 'hard1',
    emoji: '🎯',
    title: '5 alışkanlık tamamla',
    desc: 'I. Aşama: 5 alışkanlığı tamamlayıp günü zorla',
  },
  {
    id: 'daily_hard2',
    type: 'auto',
    metric: METRIC.pomodoro,
    target: 2,
    difficulty: 'hard2',
    emoji: '🍅',
    title: '2 odak seansı bitir',
    desc: 'II. Aşama: iki pomodoro ile derin çalış',
  },
  {
    id: 'daily_impossible',
    type: 'auto',
    metric: METRIC.gold,
    target: 40,
    difficulty: 'impossible',
    emoji: '💀',
    title: '40 altın kazan',
    desc: 'İmkansız: gün içinde 40 altın topla',
  },
];

// -------- VIP GÖREVLERİ (yalnızca Pass sahipleri görür) --------
export const VIP_QUESTS = [
  {
    id: 'vip_warmup',
    type: 'auto',
    metric: METRIC.completions,
    target: 4,
    difficulty: 'warmup',
    emoji: '👑',
    title: '4 alışkanlık tamamla (VIP)',
    desc: 'VIP ısınma: 4 alışkanlıkla başla',
  },
  {
    id: 'vip_hard1',
    type: 'auto',
    metric: METRIC.completions,
    target: 7,
    difficulty: 'hard1',
    emoji: '👑',
    title: '7 alışkanlık tamamla (VIP)',
    desc: 'VIP I. Aşama: 7 alışkanlığı tamamla',
  },
  {
    id: 'vip_hard2',
    type: 'auto',
    metric: METRIC.pomodoro,
    target: 3,
    difficulty: 'hard2',
    emoji: '👑',
    title: '3 odak seansı bitir (VIP)',
    desc: 'VIP II. Aşama: üç pomodoro tamamla',
  },
  {
    id: 'vip_impossible',
    type: 'auto',
    metric: METRIC.gold,
    target: 60,
    difficulty: 'impossible',
    emoji: '💎',
    title: '60 altın kazan (VIP)',
    desc: 'VIP İmkansız: 60 altın topla',
  },
];

// Görev id'sine göre görevi bulur (yoksa null).
export function getQuest(id) {
  return (
    DAILY_QUESTS.find((q) => q.id === id) ||
    VIP_QUESTS.find((q) => q.id === id) ||
    null
  );
}

// Otomatik görevin bugünkü ilerlemesi: günlük sayaç - son alım anlık görüntüsü.
// Gün değişince sayaçlar zaten sıfırlanır; eski anlık görüntü yeni günde
// ilerlemeyi etkilemez (day kontrolü ayrıca yapılır).
export function questProgress(quest, dayStats, claims, today) {
  if (!quest || quest.type !== 'auto') return 0;
  const snapshot = claims?.[quest.id]?.value ?? 0;
  const snapDay = claims?.[quest.id]?.day ?? null;
  const current = dayStats?.key === today ? (dayStats?.[quest.metric] ?? 0) : 0;
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
export function canClaimQuest(quest, dayStats, claims, today) {
  if (!quest) return false;
  if (questClaimedToday(quest, claims, today)) return false;
  if (quest.type !== 'auto') return false;
  return questProgress(quest, dayStats, claims, today) >= quest.target;
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
// stats.day = { key, completions, pomodoro, goldEarned, xpEarned, bankReleased } —
// gün değişince sayaçlar sıfırlanır (yeni güne başlar). delta ile
// artır/azalt. xpEarned: günlük XP kazanç tavanının takibi için;
// goldEarned: hem görev metriği hem altın tavanı sayacıdır.
// bankReleased: XP kumbarasından o gün boşaltılan miktar (günde 500 sınırlı).
export function bumpDay(stats, today, delta) {
  const base =
    stats.day && stats.day.key === today
      ? stats.day
      : { key: today, completions: 0, pomodoro: 0, goldEarned: 0, xpEarned: 0, bankReleased: 0 };
  return {
    ...stats,
    day: {
      key: today,
      completions: Math.max(0, base.completions + (delta.completions || 0)),
      pomodoro: Math.max(0, base.pomodoro + (delta.pomodoro || 0)),
      goldEarned: Math.max(0, base.goldEarned + (delta.goldEarned || 0)),
      xpEarned: Math.max(0, base.xpEarned + (delta.xpEarned || 0)),
      bankReleased: Math.max(0, (base.bankReleased || 0) + (delta.bankReleased || 0)),
    },
  };
}
