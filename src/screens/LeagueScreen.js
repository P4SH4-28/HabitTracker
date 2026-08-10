// ============================================================
// LeagueScreen — "Haftalık Ligler" ekranı (sol menüden açılır)
// 7 günlük XP'ye (xp7d — sunucu trendi) göre lig rütbesi gösterilir;
// arkadaşların da aynı liglerde sıralanır. Hafta sonunda (Pazar)
// ulaştığın lige göre altın ödülünü bir kez alırsın.
// ============================================================
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useData } from '../context/DataContext';
import { getLeague, LEAGUES, nextLeagueInfo, weekEndFor, weekKeyFor } from '../data/leagues';
import { useTheme } from '../theme';

function formatCountdown(ms) {
  const totalHours = Math.max(0, Math.floor(ms / 3600000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days} gün ${hours} saat`;
  return `${hours} saat`;
}

export default function LeagueScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, server, claimLeagueReward, refreshServer } = useData();
  const [claiming, setClaiming] = useState(false);

  // Kendi ligim: sunucunun 7 günlük XP trendinden (en güncel senkron).
  const me = server.leaderboard.find((p) => p.isCurrentUser);
  const myXp7d = me?.xp7d || 0;
  const myLeague = getLeague(myXp7d);
  const nextInfo = nextLeagueInfo(myXp7d);

  // Hafta bilgisi: Pazartesi başlar, Pazar biter.
  const weekKey = weekKeyFor(new Date());
  const countdownMs = weekEndFor(new Date()).getTime() - Date.now();
  const claim = data.settings.leagueClaim || null;
  const claimAvailable = claim?.week !== weekKey;

  // Arkadaşlar: 7 günlük XP'ye göre sıralı, lig rozetleriyle.
  const sorted = [...server.leaderboard]
    .sort((a, b) => (b.xp7d || 0) - (a.xp7d || 0))
    .map((p) => ({ ...p, league: getLeague(p.xp7d || 0) }));

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await refreshServer();
      const r = claimLeagueReward();
      if (r.ok === false) {
        Alert.alert('Ödül alınamadı', r.error || 'Bu haftanın ödülü zaten alındı.');
      } else {
        Alert.alert(
          'Ödül alındı!',
          `Bu hafta ${r.league.name} ligindesin: +${r.reward} 🪙 hesabına eklendi. Haftaya daha üst lig hedefle!`
        );
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Kendi lig kartı */}
      <View style={[styles.tierCard, { borderColor: myLeague.color + '88' }]}>
        <View style={styles.tierTop}>
          <View style={styles.tierLeft}>
            <Text style={[styles.tierEmojiWrap, { backgroundColor: myLeague.color + '22' }]}>
              <Text style={styles.tierEmoji}>{myLeague.emoji}</Text>
            </Text>
            <View>
              <Text style={[styles.tierName, { color: myLeague.color }]}>{myLeague.name} Lig</Text>
              <Text style={styles.tierXp}>Bu hafta {myXp7d} XP kazandın</Text>
            </View>
          </View>
          <View style={styles.weekChip}>
            <Text style={styles.weekChipText}>Hafta biter</Text>
            <Text style={styles.weekChipCount}>{formatCountdown(countdownMs)}</Text>
          </View>
        </View>
        <View style={styles.tierProgress}>
          <View style={styles.tierTrack}>
            <View
              style={[
                styles.tierFill,
                {
                  width: nextInfo.next
                    ? `${Math.min(100, Math.round((myXp7d / nextInfo.next.minXp) * 100))}%`
                    : '100%',
                  backgroundColor: myLeague.color,
                },
              ]}
            />
          </View>
          <Text style={styles.tierProgressText}>
            {nextInfo.next
              ? `${nextInfo.needed} XP kala ${nextInfo.next.emoji} ${nextInfo.next.name}`
              : 'En üst lige ulaştın!'}
          </Text>
        </View>
      </View>

      {/* Haftalık ödül */}
      <View style={styles.rewardCard}>
        <Text style={styles.rewardTitle}>🎁 Haftalık lig ödülü</Text>
        <Text style={styles.rewardDesc}>
          {claimAvailable
            ? `Bu hafta ${myLeague.name} liginde bitirirsen +${myLeague.reward} 🪙 kazanırsın. Pazar gecesi yatmadan almayı unutma!`
            : `Bu haftanın ödülü alındı: +${LEAGUES.find((l) => l.id === claim?.tier)?.reward || 0} 🪙 (${LEAGUES.find((l) => l.id === claim?.tier)?.name})`}
        </Text>
        <Pressable
          style={[styles.claimBtn, !claimAvailable && styles.claimBtnDone]}
          disabled={!claimAvailable || claiming}
          onPress={handleClaim}
        >
          <Text style={[styles.claimBtnText, !claimAvailable && styles.claimBtnTextDone]}>
            {claimAvailable ? 'Ödülü Al' : '✓ Bu hafta alındı'}
          </Text>
        </Pressable>
      </View>

      {/* Lig tablosu */}
      <Text style={styles.sectionTitle}>Bu hafta — sıralama</Text>
      <View style={styles.rankCard}>
        {sorted.map((p, i) => {
          const isMe = p.isCurrentUser;
          return (
            <View key={p.id} style={[styles.rankRow, isMe && styles.rankRowMe]}>
              <Text style={styles.rankNum}>{i + 1}</Text>
              <Text style={styles.rankEmoji}>{p.league.emoji}</Text>
              <Text style={[styles.rankName, isMe && styles.rankNameMe]} numberOfLines={1}>
                {p.username}
                {isMe ? ' (sen)' : ''}
              </Text>
              <Text style={styles.rankXp}>{p.xp7d || 0} XP</Text>
            </View>
          );
        })}
        {sorted.length === 0 ? (
          <Text style={styles.emptyText}>
            Liderlik için seviye 5 olman ve internet bağlantısı gerekir. Veri
            yüklenince sıralama burada görünür.
          </Text>
        ) : null}
      </View>

      {/* Lig eşikleri */}
      <Text style={styles.sectionTitle}>Lig eşikleri</Text>
      <View style={styles.leaguesCard}>
        {LEAGUES.map((l) => (
          <View key={l.id} style={styles.leagueRow}>
            <Text style={styles.leagueEmoji}>{l.emoji}</Text>
            <Text style={[styles.leagueName, { color: l.color }]}>{l.name}</Text>
            <Text style={styles.leagueMin}>haftada {l.minXp} XP</Text>
            <Text style={styles.leagueReward}>+{l.reward} 🪙</Text>
          </View>
        ))}
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Lig XP'n sunucudaki 7 günlük kazanç trendinden hesaplanır — cihaz
          verisi oynatılamaz. Her hafta Pazartesi günü sıfırlanır; ödül Pazar
          gecesi alınır ve haftada bir kezdir.
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
      gap: 14,
      paddingBottom: 60,
    },
    tierCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      gap: 14,
    },
    tierTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    tierLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    tierEmojiWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tierEmoji: {
      fontSize: 28,
    },
    tierName: {
      fontSize: 18,
      fontWeight: '900',
    },
    tierXp: {
      color: C.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    weekChip: {
      alignItems: 'flex-end',
    },
    weekChipText: {
      color: C.textMuted,
      fontSize: 10,
    },
    weekChipCount: {
      color: C.text,
      fontSize: 13,
      fontWeight: '800',
    },
    tierProgress: {
      gap: 6,
    },
    tierTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    tierFill: {
      height: '100%',
      borderRadius: 5,
    },
    tierProgressText: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    rewardCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.gold + '55',
      padding: 14,
      gap: 8,
    },
    rewardTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '800',
    },
    rewardDesc: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    claimBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: 'center',
    },
    claimBtnDone: {
      backgroundColor: C.primary + '22',
    },
    claimBtnText: {
      color: C.onPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    claimBtnTextDone: {
      color: C.primary,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    rankCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 6,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    rankRowMe: {
      backgroundColor: C.primary + '18',
    },
    rankNum: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '800',
      width: 22,
      textAlign: 'center',
    },
    rankEmoji: {
      fontSize: 16,
    },
    rankName: {
      flex: 1,
      color: C.text,
      fontSize: 13,
      fontWeight: '600',
    },
    rankNameMe: {
      fontWeight: '800',
    },
    rankXp: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    emptyText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
      padding: 12,
    },
    leaguesCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 6,
    },
    leagueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 12,
    },
    leagueEmoji: {
      fontSize: 18,
    },
    leagueName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '800',
    },
    leagueMin: {
      color: C.textMuted,
      fontSize: 12,
    },
    leagueReward: {
      color: C.gold,
      fontSize: 12,
      fontWeight: '800',
    },
    noteBox: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
    },
    noteText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
