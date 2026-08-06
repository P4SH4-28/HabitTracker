// ============================================================
// Başarım (Achievement) tanımları
// Her başarımın bir "condition" (şart) fonksiyonu vardır. Bu fonksiyon
// o anki istatistik durumunu ("state") alır ve şart sağlandıysa true döner.
// Şartlar saf fonksiyonlardır; böylece birim testleri kolayca yazılabilir.
// ============================================================
import { bestStreak, levelFromTotalXp, totalCompletions } from '../logic';

export const ACHIEVEMENTS = [
  // ----- Temel -----
  {
    id: 'first_habit',
    title: 'İlk Adım',
    desc: 'İlk alışkanlığını ekle',
    icon: '🌱',
    reward: 25,
    condition: (s) => s.habitCount >= 1,
  },
  {
    id: 'first_done',
    title: 'İlk Tamamlama',
    desc: 'Bir alışkanlığı tamamla',
    icon: '✅',
    reward: 25,
    condition: (s) => s.totalCompletions >= 1,
  },
  {
    id: 'done_10',
    title: 'Isınma Turu',
    desc: '10 alışkanlık tamamla',
    icon: '📦',
    reward: 30,
    condition: (s) => s.totalCompletions >= 10,
  },
  {
    id: 'done_50',
    title: 'Tutarlılık',
    desc: '50 alışkanlık tamamla',
    icon: '🏅',
    reward: 50,
    condition: (s) => s.totalCompletions >= 50,
  },
  {
    id: 'done_100',
    title: 'Yüzde Yüz',
    desc: '100 alışkanlık tamamla',
    icon: '💯',
    reward: 100,
    condition: (s) => s.totalCompletions >= 100,
  },

  // ----- Seri (streak) -----
  {
    id: 'streak_3',
    title: 'İlk Seri',
    desc: '3 günlük seri yakala',
    icon: '🔥',
    reward: 30,
    condition: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Haftalık Döngü',
    desc: '7 günlük seri yakala',
    icon: '⚡',
    reward: 50,
    condition: (s) => s.bestStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Düzen Ustası',
    desc: '30 günlük seri yakala',
    icon: '💎',
    reward: 150,
    condition: (s) => s.bestStreak >= 30,
  },

  // ----- Seviye / XP -----
  {
    id: 'level_5',
    title: 'Yükseliş',
    desc: '5. seviyeye ulaş',
    icon: '🚀',
    reward: 100,
    condition: (s) => s.level >= 5,
  },
  {
    id: 'level_10',
    title: 'Veteran',
    desc: '10. seviyeye ulaş',
    icon: '🎖️',
    reward: 250,
    condition: (s) => s.level >= 10,
  },
  {
    id: 'xp_1000',
    title: 'Bin XP',
    desc: '1000 XP topla',
    icon: '⚡',
    reward: 100,
    condition: (s) => s.totalXp >= 1000,
  },

  // ----- Sosyal -----
  {
    id: 'friend_1',
    title: 'Sosyal',
    desc: 'İlk arkadaşını ekle',
    icon: '👥',
    reward: 25,
    condition: (s) => s.friendCount >= 1,
  },

  // ----- Odak (pomodoro) -----
  {
    id: 'focus_1',
    title: 'İlk Odak',
    desc: '1 odak seansı tamamla',
    icon: '🍅',
    reward: 25,
    condition: (s) => s.pomodoroCount >= 1,
  },
  {
    id: 'focus_10',
    title: 'Odaklanma Ustası',
    desc: '10 odak seansı tamamla',
    icon: '⏱️',
    reward: 100,
    condition: (s) => s.pomodoroCount >= 10,
  },
];

// Veriden tüm başarım şartlarının ihtiyaç duyduğu istatistikleri çıkarır.
// today parametresi seri hesabı için gereklidir (hangi günün "bugün" olduğu).
export function computeAchievementState(data, today) {
  return {
    habitCount: data.habits.length,
    totalCompletions: totalCompletions(data.habits),
    bestStreak: bestStreak(data.habits, today),
    totalXp: data.stats.totalXp,
    level: levelFromTotalXp(data.stats.totalXp).level,
    friendCount: data.friends.length,
    pomodoroCount: data.stats.pomodoroCount || 0,
  };
}

// Henüz açılmamış ama şartı sağlanmış başarımları döndürür.
// DataContext her veri/gün değişiminde bu fonksiyonu çağırır.
export function evaluateAchievements(data, today) {
  const state = computeAchievementState(data, today);
  return ACHIEVEMENTS.filter(
    (a) => !data.achievements.includes(a.id) && a.condition(state)
  );
}
