// ============================================================
// seasonPass.js — Battle Pass (Season Pass) verisi
// Pass seviyesi TOPLAM XP'den türetilir; üst sınır PASS_MAX_LEVEL (50).
// XP eğrisi app seviyesinden bağımsız ve daha yumuşaktır: 1-10. seviyeler
// 100 XP, 11-20 → 200 XP, 21-30 → 300 XP, 31-40 → 400 XP, 41-50 → 500 XP
// ister (toplam 14.500 XP ile sezon bitirilir).
// Her seviyede iki ödül kutusu vardır:
//   free → herkese açık (altın paketleri, standart temalar/avatar/çerçeve)
//   vip  → yalnızca VIP kullanıcılara (Lottie animasyonlu çerçeveler,
//          özel temalar, nadir rozetler)
// Ödül tipleri: gold | theme | avatar | frame | lottieFrame | badge
// Rozetler (badge) ayrı "ownedBadges" koleksiyonunda tutulur ve
// profilde sergilenir.
// ============================================================

export const PASS_MAX_LEVEL = 50;
export const PASS_NAME = 'Sezon 1 — Yükseliş';

// Her seviyenin ödül kutusu. "null" = o kutuda ödül yok.
// Lottie çerçeveler: lottie.json assets/lottie/ altında tutulur.
// Dağılım: Free track'te temalar (3,7,11,15,...), avatarlar (4,8,12,...),
// çerçeveler (5,9,13,...) ve artan altın paketleri; VIP track'te
// animasyonlu çerçeveler (5,10,15,...), nadir temalar, rozetler ve altın.
export const PASS_LEVELS = [
  { level: 1, free: { type: 'gold', amount: 60 }, vip: { type: 'badge', badgeId: 'b_vip_starter', title: 'Başlangıç Rozeti' } },
  { level: 2, free: { type: 'gold', amount: 70 }, vip: { type: 'theme', themeId: 'royal' } },
  { level: 3, free: { type: 'theme', themeId: 'forest' }, vip: { type: 'gold', amount: 100 } },
  { level: 4, free: { type: 'avatar', avatarId: 'av_panda' }, vip: { type: 'badge', badgeId: 'b_vip_focus', title: 'Odak Rozeti' } },
  { level: 5, free: { type: 'frame', frameId: 'fr_ghost' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_heart', title: 'Animasyonlu Kalp Çerçevesi' } },
  { level: 6, free: { type: 'gold', amount: 100 }, vip: { type: 'gold', amount: 150 } },
  { level: 7, free: { type: 'theme', themeId: 'ocean' }, vip: { type: 'theme', themeId: 'dragon' } },
  { level: 8, free: { type: 'avatar', avatarId: 'av_owl' }, vip: { type: 'badge', badgeId: 'b_vip_grinder', title: 'Çalışkan Rozeti' } },
  { level: 9, free: { type: 'frame', frameId: 'fr_moon' }, vip: { type: 'gold', amount: 200 } },
  { level: 10, free: { type: 'gold', amount: 140 }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_flame', title: 'Alev Çerçevesi' } },
  { level: 11, free: { type: 'theme', themeId: 'lavender' }, vip: { type: 'gold', amount: 250 } },
  { level: 12, free: { type: 'avatar', avatarId: 'av_wolf' }, vip: { type: 'theme', themeId: 'cyber' } },
  { level: 13, free: { type: 'frame', frameId: 'fr_cloud' }, vip: { type: 'badge', badgeId: 'b_vip_elite', title: 'Elit Rozeti' } },
  { level: 14, free: { type: 'gold', amount: 180 }, vip: { type: 'gold', amount: 300 } },
  { level: 15, free: { type: 'theme', themeId: 'sunset' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_glow', title: 'Işıltı Çerçevesi' } },
  { level: 16, free: { type: 'avatar', avatarId: 'av_tiger' }, vip: { type: 'frame', frameId: 'fr_neon' } },
  { level: 17, free: { type: 'frame', frameId: 'fr_flame' }, vip: { type: 'theme', themeId: 'cherry' } },
  { level: 18, free: { type: 'gold', amount: 220 }, vip: { type: 'badge', badgeId: 'b_vip_legend', title: 'Efsane Rozeti' } },
  { level: 19, free: { type: 'theme', themeId: 'galaxy' }, vip: { type: 'gold', amount: 350 } },
  { level: 20, free: { type: 'avatar', avatarId: 'av_dino' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_heart', title: 'Animasyonlu Kalp Çerçevesi' } },
  { level: 21, free: { type: 'frame', frameId: 'fr_water' }, vip: { type: 'gold', amount: 400 } },
  { level: 22, free: { type: 'gold', amount: 260 }, vip: { type: 'theme', themeId: 'candy' } },
  { level: 23, free: { type: 'theme', themeId: 'candy' }, vip: { type: 'badge', badgeId: 'b_vip_phoenix', title: 'Anka Rozeti' } },
  { level: 24, free: { type: 'avatar', avatarId: 'av_unicorn' }, vip: { type: 'frame', frameId: 'fr_dragon' } },
  { level: 25, free: { type: 'frame', frameId: 'fr_sparkle' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_flame', title: 'Alev Çerçevesi' } },
  { level: 26, free: { type: 'gold', amount: 300 }, vip: { type: 'gold', amount: 450 } },
  { level: 27, free: { type: 'theme', themeId: 'cherry' }, vip: { type: 'theme', themeId: 'galaxy' } },
  { level: 28, free: { type: 'avatar', avatarId: 'av_eagle' }, vip: { type: 'badge', badgeId: 'b_vip_titan', title: 'Titan Rozeti' } },
  { level: 29, free: { type: 'frame', frameId: 'fr_leaf' }, vip: { type: 'gold', amount: 500 } },
  { level: 30, free: { type: 'gold', amount: 340 }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_glow', title: 'Işıltı Çerçevesi' } },
  { level: 31, free: { type: 'theme', themeId: 'royal' }, vip: { type: 'gold', amount: 550 } },
  { level: 32, free: { type: 'avatar', avatarId: 'av_astro' }, vip: { type: 'theme', themeId: 'sunset' } },
  { level: 33, free: { type: 'frame', frameId: 'fr_paw' }, vip: { type: 'badge', badgeId: 'b_vip_nova', title: 'Nova Rozeti' } },
  { level: 34, free: { type: 'gold', amount: 380 }, vip: { type: 'frame', frameId: 'fr_skull' } },
  { level: 35, free: { type: 'theme', themeId: 'cyber' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_heart', title: 'Animasyonlu Kalp Çerçevesi' } },
  { level: 36, free: { type: 'avatar', avatarId: 'av_robot' }, vip: { type: 'gold', amount: 600 } },
  { level: 37, free: { type: 'frame', frameId: 'fr_bolt' }, vip: { type: 'theme', themeId: 'lavender' } },
  { level: 38, free: { type: 'gold', amount: 420 }, vip: { type: 'badge', badgeId: 'b_vip_immortal', title: 'Ölümsüz Rozeti' } },
  { level: 39, free: { type: 'theme', themeId: 'dragon' }, vip: { type: 'gold', amount: 650 } },
  { level: 40, free: { type: 'avatar', avatarId: 'av_dragon' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_flame', title: 'Alev Çerçevesi' } },
  { level: 41, free: { type: 'frame', frameId: 'fr_sun' }, vip: { type: 'gold', amount: 700 } },
  { level: 42, free: { type: 'gold', amount: 460 }, vip: { type: 'theme', themeId: 'ocean' } },
  { level: 43, free: { type: 'theme', themeId: 'royal' }, vip: { type: 'badge', badgeId: 'b_vip_apex', title: 'Zirve Rozeti' } },
  { level: 44, free: { type: 'avatar', avatarId: 'av_king' }, vip: { type: 'frame', frameId: 'fr_octopus' } },
  { level: 45, free: { type: 'frame', frameId: 'fr_snow' }, vip: { type: 'lottieFrame', frameId: 'fr_lottie_glow', title: 'Işıltı Çerçevesi' } },
  { level: 46, free: { type: 'gold', amount: 500 }, vip: { type: 'gold', amount: 750 } },
  { level: 47, free: { type: 'theme', themeId: 'galaxy' }, vip: { type: 'theme', themeId: 'royal' } },
  { level: 48, free: { type: 'frame', frameId: 'fr_butterfly' }, vip: { type: 'badge', badgeId: 'b_vip_god', title: 'Tanrı Rozeti' } },
  { level: 49, free: { type: 'gold', amount: 550 }, vip: { type: 'gold', amount: 800 } },
  { level: 50, free: { type: 'gold', amount: 1000 }, vip: { type: 'badge', badgeId: 'b_vip_apex', title: 'Zirve Rozeti' } },
];

// Rozet kataloğu (profilde gösterilir).
export const BADGES = {
  b_vip_starter: { id: 'b_vip_starter', name: 'Başlangıç', emoji: '🌱', color: '#7C9EFF' },
  b_vip_focus: { id: 'b_vip_focus', name: 'Odak', emoji: '🎯', color: '#FF7C9E' },
  b_vip_grinder: { id: 'b_vip_grinder', name: 'Çalışkan', emoji: '⚒️', color: '#FFB84D' },
  b_vip_elite: { id: 'b_vip_elite', name: 'Elit', emoji: '🏆', color: '#C9A0FF' },
  b_vip_legend: { id: 'b_vip_legend', name: 'Efsane', emoji: '🐉', color: '#FF6B6B' },
  b_vip_god: { id: 'b_vip_god', name: 'Tanrı', emoji: '👑', color: '#FFD700' },
  b_vip_phoenix: { id: 'b_vip_phoenix', name: 'Anka', emoji: '🔥', color: '#FF9A3D' },
  b_vip_titan: { id: 'b_vip_titan', name: 'Titan', emoji: '🗿', color: '#A8B8C8' },
  b_vip_nova: { id: 'b_vip_nova', name: 'Nova', emoji: '🌟', color: '#7CE8FF' },
  b_vip_immortal: { id: 'b_vip_immortal', name: 'Ölümsüz', emoji: '♾️', color: '#C084FC' },
  b_vip_apex: { id: 'b_vip_apex', name: 'Zirve', emoji: '⛰️', color: '#FFD700' },
};

// Toplam XP'den pass seviyesini hesaplar. Eğri (pass'e özel):
// 1-10 → 100 XP, 11-20 → 200 XP, 21-30 → 300 XP, 31-40 → 400 XP,
// 41-50 → 500 XP (bir sonraki seviye için gereken XP).
export function passLevelFromXp(totalXp) {
  let level = 1;
  let cum = 0;
  while (level < PASS_MAX_LEVEL) {
    const cost = 100 * Math.ceil(level / 10);
    if (totalXp < cum + cost) break;
    cum += cost;
    level += 1;
  }
  return { level, cumXp: cum, nextThreshold: 100 * Math.ceil(level / 10) };
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
