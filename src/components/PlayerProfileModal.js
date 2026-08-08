// ============================================================
// PlayerProfileModal — Liderlik tablosundaki bir kullanıcının
// profilini ziyaret etme ekranı (tam ekran).
// - Kullanıcının seviyesi, XP'si ve serisi
// - Kendi Gelişim ekranı gibi: istatistikler, haftalık grafik,
//   ısı haritası ve en çok yaptığı aktiviteler
// - "İstek Gönder" butonu: kullanıcıya arkadaşlık isteği gönderir
// ============================================================
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getAvatarEmoji, getFrame } from '../data/shop';
import { sendFriendRequest } from '../services/friendService';
import { useTheme } from '../theme';
import { FrameDecor } from './AvatarCircle';
import {
  bestStreak,
  buildDailyCompletions,
  levelFromTotalXp,
  topHabits,
  totalCompletions,
  weeklyComparison,
} from '../logic';
import Heatmap from './Heatmap';
import StatCard from './StatCard';
import TopHabits from './TopHabits';
import WeekChart from './WeekChart';
import WeeklyCompare from './WeeklyCompare';
import XpBar from './XpBar';

export default function PlayerProfileModal({ player, onClose }) {
  const { data, today, refreshServer } = useData();
  const { user: authUser } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const activities = useMemo(() => player?.activities || [], [player]);
  // Canlı satırlarda id UUID olabilir; isimle de eşleşme denenir.
  const isFriend = data.friends.some(
    (f) => f.id === player?.id || f.name === player?.name
  );

  // Profil istatistikleri: tıpkı Gelişim ekranındaki mantıkla hesaplanır.
  const stats = useMemo(() => {
    if (!player) return null;
    return {
      levelInfo: levelFromTotalXp(player.totalXp),
      daily: buildDailyCompletions(activities, 35, today),
      total: totalCompletions(activities),
      best: bestStreak(activities, today),
      top: topHabits(activities, 3),
      weekly: weeklyComparison(activities, today),
    };
  }, [player, activities, today]);

  const sendRequest = async () => {
    if (!player || sending) return;
    setSending(true);
    setSendResult(null);
    const res = await sendFriendRequest(authUser?.name, player.name);
    setSending(false);
    if (!res.ok) {
      setSendResult({ ok: false, text: res.error || 'İstek gönderilemedi' });
      return;
    }
    if (res.state === 'already_friends') {
      setSendResult({ ok: true, text: 'Zaten arkadaşsınız ✓' });
      await refreshServer();
    } else if (res.state === 'already_pending') {
      setSendResult({ ok: true, text: 'İstek zaten beklemede ⏳' });
    } else {
      setSendResult({ ok: true, text: 'İstek gönderildi ✓' });
    }
  };

  if (!player || !stats) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.screen}>
          {/* Üst çubuk: kapatma butonu */}
          <View style={styles.topBar}>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Profil başlığı: avatar, ad, seviye/XP/seri */}
            <View style={styles.profileHeader}>
              {player.frameId ? (
                <FrameDecor ring={getFrame(player.frameId)?.emoji} size={84}>
                  <View style={[styles.avatar, { backgroundColor: C.primaryDark }]}>
                    <Text style={styles.avatarEmoji}>
                      {player.avatarId ? getAvatarEmoji(player.avatarId) : player.emoji}
                    </Text>
                  </View>
                </FrameDecor>
              ) : (
                <View style={[styles.avatar, { backgroundColor: C.primaryDark }]}>
                  <Text style={styles.avatarEmoji}>
                    {player.avatarId ? getAvatarEmoji(player.avatarId) : player.emoji}
                  </Text>
                </View>
              )}
              <Text style={styles.name}>{player.name}</Text>
              {isFriend && <Text style={styles.friendBadge}>Arkadaşın ✓</Text>}
              <View style={styles.headerStats}>
                <View style={styles.headerStat}>
                  <Text style={styles.headerStatIcon}>🔥</Text>
                  <Text style={styles.headerStatValue}>{player.streak}</Text>
                </View>
                <View style={styles.headerStat}>
                  <Text style={styles.headerStatIcon}>⚡</Text>
                  <Text style={styles.headerStatValue}>{player.totalXp} XP</Text>
                </View>
              </View>
            </View>

            {/* Seviye çubuğu (aynı bileşen, senin ekranındaki gibi) */}
            <View style={styles.card}>
              <XpBar
                level={stats.levelInfo.level}
                curXp={stats.levelInfo.curXp}
                nextThreshold={stats.levelInfo.nextThreshold}
              />
            </View>

            {/* Özet istatistik kartları */}
            <View style={styles.statsRow}>
              <StatCard
                icon="✅"
                label="Toplam Aktivite"
                value={stats.total}
                color={C.accent}
              />
              <StatCard
                icon="🔥"
                label="En İyi Seri"
                value={stats.best}
                color={C.xp}
              />
            </View>

            {/* Haftalık karşılaştırma + grafikler + en çok yaptıkları */}
            <WeeklyCompare weekly={stats.weekly} />
            <WeekChart daily={stats.daily} today={today} total={activities.length} />
            <Heatmap daily={stats.daily} />
            {stats.top.length > 0 && <TopHabits items={stats.top} />}

            {/* Arkadaşlık isteği gönderme */}
            {isFriend ? (
              <View style={[styles.actionButton, styles.actionDone]}>
                <Text style={styles.actionDoneText}>✓ Arkadaş listenizde</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.actionButton, sending && styles.actionDisabled]}
                onPress={sendRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={C.onPrimary} />
                ) : (
                  <Text style={styles.actionText}>
                    {sendResult ? (sendResult.ok ? '✓ ' : '') + sendResult.text : '+ İstek Gönder'}
                  </Text>
                )}
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: C.background,
    },
    screen: {
      flex: 1,
      paddingTop: 16,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      color: C.textMuted,
      fontSize: 15,
      fontWeight: '700',
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 48,
      gap: 14,
    },
    profileHeader: {
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmoji: {
      fontSize: 40,
    },
    name: {
      color: C.text,
      fontSize: 22,
      fontWeight: '800',
    },
    friendBadge: {
      color: C.accent,
      fontSize: 12,
      fontWeight: '800',
      backgroundColor: C.accent + '22',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      overflow: 'hidden',
    },
    headerStats: {
      flexDirection: 'row',
      gap: 14,
    },
    headerStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerStatIcon: {
      fontSize: 13,
    },
    headerStatValue: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      height: 52,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionDisabled: {
      opacity: 0.6,
    },
    actionText: {
      color: C.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    actionDone: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.accent,
    },
    actionDoneText: {
      color: C.accent,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
