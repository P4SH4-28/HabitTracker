// ============================================================
// LeaderboardScreen — "Liderlik" sekmesi
// - 5. seviyeden önce KİLİTLİDİR: kilit ekranında seviye 5'e kaç XP
//   kaldığı gösterilir.
// - Açılınca: sunucudaki HERKES toplam XP'ye göre sıralanır.
//   Arkadaş olması şart değildir; sunucuya bağlanılamazsa önbellek
//   verisi ve "çevrimdışı" uyarısı gösterilir.
// - Bir satıra dokununca o kullanıcının profili açılır; profilinden
//   Gelişim verilerine bakabilir ve arkadaşlık isteği gönderebilirsin.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import PlayerProfileModal from '../components/PlayerProfileModal';
import AvatarCircle from '../components/AvatarCircle';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getAvatarEmoji } from '../data/shop';
import { bestStreak, levelFromTotalXp } from '../logic';
import { getLeaderboardData } from '../services/leaderboardService';
import { useTheme } from '../theme';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
// Madalya renkleri sabittir (tema değişse bile kupa renkleri değişmez).
const PODIUM_COLORS = { 1: '#FFD75E', 2: '#C0C8D8', 3: '#D98E5A' };

export default function LeaderboardScreen() {
  const { data, today, leaderboardMinLevel, leaderboardMinXp, refreshServer, refreshing } = useData();
  const { user: authUser } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { stats, friends, players } = data;
  const meName = authUser?.name || 'Sen';
  const myLevel = levelFromTotalXp(stats.totalXp).level;
  const locked = myLevel < leaderboardMinLevel;
  const [selected, setSelected] = useState(null);

  // Canlı Supabase liderlik verisi: { ok, leaderboard } | { ok: false, error }.
  const [live, setLive] = useState(null);

  const loadLive = useCallback(async () => {
    setLive(await getLeaderboardData(authUser?.name));
  }, [authUser?.name]);

  // Açılışta canlı veriyi çek.
  useEffect(() => {
    loadLive();
  }, [loadLive]);

  // Arkadaşları id'ye göre hızlıca bulmak için bir küme (set).
  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  // Çek-yenile: canlı liderlik verisi + sunucu senkronu.
  const onRefresh = useCallback(() => {
    loadLive();
    refreshServer();
  }, [loadLive, refreshServer]);

  const refreshProps = {
    refreshing,
    onRefresh,
    tintColor: C.primary,
    colors: [C.primary],
    progressBackgroundColor: C.surface,
  };

  // Sıralama: canlı veri varsa (sen + arkadaşların) kullanılır;
  // yoksa önbellekteki sunucu listesi + arkadaşlar gösterilir.
  const entries = useMemo(() => {
    if (live?.ok) {
      return live.leaderboard.map((p) => ({
        id: p.id,
        name: p.username,
        emoji: p.isCurrentUser ? getAvatarEmoji(data.settings.avatarId) : '😀',
        avatarId: p.isCurrentUser ? data.settings.avatarId : p.avatarId,
        frameId: p.isCurrentUser ? data.settings.frameId : p.frameId,
        photoUrl: p.isCurrentUser ? data.settings.photoUrl : p.photoUrl,
        totalXp: p.xp,
        coins: p.coins,
        streak: 0,
        isMe: p.isCurrentUser,
        isFriend: !p.isCurrentUser,
        // Katman 4: şüpheli kullanıcı bayrağı + 7 günlük XP trendi.
        flagged: !!p.flagged,
        xp7d: p.xp7d || 0,
      }));
    }
    const poolIds = new Set(players.map((p) => p.id));
    const extraFriends = friends.filter(
      (f) => !poolIds.has(f.id) && f.name !== meName
    );
    return [
      {
        id: 'me',
        name: authUser?.name || 'Sen',
        // Profil fotoğrafı: yüklenen fotoğraf, yoksa dükkan avatarın.
        emoji: getAvatarEmoji(data.settings.avatarId),
        avatarId: data.settings.avatarId,
        frameId: data.settings.frameId,
        photoUrl: data.settings.photoUrl,
        totalXp: stats.totalXp,
        isMe: true,
        streak: bestStreak(data.habits, today),
      },
      ...players
        .filter((p) => p.name !== meName)
        .map((p) => ({ ...p, isMe: false, isFriend: friendIds.has(p.id) })),
      ...extraFriends.map((f) => ({ ...f, isMe: false, isFriend: true })),
    ].sort((a, b) => b.totalXp - a.totalXp);
  }, [live, players, friends, stats.totalXp, friendIds, data.habits, today, data.settings.avatarId, data.settings.frameId, data.settings.photoUrl, meName, authUser?.name]);

  // ---------- KİLİT EKRANI: seviye 5'ten önce ----------
  if (locked) {
    const neededXp = Math.max(0, leaderboardMinXp - stats.totalXp);
    const pct = Math.min(100, (stats.totalXp / leaderboardMinXp) * 100);
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl {...refreshProps} />}
        >
          <Text style={styles.screenTitle}>Liderlik</Text>
          <Text style={styles.screenSub}>Arkadaşlarınla rekabet et</Text>

          <View style={styles.lockBox}>
            <Text style={styles.lockEmoji}>🏆</Text>
            <Text style={styles.lockTitle}>Liderlik Tablosu Kilitli</Text>
            <Text style={styles.lockText}>
              {leaderboardMinLevel}. seviyeye ulaştığında tablo açılır ve herkesin
              ilerlemesini görüp profillerini ziyaret edebilirsin.
            </Text>

            {/* Seviye 5'e ilerleme çubuğu */}
            <View style={styles.lockProgressHeader}>
              <Text style={styles.lockProgressLabel}>Seviye {leaderboardMinLevel} yolu</Text>
              <Text style={styles.lockProgressValue}>%{Math.round(pct)}</Text>
            </View>
            <View style={styles.lockTrack}>
              <View style={[styles.lockFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.lockHint}>
              Şu an Seviye {myLevel} — Seviye {leaderboardMinLevel} için {neededXp} XP daha
              kazanmalısın
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------- AÇIK LİDERLİK TABLOSU ----------
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const podiumOrder = podium.length === 3 ? [1, 0, 2] : podium.map((_, i) => i);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl {...refreshProps} />}
      >
        <Text style={styles.screenTitle}>Liderlik</Text>
        <Text style={styles.screenSub}>Herkes burada — profillere dokunarak göz at</Text>

        {live && !live.ok && (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineText}>
              📡 Canlı liderlik verisi alınamadı — önbellek gösteriliyor.
            </Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                refreshServer();
                loadLive();
              }}
            >
              <Text style={styles.retryText}>Yenile</Text>
            </Pressable>
          </View>
        )}

        {entries.length > 0 && (
          <View style={styles.podiumRow}>
            {podiumOrder.map((idx) => {
              const e = podium[idx];
              const rank = idx + 1;
              const isTop = rank === 1;
              return (
                <Pressable
                  key={e.id}
                  style={[styles.podiumCard, { height: isTop ? 130 : 100 }, e.isMe && styles.meCard]}
                  onPress={() => setSelected(e)}
                >
                  <Text style={styles.podiumMedal}>{MEDALS[rank]}</Text>
                  <AvatarCircle
                    avatarId={e.avatarId}
                    photo={e.photoUrl}
                    frameId={e.frameId}
                    size={48}
                    ringColor={PODIUM_COLORS[rank]}
                  />
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {e.name}
                  </Text>
                  <Text style={[styles.podiumXp, { color: PODIUM_COLORS[rank] }]}>
                    {e.totalXp} XP
                  </Text>
                  {e.coins != null && (
                    <Text style={styles.podiumCoins}>🪙 {e.coins}</Text>
                  )}
                  {e.isMe && <Text style={styles.meLabel}>SEN</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.list}>
          {entries.map((e, i) => (
            <Pressable
              key={e.id}
              style={({ pressed }) => [
                styles.row,
                e.isMe && styles.meRow,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => setSelected(e)}
            >
              <View style={styles.rankBox}>
                <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
              </View>
              <AvatarCircle
                avatarId={e.avatarId}
                photo={e.photoUrl}
                frameId={e.frameId}
                size={38}
              />
              <View style={styles.rowInfo}>
                <View style={styles.rowNameLine}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {e.name} {e.isMe && <Text style={styles.meName}>(sen)</Text>}
                  </Text>
                  {e.isFriend && <Text style={styles.friendChip}>ARKADAŞ</Text>}
                  {/* Katman 4: şüpheli kullanıcı bayrağı (herkese görünür) */}
                  {e.flagged && (
                    <Text style={styles.flagChip}>⚠️ ŞÜPHELİ</Text>
                  )}
                </View>
                <Text style={styles.rowStreak}>
                  {e.coins != null ? `🪙 ${e.coins}` : `🔥 ${e.streak} günlük seri`}
                  {e.xp7d > 0 ? `   •   7 gün: +${e.xp7d} XP` : ''}
                </Text>
              </View>
              <Text style={styles.rowXp}>{e.totalXp} XP</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            💡 Profillere dokunabilir, o kullanıcının gelişim verilerini görebilir ve arkadaşlık
            isteği gönderebilirsin. Onaylanan arkadaşların Arkadaşlar sekmesinde listelenir.
          </Text>
        </View>
      </ScrollView>

      {/* Profil ziyareti modalı */}
      <PlayerProfileModal
        player={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
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
    offlineBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.danger,
      padding: 12,
    },
    offlineText: {
      flex: 1,
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    retryButton: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    retryText: {
      color: C.onPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    lockBox: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 24,
      alignItems: 'center',
      gap: 12,
      marginTop: 20,
    },
    lockEmoji: {
      fontSize: 52,
    },
    lockTitle: {
      color: C.text,
      fontSize: 19,
      fontWeight: '800',
    },
    lockText: {
      color: C.textMuted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
    lockProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 6,
    },
    lockProgressLabel: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    lockProgressValue: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    lockTrack: {
      width: '100%',
      height: 10,
      borderRadius: 5,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    lockFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: C.primary,
    },
    lockHint: {
      color: C.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    podiumRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 10,
      marginTop: 10,
    },
    podiumCard: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: 12,
      gap: 4,
    },
    meCard: {
      borderColor: C.primary,
    },
    podiumMedal: {
      fontSize: 24,
      position: 'absolute',
      top: 8,
    },
    podiumAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      marginTop: 20,
    },
    podiumEmoji: {
      fontSize: 24,
    },
    podiumName: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
    podiumXp: {
      fontSize: 12,
      fontWeight: '800',
    },
    podiumCoins: {
      color: C.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    meLabel: {
      color: C.primary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
    },
    list: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      gap: 12,
    },
    meRow: {
      borderColor: C.primary,
      backgroundColor: C.primaryDark + '33',
    },
    rankBox: {
      width: 30,
      alignItems: 'center',
    },
    rank: {
      color: C.textMuted,
      fontSize: 15,
      fontWeight: '800',
    },
    rankTop: {
      color: C.text,
    },
    rowEmoji: {
      fontSize: 20,
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    rowNameLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowName: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
    },
    meName: {
      color: C.primary,
      fontWeight: '700',
    },
    friendChip: {
      color: C.accent,
      fontSize: 9,
      fontWeight: '800',
      backgroundColor: C.accent + '22',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: 'hidden',
    },
    flagChip: {
      color: C.danger,
      fontSize: 9,
      fontWeight: '800',
      backgroundColor: C.danger + '22',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: 'hidden',
    },
    rowStreak: {
      color: C.textMuted,
      fontSize: 12,
    },
    rowXp: {
      color: C.xp,
      fontSize: 13,
      fontWeight: '800',
    },
    chevron: {
      color: C.textMuted,
      fontSize: 18,
      fontWeight: '700',
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
