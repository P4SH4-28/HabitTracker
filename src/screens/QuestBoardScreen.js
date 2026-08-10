// ============================================================
// QuestBoardScreen — "Günün Görevleri" ekranı (yeni nesil)
// Günde 4 TEMEL görev: Isınma / Zor I / Zor II / İmkansız.
// VIP kullanıcılar +4 EKSTRA VIP görev görür (toplam 8) ve temel
// görevlerde ×1.5 ödül çarpanı kazanır.
// Görevler her gün sıfırlanır (gün anahtarı SUNUCU saatinden gelir);
// tüm görevler otomatik sayaçlarla ölçülür — "Yaptım" yoktur.
// Ödüller sunucu onayıyla verilir (hileci duvarı).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { serverNow } from '../services/serverClock';
import {
  canClaimQuest,
  DAILY_QUESTS,
  questClaimedToday,
  questProgress,
  questReward,
  QUEST_DIFFICULTIES,
  QUEST_DIFFICULTY_ORDER,
  VIP_QUESTS,
} from '../data/quests';
import { useTheme } from '../theme';

export default function QuestBoardScreen() {
  const { data, today, claimQuest, server, refreshServer, refreshing, vipActive } = useData();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation();

  // İlerleme çubuklarının güncel kalması için ortak "şimdi" zamanı.
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const interval = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Ödül alırken buton kilitlenir (sunucu onayı beklenir).
  const [claimingId, setClaimingId] = useState(null);
  const handleClaim = async (questId) => {
    if (claimingId) return;
    setClaimingId(questId);
    await claimQuest(questId);
    setClaimingId(null);
  };
  // Çevrimdışıysa ödüller zaten verilmez — kullanıcı bilgilendirilir.
  const offline = server.connected === false;

  const claims = data.questClaims || {};
  const dayStats = data.stats.day;

  // Bugün tamamlanan görev sayısı (özet).
  const doneToday = [...DAILY_QUESTS, ...VIP_QUESTS].filter((q) =>
    questClaimedToday(q, claims, today)
  ).length;
  const vipDaysLeft = Math.max(0, Math.ceil(((data.settings.vipUntil || 0) - now) / 86400000));

  // Tek görev kartı (temel + VIP ortak bileşen).
  const renderQuest = (quest, accent, isVip) => {
    const diff = QUEST_DIFFICULTIES[quest.difficulty];
    const progress = questProgress(quest, dayStats, claims, today);
    const claimed = questClaimedToday(quest, claims, today);
    const ready = !claimed && progress >= quest.target;
    const pct = Math.min(100, (progress / quest.target) * 100);
    const reward = questReward(quest, vipActive);
    return (
      <View key={quest.id} style={[styles.quest, { borderColor: accent + '44' }]}>
        <View style={styles.questTop}>
          <Text style={styles.questEmoji}>{quest.emoji}</Text>
          <View style={styles.questInfo}>
            <View style={styles.questTitleRow}>
              <Text style={styles.questTitle} numberOfLines={1}>
                {quest.title}
              </Text>
              {isVip && (
                <View style={[styles.vipChip, { backgroundColor: C.gold + '22' }]}>
                  <Text style={[styles.vipChipText, { color: C.gold }]}>👑 VIP</Text>
                </View>
              )}
            </View>
            <Text style={styles.questDesc} numberOfLines={1}>
              {quest.desc}
            </Text>
            <View style={styles.rewardRow}>
              <View style={[styles.rewardChip, { backgroundColor: C.xp + '22' }]}>
                <Text style={[styles.rewardText, { color: C.xp }]}>+{reward.xp} XP</Text>
              </View>
              <View style={[styles.rewardChip, { backgroundColor: C.gold + '22' }]}>
                <Text style={[styles.rewardText, { color: C.gold }]}>+{reward.gold} 🪙</Text>
              </View>
              {isVip && (
                <Text style={[styles.multiplierNote, { color: C.gold }]}>×1.5 dahil</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
        </View>
        <View style={styles.questBottom}>
          <Text style={[styles.progressText, { color: C.textMuted }]}>
            {progress}/{quest.target}
            {claimed ? ' • bugün tamamlandı ✓' : ready ? ' • ödül hazır!' : ''}
          </Text>
          {claimed ? (
            <View style={[styles.doneChip, { backgroundColor: C.accent + '22' }]}>
              <Text style={[styles.doneChipText, { color: C.accent }]}>Tamamlandı ✓</Text>
            </View>
          ) : (
            <Pressable
              style={[
                styles.claimBtn,
                { backgroundColor: accent },
                (!ready || claimingId || offline) && styles.claimBtnDisabled,
              ]}
              onPress={() => handleClaim(quest.id)}
              disabled={!ready || !!claimingId || offline}
            >
              {claimingId === quest.id ? (
                <ActivityIndicator size="small" color={C.background} />
              ) : (
                <Text style={[styles.claimBtnText, { color: C.background }]}>
                  {ready ? 'Ödülü Al' : 'Devam Et'}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => refreshServer()}
          tintColor={C.primary}
          colors={[C.primary]}
          progressBackgroundColor={C.surface}
        />
      }
    >
      <Text style={styles.screenTitle}>🎯 Günün Görevleri</Text>
      <Text style={styles.screenSub}>
        Görevler her gece yarısı sıfırlanır. Bugün {doneToday}/8 görev tamamladın.
      </Text>

      {offline && (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineText}>
            📡 Sunucuya bağlanılamıyor — ödüller sunucu onayı gerektirdiği için
            şu an görev tamamlayamazsın. Bağlantı gelince yeniden dene.
          </Text>
        </View>
      )}

      {/* VIP tanıtım bandı */}
      {!vipActive ? (
        <Pressable style={styles.vipBanner} onPress={() => navigation.navigate('SeasonPass')}>
          <View style={styles.vipBannerTop}>
            <Text style={styles.vipBannerEmoji}>👑</Text>
            <Text style={styles.vipBannerTitle}>VIP ol, 8 görev kazan</Text>
          </View>
          <Text style={styles.vipBannerText}>
            +4 ekstra VIP görev, temel görevlerde ×1.5 ödül çarpanı ve Season Pass VIP
            ödülleri. Altınla satın alınır →
          </Text>
        </Pressable>
      ) : (
        <View style={[styles.vipActiveBox, { borderColor: C.gold + '55' }]}>
          <Text style={[styles.vipActiveText, { color: C.gold }]}>
            👑 VIP aktif — {vipDaysLeft} gün kaldı. Ekstra görevler ve ×1.5 çarpan açık!
          </Text>
        </View>
      )}

      {/* Temel 4 görev */}
      {QUEST_DIFFICULTY_ORDER.map((difficulty) => {
        const quest = DAILY_QUESTS.find((q) => q.difficulty === difficulty);
        if (!quest) return null;
        const diff = QUEST_DIFFICULTIES[difficulty];
        return (
          <View key={difficulty} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: C[diff.colorKey] + '22' }]}>
                <Text style={styles.sectionIconText}>{diff.emoji}</Text>
              </View>
              <View style={styles.sectionTitles}>
                <Text style={[styles.sectionTitle, { color: C[diff.colorKey] }]}>{diff.label}</Text>
                <Text style={styles.sectionDesc}>Temel görev — her gün açık</Text>
              </View>
            </View>
            {renderQuest(quest, C[diff.colorKey], false)}
          </View>
        );
      })}

      {/* VIP ekstra 4 görev */}
      {vipActive && (
        <View style={[styles.section, styles.vipSection]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: C.gold + '22' }]}>
              <Text style={styles.sectionIconText}>👑</Text>
            </View>
            <View style={styles.sectionTitles}>
              <Text style={[styles.sectionTitle, { color: C.gold }]}>VIP Ekstra Görevler</Text>
              <Text style={styles.sectionDesc}>Yalnızca Pass sahiplerine — 4 görev daha</Text>
            </View>
          </View>
          {VIP_QUESTS.map((quest) => renderQuest(quest, C.gold, true))}
        </View>
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Tüm görevler uygulamanın kendi sayaçlarıyla otomatik ölçülür ve ödüller
          sunucu onayıyla verilir. Günde bir kez alınır, gece yarısı sıfırlanır.
        </Text>
      </View>
    </ScrollView>
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
      lineHeight: 19,
      marginBottom: 4,
    },
    section: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      gap: 12,
    },
    vipSection: {
      borderColor: C.gold + '44',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionIconText: {
      fontSize: 18,
    },
    sectionTitles: {
      flex: 1,
      gap: 1,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    sectionDesc: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    quest: {
      backgroundColor: C.surfaceLight,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    questTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    questEmoji: {
      fontSize: 26,
    },
    questInfo: {
      flex: 1,
      gap: 3,
    },
    questTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    questTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
      flexShrink: 1,
    },
    vipChip: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    vipChipText: {
      fontSize: 9,
      fontWeight: '800',
    },
    questDesc: {
      color: C.textMuted,
      fontSize: 11,
    },
    rewardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rewardChip: {
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    rewardText: {
      fontSize: 10,
      fontWeight: '800',
    },
    multiplierNote: {
      fontSize: 9,
      fontWeight: '700',
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: C.surface,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 3,
    },
    questBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressText: {
      fontSize: 11,
      fontWeight: '700',
    },
    claimBtn: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 7,
      minHeight: 32,
      justifyContent: 'center',
    },
    claimBtnDisabled: {
      opacity: 0.5,
    },
    claimBtnText: {
      fontSize: 11,
      fontWeight: '800',
    },
    doneChip: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    doneChipText: {
      fontSize: 11,
      fontWeight: '800',
    },
    vipBanner: {
      backgroundColor: C.gold + '18',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.gold + '55',
      padding: 16,
      gap: 6,
    },
    vipBannerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    vipBannerEmoji: {
      fontSize: 22,
    },
    vipBannerTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    vipBannerText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    vipActiveBox: {
      backgroundColor: C.gold + '12',
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
    },
    vipActiveText: {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },
    offlineBox: {
      backgroundColor: C.danger + '18',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.danger + '66',
      padding: 12,
    },
    offlineText: {
      color: C.text,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
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
