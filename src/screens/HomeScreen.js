// ============================================================
// HomeScreen — "Bugün" sekmesi
// - Karşılama mesajı + XP/seviye çubuğu + bugünkü ilerleme yüzdesi
// - Alışkanlık listesi (tamamla / geri al / sil)
// - Sağ alttaki + butonu ile yeni alışkanlık modalı açılır
// - Seviye atlayınca kutlama modalı App.js kökünde açılır (LevelUpModal)
// - Pomodoro sayacı bu sekmede yer alır (PomodoroTimer)
// "today" değeri DataContext'ten gelir; gece yarısı geçince ekran
// otomatik yeni güne geçer (bayat "bugün" durumu yaşanmaz).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AddHabitModal from '../components/AddHabitModal';
import AnimatedCounter from '../components/AnimatedCounter';
import AvatarCircle from '../components/AvatarCircle';
import memoizedHabitCard from '../components/memoizedHabitCard';
import NotificationBell from '../components/NotificationBell';
import PomodoroTimer from '../components/PomodoroTimer';
import PressableFX from '../components/PressableFX';
import Sheet from '../components/Sheet';
import XpBar from '../components/XpBar';
import { useData } from '../context/DataContext';
import { canClaimQuest, getDailyQuests, questClaimedToday } from '../data/quests';
import { STARTER_HABITS } from '../data/starterHabits';
import {
  bestStreak,
  DAILY_XP_CAP,
  levelFromTotalXp,
  MAX_ACTIVE_HABITS,
} from '../logic';
import { useTheme } from '../theme';

export default function HomeScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, today, toggleHabit, deleteHabit, addHabit, refreshServer, refreshing, pushToast } =
    useData();
  const navigation = useNavigation();
  const { habits, stats, settings } = data;
  // Seviye bilgisi toplam XP'den türetilir (bkz. logic.js).
  const levelInfo = levelFromTotalXp(stats.totalXp);
  const [modalVisible, setModalVisible] = useState(false);
  // Silme onayı: uzun basınca anında silinmez; önce alt-sheet onayı sorulur.
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = useCallback(
    (id) => {
      const h = habits.find((x) => x.id === id);
      if (h) setDeleteTarget(h);
    },
    [habits]
  );

  const doDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteHabit(deleteTarget.id);
    pushToast({ icon: '🗑️', title: `${deleteTarget.name} silindi`, color: C.danger });
    setDeleteTarget(null);
  }, [deleteTarget, deleteHabit, C.danger, pushToast]);

  // Görev özeti: bugün bitirilen görev sayısı + şu an ödülü hazır olanlar.
  // Görevler her gün havuzdan yeniden seçilir ve günde bir kez alınır.
  const questSummary = useMemo(() => {
    const claims = data.questClaims || {};
    const { base, vip } = getDailyQuests(today);
    const all = [...base, ...vip];
    const doneToday = all.filter((q) => questClaimedToday(q, claims, today)).length;
    const readyCount = all.filter((q) =>
      canClaimQuest(q, data.stats.day, claims, today, data.habits)
    ).length;
    return { doneToday, readyCount, total: all.length };
  }, [data.questClaims, data.stats.day, data.habits, today]);

  // Bugünkü ilerleme: tamamlanan / toplam alışkanlık
  const doneToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const total = habits.length;
  const pct = total > 0 ? doneToday / total : 0;
  const bestStreakValue = bestStreak(habits, today);
  const todayXp = stats.day?.key === today ? stats.day.xpEarned || 0 : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  // Hızlı başlangıç: boş ekrandaki önerilen alışkanlığı tek dokunuşla ekle.
  const quickAdd = useCallback(
    (h) => {
      addHabit(h.name, h.emoji, h.color);
      pushToast({
        icon: h.emoji,
        title: `${h.name} eklendi! Bugünkü hedefin hazır.`,
        color: h.color,
      });
    },
    [addHabit, pushToast]
  );

  // Liste başlığı: karşılama (avatar + altın), XP çubuğu, pomodoro, ilerleme
  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.topText}>
          <Text style={styles.greeting}>{greeting} 👋</Text>
          <Text style={styles.subGreeting}>
            {total > 0
              ? `Bugün ${doneToday}/${total} alışkanlığını tamamladın`
              : 'Bugünkü ilk alışkanlığını ekle'}
          </Text>
        </View>
        {/* Bildirim zili (gelen arkadaşlık istekleri) */}
        <NotificationBell />
        {/* Profil fotoğrafı (dükkan avatarı) + altın bakiyesi */}
        <View style={styles.profileCol}>
          <AvatarCircle
            avatarId={data.settings.avatarId}
            frameId={data.settings.frameId}
            photo={data.settings.photoUrl}
            size={48}
            ringColor={C.primary}
          />
          <View style={styles.goldChip}>
            <Text style={styles.goldIcon}>🪙</Text>
            <AnimatedCounter value={stats.gold || 0} style={styles.goldText} />
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <XpBar
          level={levelInfo.level}
          curXp={levelInfo.curXp}
          nextThreshold={levelInfo.nextThreshold}
          todayXp={stats.day?.key === today ? stats.day.xpEarned || 0 : 0}
          todayCap={DAILY_XP_CAP}
        />
      </View>
      <PressableFX style={styles.questCard} onPress={() => navigation.navigate('QuestBoard')}>
        <View style={styles.questCardTop}>
          <Text style={styles.questCardTitle}>🎯 Günün Görevleri</Text>
          {questSummary.readyCount > 0 ? (
            <View style={[styles.questReadyChip, { backgroundColor: C.accent + '22' }]}>
              <Text style={[styles.questReadyText, { color: C.accent }]}>
                {questSummary.readyCount} hazır
              </Text>
            </View>
          ) : (
            <Text style={styles.questWaitText}>⏳ beklemede</Text>
          )}
        </View>
        <Text style={styles.questCardHint}>
          {questSummary.doneToday > 0
            ? `Bugün ${questSummary.doneToday}/${questSummary.total} görev tamamladın`
            : 'Henüz görev bitirmedin'}{' '}
          • Görevler her gün sıfırlanır →
        </Text>
      </PressableFX>
      <PomodoroTimer />
      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>Bugünkü İlerleme</Text>
          <Text style={styles.todayValue}>%{Math.round(pct * 100)}</Text>
        </View>
        <View style={styles.todayTrack}>
          <View style={[styles.todayFill, { width: `${pct * 100}%` }]} />
        </View>
        {/* Özet bloğu: en uzun seri · bugün XP · tamamlanan */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🔥</Text>
            <AnimatedCounter value={bestStreakValue} style={styles.summaryValue} />
            <Text style={styles.summaryLabel}>En uzun seri</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>⚡</Text>
            <AnimatedCounter value={todayXp} style={styles.summaryValue} />
            <Text style={styles.summaryLabel}>Bugün XP</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>✅</Text>
            <Text style={styles.summaryValue}>
              <AnimatedCounter value={doneToday} style={styles.summaryValue} />/{total}
            </Text>
            <Text style={styles.summaryLabel}>Tamamlanan</Text>
          </View>
        </View>
        <Text style={styles.todayHint}>
          Alışkanlık başına +{settings.xpPerHabit} XP kazanırsın
        </Text>
      </View>
      <Text style={styles.sectionTitle}>Alışkanlıklar ({habits.length})</Text>
    </View>
  );

  const itemHeight = 78; // habit card fixed height

  return (
    <View style={styles.container}>
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        getItemLayout={(item, index) => `x=${styles.listContent.left} y=${index * itemHeight} width=${styles.listContent.itemWidth} height=${itemHeight}`}
        renderItem={({ item }) => (
          <memoizedHabitCard habit={item} today={today} onToggle={toggleHabit} onDelete={confirmDelete} />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // Çek-yenile: sunucuyla senkron (profil + arkadaş + liderlik + görevler).
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshServer()}
            tintColor={C.primary}
            colors={[C.primary]}
            progressBackgroundColor={C.surface}
          />
        }
        ListEmptyComponent={
          <EmptyState C={C} styles={styles} onQuickAdd={quickAdd} />
        }
      />
      {/* Yeni alışkanlık ekleme butonu (FAB) */}
      <PressableFX style={styles.fab} scale={0.9} haptic onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </PressableFX>
      <AddHabitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addHabit}
        habitsCount={habits.length}
        maxHabits={MAX_ACTIVE_HABITS}
      />
      {/* Silme onayı: alt-sheet (anında silinme riskine karşı) */}
      <Sheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Alışkanlığı Sil"
      >
        <Text style={styles.confirmText}>
          "{deleteTarget?.name}" silinecek. Bu alışkanlığın serisi ve tamamlama geçmişi
          kaldırılır; işlem geri alınamaz.
        </Text>
        <View style={styles.confirmRow}>
          <PressableFX
            style={[styles.confirmBtn, { backgroundColor: C.surfaceLight }]}
            onPress={() => setDeleteTarget(null)}
          >
            <Text style={styles.confirmBtnMuted}>Vazgeç</Text>
          </PressableFX>
          <PressableFX
            style={[styles.confirmBtn, { backgroundColor: C.danger }]}
            onPress={doDelete}
          >
            <Text style={styles.confirmBtnDanger}>Sil</Text>
          </PressableFX>
        </View>
      </Sheet>
    </View>
  );
}

// Boş durum: kullanıcıyı tek dokunuşla başlatmak için zıplayan 🌱
// ve hazır "Hızlı başlangıç" alışkanlık çipleri gösterir.
function EmptyState({ C, styles, onQuickAdd }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  return (
    <View style={styles.emptyBox}>
      <Animated.Text
        style={[
          styles.emptyEmoji,
          {
            transform: [
              { translateY: bounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -20, 0] }) },
            ],
          },
        ]}
      >
        🌱
      </Animated.Text>
      <Text style={styles.emptyTitle}>İlk alışkanlığını ekle</Text>
      <Text style={styles.emptyText}>
        Hazır bir başlangıç seç veya + butonuna dokun. Her tamamlama XP + altın kazandırır!
      </Text>
      <View style={styles.starterWrap}>
        {STARTER_HABITS.map((h) => (
          <PressableFX
            key={h.name}
            style={[styles.starterChip, { borderColor: h.color + '66' }]}
            onPress={() => onQuickAdd(h)}
          >
            <Text style={styles.starterEmoji}>{h.emoji}</Text>
            <Text style={styles.starterChipText}>{h.name}</Text>
          </PressableFX>
        ))}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 14,
    },
    greeting: {
      color: C.text,
      fontSize: 22,
      fontWeight: '800',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    topText: {
      flex: 1,
      paddingRight: 12,
    },
    profileCol: {
      alignItems: 'center',
      gap: 6,
    },
    goldChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    goldIcon: {
      fontSize: 12,
    },
    goldText: {
      color: C.gold,
      fontSize: 13,
      fontWeight: '800',
    },
    subGreeting: {
      color: C.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
    },
    todayCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      gap: 10,
    },
    questCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      gap: 6,
    },
    questCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    questCardTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '800',
    },
    questReadyChip: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    questReadyText: {
      fontSize: 11,
      fontWeight: '800',
    },
    questWaitText: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    questCardHint: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    todayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    summaryItem: {
      flex: 1,
      alignItems: 'center',
      gap: 1,
    },
    summaryIcon: {
      fontSize: 16,
    },
    summaryValue: {
      color: C.text,
      fontSize: 16,
      fontWeight: '800',
    },
    summaryLabel: {
      color: C.textMuted,
      fontSize: 10,
      fontWeight: '600',
    },
    summaryDivider: {
      width: 1,
      height: 26,
      backgroundColor: C.border,
    },
    todayTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
    },
    todayValue: {
      color: C.accent,
      fontSize: 14,
      fontWeight: '800',
    },
    todayTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    todayFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: C.accent,
    },
    todayHint: {
      color: C.textMuted,
      fontSize: 11,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    listContent: {
      paddingBottom: 120,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: C.primary,
      borderWidth: 2,
      borderColor: C.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.primary,
      shadowOpacity: 0.6,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 12,
    },
    fabIcon: {
      color: C.onPrimary,
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 36,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
      marginTop: 20,
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
    confirmText: {
      color: C.text,
      fontSize: 14,
      lineHeight: 21,
    },
    confirmRow: {
      flexDirection: 'row',
      gap: 10,
    },
    confirmBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    confirmBtnMuted: {
      color: C.text,
      fontWeight: '700',
    },
    confirmBtnDanger: {
      color: '#fff',
      fontWeight: '800',
    },
    starterWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
      marginTop: 22,
      maxWidth: 340,
    },
    starterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    starterChipPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.97 }],
    },
    starterEmoji: {
      fontSize: 18,
    },
    starterChipText: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
