// ============================================================
// Lig (League) tanımları — haftalık XP'ye (xp7d) göre rütbeler.
// Lig seviyesi sunucunun 7 günlük XP trendinden türetilir; böylece
// cihaz verisi oynatılamaz. Hafta Pazartesi başlar, Pazar biter.
// Her hafta sonunda ulaşılan lige göre altın ödülü bir kez alınır
// (settings.leagueClaim hafta anahtarıyla izlenir).
// ============================================================

// xp7d eşiklerine göre ligler (sıralı — üst eşik = üst lig).
export const LEAGUES = [
  { id: 'bronz', name: 'Bronz', emoji: '🥉', minXp: 0, reward: 10, color: '#CD7F32' },
  { id: 'gumus', name: 'Gümüş', emoji: '🥈', minXp: 50, reward: 25, color: '#C0C0C0' },
  { id: 'altin', name: 'Altın', emoji: '🥇', minXp: 150, reward: 50, color: '#FFD700' },
  { id: 'platin', name: 'Platin', emoji: '💎', minXp: 300, reward: 100, color: '#7C5CFF' },
  { id: 'elmas', name: 'Elmas', emoji: '👑', minXp: 600, reward: 200, color: '#4DE1FF' },
];

// 7 günlük XP'ye göre ligi döndürür (en üst eşik kazanır).
export function getLeague(xp7d) {
  let league = LEAGUES[0];
  for (const l of LEAGUES) {
    if (xp7d >= l.minXp) league = l;
  }
  return league;
}

// Üst lige ilerleme bilgisi: { next, needed } (elmas için null).
export function nextLeagueInfo(xp7d) {
  const idx = LEAGUES.findIndex((l) => l.id === getLeague(xp7d).id);
  const next = LEAGUES[idx + 1] || null;
  return next ? { next, needed: next.minXp - xp7d } : { next: null, needed: 0 };
}

// ---------- Hafta anahtarı (Pazartesi tabanlı) ----------
// Aynı haftadaki tüm günler aynı anahtarı üretir; anahtar "hafta başı
// (Pazartesi) tarihi"dir. Ödül alımı hafta başına bir kezdir.
export function weekKeyFor(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Pazar ... 6=Cumartesi
  const diff = day === 0 ? 6 : day - 1; // Pazartesi'ye olan gün farkı
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Haftanın sonu (Pazar) tarihini döndürür — geri sayım için.
export function weekEndFor(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
}
