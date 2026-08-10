// ============================================================
// Eşya (item) tanımları — altınla satın alınan tüketilebilirler.
// Her eşyanın envanterde adedi tutulur (data.inventory) ve
// "Kullan" ile aktif etkisi başlar (data.activeEffects).
// Etkiler cihaz saatine değil SUNUCU gününe bağlıdır.
// ============================================================

export const ITEMS = [
  {
    id: 'streak_freeze',
    name: 'Seri Dondurucu',
    emoji: '❄️',
    price: 120,
    desc: 'Bugün tüm alışkanlıklarının serisi korunur — hiçbiri kırılmaz.',
  },
  {
    id: 'penalty_shield',
    name: 'Ceza Kalkanı',
    emoji: '🛡️',
    price: 150,
    desc: 'Bu gece eksik görev cezası kesilmez. O gün tüm görevlerin tamamsa kalkan envanterine geri konur.',
  },
  {
    id: 'xp_boost',
    name: '2x XP Enerjisi',
    emoji: '⚡',
    price: 200,
    desc: 'Sonraki 3 alışkanlık tamamlaman 2 kat XP kazandırır (günlük tavan yine geçerli).',
  },
];

export const XP_BOOST_USES = 3;

// id'ye göre eşyayı bulur (yoksa null).
export function getItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

// Boş envanter şablonu (eski kayıtlara varsayılan olarak eklenir).
export function emptyInventory() {
  const inv = {};
  for (const it of ITEMS) inv[it.id] = 0;
  return inv;
}

// Boş aktif etki şablonu.
export function emptyActiveEffects() {
  return {
    // Serinin dondurulduğu gün anahtarı (o gün korunur).
    streakFreeze: null,
    // Cezanın kesilmediği gün anahtarı.
    penaltyShield: null,
    // 2x XP: kalan tamamlama hakkı.
    xpBoost: { usesLeft: 0 },
  };
}
