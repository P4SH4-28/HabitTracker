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
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AddHabitModal from '../components/AddHabitModal';
import AvatarCircle from '../components/AvatarCircle';
import HabitCard from '../components/HabitCard';
import NotificationBell from '../components/NotificationBell';
import PomodoroTimer from '../components/PomodoroTimer';
import XpBar from '../components/XpBar';
import { useData } from '../context/DataContext';
import { canClaimQuest, getQuest, QUEST_CATALOG } from '../data/quests';
import { DAILY_XP_CAP, dateKey, levelFromTotalXp, MAX_ACTIVE_HABITS } from '../logic';
import { serverNow } from '../services/serverClock';
import { useTheme } from '../theme';

export default function HomeScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, today, toggleHabit, deleteHabit, addHabit, refreshServer, refreshing } =
    useData();
  const navigation = useNavigation();
  const { habits, stats, settings } = data;
  // Seviye bilgisi toplam XP'den türetilir (bkz. logic.js).
  const levelInfo = levelFromTotalXp(stats.totalXp);
  const [modalVisible, setModalVisible] = useState(false);

  // Görev özeti: bugün bitirilen görev sayısı + şu an ödülü hazır olanlar.
  // Bekleme süreleri sunucu saatine göre hesaplanır (saat oynatma koruması).
  const questSummary = useMemo(() => {
    const claims = data.questClaims || {};
    const doneToday = Object.entries(claims).filter(
      ([id, c]) => c?.ts && dateKey(new Date(c.ts)) === today && getQuest(id)
    ).length;
    const readyCount = QUEST_CATALOG.filter((q) =>
      canClaimQuest(q, data.stats.day, claims, serverNow())
    ).length;
    return { doneToday, readyCount };
  }, [data.questClaims, data.stats.day, today]);

  // Bugünkü ilerleme: tamamlanan / toplam alışkanlık
  const doneToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const total = habits.length;
  const pct = total > 0 ? doneToday / total : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

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
            size={48}
            ringColor={C.primary}
          />
          <View style={styles.goldChip}>
            <Text style={styles.goldIcon}>🪙</Text>
            <Text style={styles.goldText}>{stats.gold || 0}</Text>
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
      <Pressable style={styles.questCard} onPress={() => navigation.navigate('Quest')}>
        <View style={styles.questCardTop}>
          <Text style={styles.questCardTitle}>🎯 Görevler</Text>
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
            ? `Bugün ${questSummary.doneToday} görev tamamladın`
            : 'Henüz görev bitirmedin'}{' '}
          • Zorluğa göre XP ve altın kazan →
        </Text>
      </Pressable>
      <PomodoroTimer />
      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>Bugünkü İlerleme</Text>
          <Text style={styles.todayValue}>%{Math.round(pct * 100)}</Text>
        </View>
        <View style={styles.todayTrack}>
          <View style={[styles.todayFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.todayHint}>
          Alışkanlık başına +{settings.xpPerHabit} XP kazanırsın
        </Text>
      </View>
      <Text style={styles.sectionTitle}>Alışkanlıklar ({habits.length})</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HabitCard habit={item} today={today} onToggle={toggleHabit} onDelete={deleteHabit} />
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
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>Henüz alışkanlık yok</Text>
            <Text style={styles.emptyText}>
              + butonuna dokunup ilk alışkanlığını ekle. Her tamamlama sana XP kazandırır!
            </Text>
          </View>
        }
      />
      {/* Yeni alışkanlık ekleme butonu (FAB) */}
      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
      <AddHabitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addHabit}
        habitsCount={habits.length}
        maxHabits={MAX_ACTIVE_HABITS}
      />
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
  });
}
