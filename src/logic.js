// ============================================================
// İstatistik ve tarih yardımcıları (SAF FONKSİYONLAR)
// Bu dosyadaki hiçbir fonksiyon state tutmaz; hepsi veriyi alır,
// işler ve sonucu döndürür. Böylece test edilmesi kolaydır ve
// her ekran aynı hesaplama mantığını kullanır.
// ============================================================

// Tarih objesini "2024-05-14" formatında string'e çevirir.
// Not: toISOString kullanmıyoruz çünkü o UTC saat dilimine göre
// çalışır; biz cihazın yerel tarihini istiyoruz.
export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Şifreyi düz metin saklamamak için basit bir hash üretir (djb2 tabanlı).
// Gerçek güvenlik şifrelemesi değildir; amacı kayıtlı şifrenin kolayca
// okunmamasıdır (uygulama tamamen çevrimdışı çalışır).
export function hashPassword(password, salt = 'habit_tracker_salt') {
  const input = `${salt}:${password}`;
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 * 33) ^ c) >>> 0;
    h2 = ((h2 * 31) ^ c) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

// Bugünün tarih anahtarını döndürür (yerel saat dilimine göre).
// Opsiyonel "offsetDays" parametresi TEST amacıyladır: gün ilerleme
// simülasyonu yaparken (+1 = yarınmış gibi davran) kullanılır.
export function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return dateKey(d);
}

// "2024-05-14" string'ini gece yarısı başlangıçlı Date objesine çevirir.
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Bugünden "n" gün önceki tarihin Date objesini döndürür.
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Günün kısa Türkçe adını döndürür (örn. "Pzt").
export function dayNameShort(date) {
  const names = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return names[date.getDay()];
}

// Bir alışkanlığın günlük seri (streak) sayısını hesaplar.
// Kural: dün veya bugün tamamlanmadıysa seri 0'dır; ardışık günler
// geriye doğru sayılarak seri bulunur.
export function calcStreak(completedDates, today) {
  const set = new Set(completedDates);
  const todayDate = parseKey(today);
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  if (!set.has(today) && !set.has(yesterdayKey)) return 0;
  let streak = 0;
  let d = set.has(today) ? todayDate : yesterday;
  while (set.has(dateKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Toplam XP'den seviye bilgisini türetir.
// Her seviye bir öncekinden 100 XP daha fazla ister (L1: 100, L2: 200...).
// levelFromTotalXp kullanmak yerine ayrı xp/level tutmadık; böylece
// "tamamlayınca +XP, geri alınca -XP" mantığı her zaman tutarlı kalır.
export function levelFromTotalXp(totalXp) {
  let level = 1;
  let cum = 0;
  while (totalXp >= cum + level * 100) {
    cum += level * 100;
    level += 1;
  }
  return { level, cumXp: cum, curXp: totalXp - cum, nextThreshold: level * 100 };
}

// Belirli bir günde kaç alışkanlığın tamamlandığını döndürür.
export function completionForDay(habits, key) {
  let done = 0;
  for (const h of habits) {
    if (h.completedDates.includes(key)) done += 1;
  }
  return done;
}

// Tüm alışkanlıklardaki toplam tamamlama sayısı.
export function totalCompletions(habits) {
  let total = 0;
  for (const h of habits) total += h.completedDates.length;
  return total;
}

// Alışkanlıklar arasındaki en yüksek güncel seri.
export function bestStreak(habits, today) {
  return habits.reduce(
    (max, h) => Math.max(max, calcStreak(h.completedDates, today)),
    0
  );
}

// Gün içinde tamamlanmayan alışkanlıklar için uygulanacak altın cezası.
// "forDay" (örn. dünün anahtarı) o gün tamamlanmamış her alışkanlık ceza
// alır; ceza miktarı "penalty" kadar altındır ve bakiye 0'ın altına inmez.
// Saf fonksiyondur: { count, ids, deducted } döndürür.
export function dayPenalty(habits, forDay, penalty = 15) {
  const missing = habits.filter((h) => !h.completedDates.includes(forDay));
  if (missing.length === 0) return { count: 0, ids: [], deducted: 0 };
  return {
    count: missing.length,
    ids: missing.map((h) => h.id),
    deducted: missing.length * penalty,
  };
}

// Son "dayCount" günün günlük tamamlama istatistiklerini üretir.
// WeekChart ve Heatmap grafikleri bu fonksiyonun çıktısını kullanır.
// pct: o gün tamamlanan alışkanlık oranı (0 ile 1 arası).
export function buildDailyCompletions(habits, dayCount, today) {
  const base = parseKey(today);
  const total = habits.length;
  const out = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const key = dateKey(d);
    const done = completionForDay(habits, key);
    out.push({ key, date: d, done, pct: total > 0 ? done / total : 0 });
  }
  return out;
}

// En çok tamamlanan "n" alışkanlığı tamamlama sayısına göre sıralar.
export function topHabits(habits, n) {
  return habits
    .map((h) => ({ habit: h, count: h.completedDates.length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// Bu haftayı (son 7 gün) geçen haftayla (ondan önceki 7 gün) kıyaslar.
// trend: "up" (artış), "down" (düşüş) veya "same" (aynı).
export function weeklyComparison(habits, today) {
  const daily = buildDailyCompletions(habits, 14, today);
  const currentWeek = daily.slice(7).reduce((s, d) => s + d.done, 0);
  const lastWeek = daily.slice(0, 7).reduce((s, d) => s + d.done, 0);
  const diff = currentWeek - lastWeek;
  return {
    currentWeek,
    lastWeek,
    diff,
    trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
  };
}

// Profil ziyaretleri için: gerçek aktivite geçmişi olmayan kullanıcıların
// (ör. elle eklenen arkadaşlar) Gelişim ekranı boş görünmesin diye seri
// sayısı kadar ardışık gün içeren bir "Günlük Aktivite" geçmişi üretir.
// Böylece grafikler, seri ve istatistikler o kullanıcı için de çalışır.
export function synthesizeActivities(streak, today) {
  const dates = [];
  const base = parseKey(today);
  for (let i = 0; i < streak; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    dates.push(dateKey(d));
  }
  return [
    {
      id: 'act_syn',
      name: 'Günlük Aktivite',
      emoji: '✨',
      color: '#7C5CFF',
      completedDates: dates,
    },
  ];
}

// Pomodoro zamanlayıcının varsayılan süresi: 25 dakika (milisaniye cinsinden).
export const POMODORO_DURATION_MS = 25 * 60 * 1000;

// Milisaniyeyi "dk:ss" biçiminde gösterir (örn. 1_499_000 → "24:59").
export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
