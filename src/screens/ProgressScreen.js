// ============================================================
// ProgressScreen — "Gelişim" sekmesi
// Tüm istatistikler useMemo ile YALNIZCA veri değiştiğinde hesaplanır
// (her çizimde tekrar hesap yapılmaz). Hesaplamalar logic.js'teki
// saf fonksiyonlardan beslenir:
//  - buildDailyCompletions → haftalık grafik + ısı haritası verisi
//  - topHabits            → "En Çok Tamamlananlar" listesi
//  - weeklyComparison     → bu hafta vs geçen hafta kartı
// ============================================================
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AchievementsGrid from '../components/AchievementsGrid';
import Heatmap from '../components/Heatmap';
import StatCard from '../components/StatCard';
import TopHabits from '../components/TopHabits';
import WeekChart from '../components/WeekChart';
import WeeklyCompare from '../components/WeeklyCompare';
import { useData } from '../context/DataContext';
import {
  bestStreak,
  buildDailyCompletions,
  topHabits,
  totalCompletions,
  weeklyComparison,
} from '../logic';
import { useTheme } from '../theme';

export default function ProgressScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, today } = useData();
  const { habits, stats } = data;

  // Merkezi istatistik hesabı: habits veya today değişince yeniden hesaplanır.
  const overview = useMemo(
    () => ({
      daily: buildDailyCompletions(habits, 35, today),
      top: topHabits(habits, 5),
      weekly: weeklyComparison(habits, today),
      total: totalCompletions(habits),
      best: bestStreak(habits, today),
    }),
    [habits, today]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Gelişim</Text>
      <Text style={styles.screenSub}>İlerlemeni izle ve tutarlılığını gör</Text>

      {/* Özet istatistik kartları */}
      <View style={styles.statsRow}>
        <StatCard
          icon="✅"
          label="Toplam Tamamlama"
          value={overview.total}
          color={C.accent}
        />
        <StatCard
          icon="🔥"
          label="En İyi Seri"
          value={overview.best}
          color={C.xp}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="⚡"
          label="Toplam XP"
          value={stats.totalXp}
          color={C.primary}
        />
        <StatCard
          icon="🎯"
          label="Aktif Alışkanlık"
          value={habits.length}
          color={C.xp}
        />
      </View>

      {habits.length > 0 ? (
        <>
          {/* Bu hafta vs geçen hafta karşılaştırması */}
          <WeeklyCompare weekly={overview.weekly} />
          {/* Son 7 günün tamamlama grafiği */}
          <WeekChart daily={overview.daily} today={today} total={habits.length} />
          {/* Son 5 haftanın ısı haritası */}
          <Heatmap daily={overview.daily} />
          {/* En çok tamamlanan alışkanlıklar (en az 1 tamamlama olan) */}
          {overview.top.length > 0 && <TopHabits items={overview.top} />}
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Henüz veri yok</Text>
          <Text style={styles.emptyText}>
            Alışkanlık ekleyip tamamladıkça grafiklerin burada oluşacak.
          </Text>
        </View>
      )}

      {/* Başarım rozetleri: veri olsa da olmasa da görünür (sosyal rozet vb.). */}
      <AchievementsGrid unlockedIds={data.achievements} />
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
      gap: 14,
      paddingBottom: 60,
    },
    screenTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: '800',
    },
    screenSub: {
      color: C.textMuted,
      fontSize: 13,
      marginBottom: 4,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 50,
      paddingHorizontal: 24,
    },
    emptyEmoji: {
      fontSize: 44,
      marginBottom: 12,
    },
    emptyTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptyText: {
      color: C.textMuted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
