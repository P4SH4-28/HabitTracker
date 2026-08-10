// ============================================================
// AchievementsScreen — "Başarımlar" ekranı (sol menüden açılır)
// Açılan başarımlar altın ödülleriyle birlikte listelenir; kilitli
// olanların ilerlemesi (ör. 7/10 tamamlama) çubukla gösterilir.
// Kilit açma mantığı DataContext'te çalışır (evaluateAchievements).
// ============================================================
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useData } from '../context/DataContext';
import {
  ACHIEVEMENTS,
  computeAchievementState,
} from '../data/achievements';
import { useTheme } from '../theme';

// Sayısal başarımın ilerlemesi: { cur, target } döndürür (yoksa null).
// Kilitli kartlarda çubuk ve "x/y" bu değerle çizilir.
function progressFor(achievement, state) {
  switch (achievement.id) {
    case 'first_habit':
      return { cur: state.habitCount, target: 1 };
    case 'first_done':
      return { cur: state.totalCompletions, target: 1 };
    case 'done_10':
      return { cur: state.totalCompletions, target: 10 };
    case 'done_50':
      return { cur: state.totalCompletions, target: 50 };
    case 'done_100':
      return { cur: state.totalCompletions, target: 100 };
    case 'streak_3':
      return { cur: state.bestStreak, target: 3 };
    case 'streak_7':
      return { cur: state.bestStreak, target: 7 };
    case 'streak_30':
      return { cur: state.bestStreak, target: 30 };
    case 'level_5':
      return { cur: state.level, target: 5 };
    case 'level_10':
      return { cur: state.level, target: 10 };
    case 'xp_1000':
      return { cur: state.totalXp, target: 1000 };
    case 'friend_1':
      return { cur: state.friendCount, target: 1 };
    case 'focus_1':
      return { cur: state.pomodoroCount, target: 1 };
    case 'focus_10':
      return { cur: state.pomodoroCount, target: 10 };
    default:
      return null;
  }
}

export default function AchievementsScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, today } = useData();
  const unlockedIds = data.achievements || [];
  const state = computeAchievementState(data, today);
  const unlockedCount = unlockedIds.length;
  const totalReward = ACHIEVEMENTS.filter((a) => unlockedIds.includes(a.id)).reduce(
    (s, a) => s + (a.reward || 0),
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEmoji}>🏆</Text>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryTitle}>
            {unlockedCount}/{ACHIEVEMENTS.length} başarım açıldı
          </Text>
          <Text style={styles.summarySub}>
            Açtığın başarımlar toplam {totalReward} 🪙 kazandırdı
          </Text>
        </View>
      </View>

      {ACHIEVEMENTS.map((a) => {
        const unlocked = unlockedIds.includes(a.id);
        const prog = progressFor(a, state);
        const pct = prog ? Math.min(1, prog.cur / prog.target) : 0;
        return (
          <View
            key={a.id}
            style={[
              styles.card,
              unlocked && styles.cardUnlocked,
              !unlocked && styles.cardLocked,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, unlocked && styles.iconBoxUnlocked]}>
                <Text style={[styles.icon, !unlocked && styles.iconLocked]}>
                  {unlocked ? a.icon : '🔒'}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.title, unlocked && styles.titleUnlocked]}>
                  {a.title}
                </Text>
                <Text style={styles.desc}>{a.desc}</Text>
              </View>
              {unlocked ? (
                <View style={styles.rewardChip}>
                  <Text style={styles.rewardText}>+{a.reward} 🪙</Text>
                </View>
              ) : null}
            </View>
            {!unlocked && prog ? (
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(pct * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {Math.min(prog.cur, prog.target)}/{prog.target}
                </Text>
              </View>
            ) : null}
            {!unlocked && !prog ? (
              <Text style={styles.hintText}>Şartını sağlayınca otomatik açılır.</Text>
            ) : null}
          </View>
        );
      })}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Başarımlar otomatik açılır ve açıldığında altın ödülü hemen
          envanterine eklenir — ekranın üstünde de kısa bir bildirim görürsün.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    content: {
      padding: 20,
      gap: 10,
      paddingBottom: 60,
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.gold + '55',
      padding: 14,
      marginBottom: 6,
    },
    summaryEmoji: {
      fontSize: 32,
    },
    summaryInfo: {
      flex: 1,
      gap: 2,
    },
    summaryTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    summarySub: {
      color: C.textMuted,
      fontSize: 12,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    cardUnlocked: {
      borderColor: C.gold + '66',
    },
    cardLocked: {
      borderColor: C.border,
      opacity: 0.85,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxUnlocked: {
      backgroundColor: C.gold + '22',
    },
    icon: {
      fontSize: 24,
    },
    iconLocked: {
      opacity: 0.6,
    },
    cardInfo: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: C.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
    titleUnlocked: {
      color: C.text,
    },
    desc: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    rewardChip: {
      backgroundColor: C.gold + '22',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    rewardText: {
      color: C.gold,
      fontSize: 12,
      fontWeight: '800',
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: C.primary,
    },
    progressText: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
      minWidth: 36,
      textAlign: 'right',
    },
    hintText: {
      color: C.textMuted,
      fontSize: 12,
    },
    noteBox: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      marginTop: 6,
    },
    noteText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
