// ============================================================
// QuestBoardScreen — "Görevler" sekmesi
// 60 görevlik statik katalog 4 zorluk kutusunda listelenir:
// Basit (30 dk) / Orta (45 dk) / Zor (1 sa) / Çok Zor (2 sa).
// Kutu başlığında bekleme süresi yazar; görev ödülü alınınca geri
// sayım başlar. Otomatik görevler ilerleme çubuğuyla ölçülür,
// manuel görevler "Yaptım" butonuyla onaylanır (yalnızca altın verir).
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
import { useData } from '../context/DataContext';
import { dateKey } from '../logic';
import { serverNow } from '../services/serverClock';
import {
  canClaimQuest,
  cooldownLeft,
  getQuest,
  QUEST_CATALOG,
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_DIFFICULTY_ORDER,
  questProgress,
} from '../data/quests';
import { useTheme } from '../theme';

// Bekleme süresini "mm:ss" veya "h:mm:ss" olarak biçimlendirir.
function formatCooldown(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function QuestBoardScreen() {
  const { data, today, claimQuest, server, refreshServer, refreshing } = useData();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  // Geri sayımların saniyede bir tazelenmesi için ortak "şimdi" zamanı.
  const [now, setNow] = useState(() => serverNow());
  // Sunucu saatine bağlı sayım (saat oynatma koruması).
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

  // Bugün kaç görev ödülü alındı (sekme başında özet).
  const doneToday = Object.entries(claims).filter(
    ([id, c]) => c?.ts && dateKey(new Date(c.ts)) === today && getQuest(id)
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      // Çek-yenile: sunucu saatini, görev alımlarını ve profili tazeler.
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
      <Text style={styles.screenTitle}>🎯 Görevler</Text>
      <Text style={styles.screenSub}>
        Bugün {doneToday} görev tamamladın — kutulardaki süreler, görevi ne
        sıklıkla yapabileceğini gösterir.
      </Text>

      {offline && (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineText}>
            📡 Sunucuya bağlanılamıyor — ödüller sunucu onayı gerektirdiği için
            şu an görev tamamlayamazsın. Bağlantı gelince yeniden dene.
          </Text>
        </View>
      )}

      {QUEST_DIFFICULTY_ORDER.map((difficulty) => {
        const diff = QUEST_DIFFICULTIES[difficulty];
        const quests = QUEST_CATALOG.filter((q) => q.difficulty === difficulty);
        const accent = C[diff.colorKey];
        return (
          <View key={difficulty} style={[styles.section, { borderColor: accent + '55' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: accent + '22' }]}>
                <Text style={styles.sectionIconText}>{diff.emoji}</Text>
              </View>
              <View style={styles.sectionTitles}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{diff.label}</Text>
                <Text style={styles.sectionDesc}>
                  ⏱ {diff.cooldownText} görev yapılabilir
                </Text>
              </View>
              <Text style={styles.sectionCount}>{quests.length} görev</Text>
            </View>

            <View style={styles.questList}>
              {quests.map((quest) => {
                const cat = QUEST_CATEGORIES[quest.category];
                const progress = questProgress(quest, dayStats, claims);
                const ready = quest.type === 'manual' || progress >= quest.target;
                const waiting = cooldownLeft(quest, claims, now);
                const done = ready && waiting === 0;
                const pct =
                  quest.type === 'auto'
                    ? Math.min(100, (progress / quest.target) * 100)
                    : 0;
                return (
                  <View key={quest.id} style={styles.quest}>
                    <Text style={styles.questEmoji}>{quest.emoji}</Text>
                    <View style={styles.questInfo}>
                      <View style={styles.questTitleRow}>
                        <Text style={styles.questTitle} numberOfLines={1}>
                          {quest.title}
                        </Text>
                        <View style={styles.catChip}>
                          <Text style={styles.catChipText}>
                            {cat.emoji} {cat.name}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.questDesc} numberOfLines={1}>
                        {quest.desc}
                      </Text>
                      <View style={styles.rewardRow}>
                        {quest.type === 'auto' ? (
                          <>
                            <View style={[styles.rewardChip, { backgroundColor: C.xp + '22' }]}>
                              <Text style={[styles.rewardText, { color: C.xp }]}>
                                +{diff.xp} XP
                              </Text>
                            </View>
                            <View style={[styles.rewardChip, { backgroundColor: C.gold + '22' }]}>
                              <Text style={[styles.rewardText, { color: C.gold }]}>
                                +{diff.gold} 🪙
                              </Text>
                            </View>
                          </>
                        ) : (
                          <View style={[styles.rewardChip, { backgroundColor: C.gold + '22' }]}>
                            <Text style={[styles.rewardText, { color: C.gold }]}>
                              +{diff.gold} 🪙
                            </Text>
                          </View>
                        )}
                        {quest.type === 'manual' && (
                          <Text style={styles.manualNote}>manuel</Text>
                        )}
                      </View>
                      {quest.type === 'auto' && (
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
                        </View>
                      )}
                    </View>

                    <View style={styles.questAction}>
                      {waiting > 0 ? (
                        <Text style={[styles.waitText, { color: C.textMuted }]}>
                          ⏳ {formatCooldown(waiting)}
                        </Text>
                      ) : done ? (
                        <Pressable
                          style={[
                            styles.claimBtn,
                            { backgroundColor: accent },
                            (claimingId || offline) && styles.claimBtnDisabled,
                          ]}
                          onPress={() => handleClaim(quest.id)}
                          disabled={!!claimingId || offline}
                        >
                          {claimingId === quest.id ? (
                            <ActivityIndicator size="small" color={C.background} />
                          ) : (
                            <Text style={[styles.claimBtnText, { color: C.background }]}>
                              {quest.type === 'auto' ? 'Ödülü Al' : 'Yaptım'}
                            </Text>
                          )}
                        </Pressable>
                      ) : (
                        <Text style={[styles.progressText, { color: C.textMuted }]}>
                          {progress}/{quest.target}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Otomatik görevler XP verir ve uygulamanın kendi ölçümleriyle sayılır;
          manuel görevler yalnızca altın kazandırır. Her görevin bekleme süresi
          dolduktan sonra ödülü yeniden alabilirsin.
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
      padding: 16,
      gap: 12,
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
    sectionCount: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    questList: {
      gap: 10,
    },
    quest: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    questEmoji: {
      fontSize: 20,
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
    catChip: {
      backgroundColor: C.surfaceLight,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    catChipText: {
      color: C.textMuted,
      fontSize: 9,
      fontWeight: '700',
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
    manualNote: {
      color: C.textMuted,
      fontSize: 9,
      fontStyle: 'italic',
    },
    track: {
      height: 5,
      borderRadius: 3,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
      marginTop: 2,
    },
    fill: {
      height: '100%',
      borderRadius: 3,
    },
    questAction: {
      minWidth: 72,
      alignItems: 'flex-end',
    },
    claimBtn: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      minHeight: 32,
      justifyContent: 'center',
    },
    claimBtnDisabled: {
      opacity: 0.55,
    },
    claimBtnText: {
      fontSize: 11,
      fontWeight: '800',
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
    waitText: {
      fontSize: 11,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    progressText: {
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
