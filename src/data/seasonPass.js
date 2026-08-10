// ============================================================
// seasonPass.js — Battle Pass (Season Pass) verisi
// Pass seviyesi TOPLAM XP'den türetilir (uygulama seviyesiyle aynı
// eğri, üst sınır PASS_MAX_LEVEL): passLevel = min(level, 20).
// Her seviyede iki ödül kutusu vardır:
//   free → herkese açık (altın paketleri, standart temalar/avatar/çerçeve)
//   vip  → yalnızca VIP kullanıcılara (Lottie animasyonlu çerçeveler,
//          özel temalar, nadir rozetler)
// Ödül tipleri: gold | theme | avatar | frame | lottieFrame | badge
// Rozetler (badge) ayrı "ownedBadges" koleksiyonunda tutulur ve
// profilde sergilenir.
// ============================================================

export const PASS_MAX_LEVEL = 20;
export const PASS_NAME = 'Sezon 1 — Yükseliş';

// Her seviyenin ödül kutusu. "null" = o kutuda ödül yok.
// Lottie çerçeveler: lottie.json assets/lottie/ altında tutulur.
export const PASS_LEVELS = [
  { level: 1, free: { type: 'gold', amount: 100 }, vip: { type: 'badge', badgeId: 'b_vip_starter', title: 'Başlangıç Rozeti' } },
  { level: 2, free: { type: 'theme', themeId: 'forest' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_heart', title: 'Animasyonlu Kalp Çerçevesi' } },
  { level: 3, free: { type: 'gold', amount: 150 }, vip: { type: 'gold', amount: 200 } },
  { level: 4, free: { type: 'avatar', avatarId: 'av_panda' }, vip: { type: 'theme', themeId: 'royal' } },
  { level: 5, free: { type: 'gold', amount: 200 }, vip: { type: 'badge', badgeId: 'b_vip_focus', title: 'Odak Rozeti' } },
  { level: 6, free: { type: 'theme', themeId: 'ocean' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_flame', title: 'Alev Çerçevesi' } },
  { level: 7, free: { type: 'gold', amount: 250 }, vip: { type: 'gold', amount: 300 } },
  { level: 8, free: { type: 'frame', frameId: 'fr_flame' }, vip: { type: 'theme', themeId: 'cherry' } },
  { level: 9, free: { type: 'gold', amount: 300 }, vip: { type: 'badge', badgeId: 'b_vip_grinder', title: 'Çalışkan Rozeti' } },
  { level: 10, free: { type: 'theme', themeId: 'sunset' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_glow', title: 'Işıltı Çerçevesi' } },
  { level: 11, free: { type: 'gold', amount: 350 }, vip: { type: 'gold', amount: 400 } },
  { level: 12, free: { type: 'avatar', avatarId: 'av_wolf' }, vip: { type: 'theme', themeId: 'candy' } },
  { level: 13, free: { type: 'gold', amount: 400 }, vip: { type: 'badge', badgeId: 'b_vip_elite', title: 'Elit Rozeti' } },
  { level: 14, free: { type: 'theme', themeId: 'galaxy' }, vip: { type: 'frame', frameId: 'fr_neon' } },
  { level: 15, free: { type: 'gold', amount: 500 }, vip: { type: 'gold', amount: 500 } },
  { level: 16, free: { type: 'frame', frameId: 'fr_diamond' }, vip: { type: 'theme', themeId: 'dragon' } },
  { level: 17, free: { type: 'gold', amount: 600 }, vip: { type: 'badge', badgeId: 'b_vip_legend', title: 'Efsane Rozeti' } },
  { level: 18, free: { type: 'theme', themeId: 'cyber' }, vip: { type: 'frame', frameId: 'fr_dragon' } },
  { level: 19, free: { type: 'gold', amount: 750 }, vip: { type: 'gold', amount: 750 } },
  { level: 20, free: { type: 'avatar', avatarId: 'av_dragon' }, vip: { type: 'badge', badgeId: 'b_vip_god', title: 'Tanrı Rozeti' } },
];

// Rozet kataloğu (profilde gösterilir).
export const BADGES = {
  b_vip_starter: { id: 'b_vip_starter', name: 'Başlangıç', emoji: '🌱', color: '#7C9EFF' },
  b_vip_focus: { id: 'b_vip_focus', name: 'Odak', emoji: '🎯', color: '#FF7C9E' },
  b_vip_grinder: { id: 'b_vip_grinder', name: 'Çalışkan', emoji: '⚒️', color: '#FFB84D' },
  b_vip_elite: { id: 'b_vip_elite', name: 'Elit', emoji: '🏆', color: '#C9A0FF' },
  b_vip_legend: { id: 'b_vip_legend', name: 'Efsane', emoji: '🐉', color: '#FF6B6B' },
  b_vip_god: { id: 'b_vip_god', name: 'Tanrı', emoji: '👑', color: '#FFD700' },
};

// Toplam XP'den pass seviyesini hesaplar (app seviyesiyle aynı eğri).
// L1: 0, L2: 100, L3: 300, L4: 600, ...  Ln: 100·n·(n-1)/2
export function passLevelFromXp(totalXp) {
  let level = 1;
  let cum = 0;
  while (level < PASS_MAX_LEVEL && totalXp >= cum + level * 100) {
    cum += level * 100;
    level += 1;
  }
  return { level, cumXp: cum, nextThreshold: level * 100 };
}

// Pass seviyesinin ödül kutusunu döndürür (yoksa null).
export function getPassLevel(level) {
  return PASS_LEVELS.find((l) => l.level === level) || null;
}

// Bir kutunun ödülü alınmış mı? passClaims: { "3_free": true, "3_vip": true }
export function passRewardClaimed(passClaims, level, track) {
  return !!passClaims?.[`${level}_${track}`];
}

// Ödül tipinin kısa açıklaması (ekran gösterimi).
export function rewardLabel(reward) {
  if (!reward) return '—';
  switch (reward.type) {
    case 'gold':
      return `${reward.amount} 🪙`;
    case 'theme':
      return 'Tema';
    case 'avatar':
      return 'Avatar';
    case 'frame':
      return 'Çerçeve';
    case 'lottieFrame':
      return '✨ Animasyonlu Çerçeve';
    case 'badge':
      return `Rozet: ${reward.title || ''}`;
    default:
      return 'Ödül';
  }
}
