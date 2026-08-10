// ============================================================
// SeasonPassScreen — Battle Pass (Season Pass)
// Pass seviyesi toplam XP'den türetilir (uygulama seviyesiyle aynı
// eğri, üst sınır 20). Her seviyede iki ödül kutusu vardır:
//   Free → herkese açık (altın paketleri, temalar, avatar, çerçeve)
//   VIP  → yalnızca aktif VIP üyelere (Lottie animasyonlu çerçeveler,
//          özel temalar, nadir rozetler)
// VIP satın alma altınla yapılır (sunucu onaylı, bkz. vip-action).
// ============================================================
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useData } from '../context/DataContext';
import {
  BADGES,
  PASS_LEVELS,
  PASS_MAX_LEVEL,
  PASS_NAME,
  passLevelFromXp,
  passRewardClaimed,
  rewardLabel,
} from '../data/seasonPass';
import { VIP_PRICE_GOLD } from '../data/quests';
import { getLottieSource } from '../components/AvatarCircle';
import { getFrame } from '../data/shop';
import { serverNow } from '../services/serverClock';
import { useTheme } from '../theme';

export default function SeasonPassScreen() {
  const { data, claimPassReward, buyVip, vipActive } = useData();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [buying, setBuying] = useState(false);
  const [claimingKey, setClaimingKey] = useState(null);

  const pass = passLevelFromXp(data.stats.totalXp);
  const claims = data.passClaims || {};
  const gold = data.stats.gold || 0;
  const vipDaysLeft = Math.max(0, Math.ceil(((data.settings.vipUntil || 0) - serverNow()) / 86400000));

  const handleBuyVip = async () => {
    if (buying) return;
    setBuying(true);
    await buyVip();
    setBuying(false);
  };

  const handleClaim = (level, track) => {
    const key = `${level}_${track}`;
    if (claimingKey) return;
    setClaimingKey(key);
    claimPassReward(level, track);
    setClaimingKey(null);
  };

  // Ödül kutusu görünümü (her iki track için ortak).
  const renderBox = (level, track) => {
    const lvl = PASS_LEVELS.find((l) => l.level === level);
    const reward = lvl ? (track === 'vip' ? lvl.vip : lvl.free) : null;
    const claimed = passRewardClaimed(claims, level, track);
    const reachable = pass.level >= level;
    const isVip = track === 'vip';
    const lockLabel =
      !reachable
        ? 'Seviye açılınca'
        : isVip && !vipActive
          ? 'VIP gerekli'
          : null;
    const accent = isVip ? C.gold : C.accent;
    const key = `${level}_${track}`;

    let preview = null;
    if (reward) {
      if (reward.type === 'gold') {
        preview = <Text style={styles.previewGold}>🪙 {reward.amount}</Text>;
      } else if (reward.type === 'badge') {
        const badge = BADGES[reward.badgeId];
        preview = badge ? <Text style={styles.previewBadge}>{badge.emoji}</Text> : null;
      } else if (reward.type === 'theme') {
        preview = <Text style={styles.previewTheme}>🎨 Tema</Text>;
      } else if (reward.type === 'avatar') {
        preview = <Text style={styles.previewAvatar}>🖼️ Avatar</Text>;
      } else if (reward.type === 'lottieFrame') {
        const frame = getFrame(reward.frameId);
        const source = getLottieSource(reward.frameId);
        preview = source ? (
          <LottieView
            source={source}
            autoPlay
            loop
            style={{ width: 56, height: 56 }}
          />
        ) : (
          <Text style={styles.previewBadge}>✨</Text>
        );
      } else if (reward.type === 'frame') {
        const frame = getFrame(reward.frameId);
        preview = <Text style={styles.previewTheme}>{frame?.emoji || '🖼️'} Çerçeve</Text>;
      }
    }

    return (
      <View
        key={key}
        style={[
          styles.box,
          isVip ? styles.vipBox : styles.freeBox,
          claimed && styles.boxClaimed,
        ]}
      >
        <View style={styles.boxPreview}>{preview || <Text style={styles.previewEmpty}>?</Text>}</View>
        <View style={styles.boxInfo}>
          <Text style={[styles.boxTrack, { color: accent }]}>
            {isVip ? '👑 VIP' : 'Free'}
          </Text>
          <Text style={styles.boxReward} numberOfLines={2}>
            {reward ? rewardLabel(reward) : '—'}
          </Text>
        </View>
        {claimed ? (
          <View style={styles.claimedChip}>
            <Text style={styles.claimedChipText}>Alındı ✓</Text>
          </View>
        ) : lockLabel ? (
          <View style={styles.lockChip}>
            <Text style={styles.lockChipText}>🔒 {lockLabel}</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.claimBtn, { backgroundColor: accent }]}
            onPress={() => handleClaim(level, track)}
            disabled={!!claimingKey}
          >
            {claimingKey === key ? (
              <ActivityIndicator size="small" color={C.background} />
            ) : (
              <Text style={[styles.claimBtnText, { color: C.background }]}>Al</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>🎖️ Season Pass</Text>
      <Text style={styles.screenSub}>{PASS_NAME}</Text>

      {/* Seviye ilerleme kartı */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View style={styles.levelCircle}>
            <Text style={styles.levelText}>{pass.level}</Text>
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>
              Pass Seviyesi {pass.level}
              {pass.level >= PASS_MAX_LEVEL ? ' (Maksimum)' : ''}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${
                      pass.level >= PASS_MAX_LEVEL
                        ? 100
                        : Math.min(100, (pass.curXp / pass.nextThreshold) * 100)
                    }%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressHint}>
              {pass.level >= PASS_MAX_LEVEL
                ? 'Tüm seviyeler tamamlandı!'
                : `Bir sonraki seviye için ${pass.nextThreshold - pass.curXp} XP kaldı`}
            </Text>
          </View>
        </View>
      </View>

      {/* VIP durum / satın alma kartı */}
      {vipActive ? (
        <View style={[styles.vipActiveCard, { borderColor: C.gold + '55' }]}>
          <Text style={styles.vipActiveEmoji}>👑</Text>
          <View style={styles.vipActiveInfo}>
            <Text style={[styles.vipActiveTitle, { color: C.gold }]}>VIP aktif</Text>
            <Text style={styles.vipActiveText}>
              {vipDaysLeft} gün kaldı — VIP ödül kutuları ve ekstra görevler açık.
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          style={[styles.buyVipCard, { borderColor: C.gold + '55' }]}
          onPress={handleBuyVip}
          disabled={buying}
        >
          <Text style={styles.buyVipEmoji}>👑</Text>
          <View style={styles.buyVipInfo}>
            <Text style={styles.buyVipTitle}>VIP üyeliği al</Text>
            <Text style={styles.buyVipText}>
              30 gün boyunca: +4 ekstra günlük görev, temel görevlerde ×1.5 çarpan ve
              Season Pass VIP ödüllerine erişim.
            </Text>
            <View style={styles.buyVipBottom}>
              <Text style={[styles.buyVipPrice, { color: C.gold }]}>🪙 {VIP_PRICE_GOLD}</Text>
              {buying ? (
                <ActivityIndicator size="small" color={C.gold} />
              ) : (
                <View style={[styles.buyVipBtn, { backgroundColor: C.gold }]}>
                  <Text style={styles.buyVipBtnText}>Satın Al</Text>
                </View>
              )}
            </View>
            {gold < VIP_PRICE_GOLD && (
              <Text style={styles.buyVipWarn}>
                {VIP_PRICE_GOLD - gold} 🪙 daha lazım (bakiyen: {gold})
              </Text>
            )}
          </View>
        </Pressable>
      )}

      {/* Seviye ödül listesi */}
      <View style={styles.levelList}>
        {PASS_LEVELS.map((lvl) => (
          <View key={lvl.level} style={[styles.levelRow, pass.level >= lvl.level && styles.levelReached]}>
            <View style={styles.levelNumWrap}>
              <Text
                style={[
                  styles.levelNum,
                  { color: pass.level >= lvl.level ? C.text : C.textMuted },
                ]}
              >
                {lvl.level}
              </Text>
              {pass.level === lvl.level && (
                <View style={[styles.currentDot, { backgroundColor: C.primary }]} />
              )}
            </View>
            <View style={styles.levelBoxes}>
              {renderBox(lvl.level, 'free')}
              {renderBox(lvl.level, 'vip')}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Pass seviyen toplam XP'nle otomatik yükselir. Ödül kutuları seviyeye
          ulaştığında açılır; VIP kutuları yalnızca aktif VIP üyelere verilir.
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
    },
    progressCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
    },
    progressTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    levelCircle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: C.primary + '22',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: C.primary,
    },
    levelText: {
      color: C.primary,
      fontSize: 22,
      fontWeight: '900',
    },
    progressInfo: {
      flex: 1,
      gap: 6,
    },
    progressTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: '800',
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: C.primary,
    },
    progressHint: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    vipActiveCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.gold + '12',
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
    },
    vipActiveEmoji: {
      fontSize: 30,
    },
    vipActiveInfo: {
      flex: 1,
      gap: 3,
    },
    vipActiveTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    vipActiveText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    buyVipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.gold + '12',
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
    },
    buyVipEmoji: {
      fontSize: 34,
    },
    buyVipInfo: {
      flex: 1,
      gap: 4,
    },
    buyVipTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    buyVipText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    buyVipBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    buyVipPrice: {
      fontSize: 14,
      fontWeight: '800',
    },
    buyVipBtn: {
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    buyVipBtnText: {
      color: C.background,
      fontSize: 13,
      fontWeight: '900',
    },
    buyVipWarn: {
      color: C.danger,
      fontSize: 11,
      fontWeight: '700',
    },
    levelList: {
      gap: 8,
    },
    levelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    levelReached: {
      opacity: 1,
    },
    levelNumWrap: {
      width: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelNum: {
      fontSize: 16,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    currentDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 2,
    },
    levelBoxes: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    box: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      padding: 10,
      gap: 6,
      minHeight: 96,
    },
    freeBox: {
      backgroundColor: C.surface,
      borderColor: C.border,
    },
    vipBox: {
      backgroundColor: C.gold + '0F',
      borderColor: C.gold + '44',
    },
    boxClaimed: {
      opacity: 0.55,
    },
    boxPreview: {
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewGold: {
      fontSize: 22,
      fontWeight: '800',
    },
    previewBadge: {
      fontSize: 30,
    },
    previewTheme: {
      fontSize: 14,
      fontWeight: '700',
    },
    previewAvatar: {
      fontSize: 14,
      fontWeight: '700',
    },
    previewEmpty: {
      color: C.textMuted,
      fontSize: 14,
    },
    boxInfo: {
      gap: 2,
    },
    boxTrack: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    boxReward: {
      color: C.text,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 15,
    },
    claimBtn: {
      borderRadius: 8,
      paddingVertical: 6,
      alignItems: 'center',
      minHeight: 28,
      justifyContent: 'center',
    },
    claimBtnText: {
      fontSize: 11,
      fontWeight: '900',
    },
    claimedChip: {
      borderRadius: 8,
      backgroundColor: C.accent + '22',
      paddingVertical: 6,
      alignItems: 'center',
    },
    claimedChipText: {
      color: C.accent,
      fontSize: 10,
      fontWeight: '900',
    },
    lockChip: {
      borderRadius: 8,
      backgroundColor: C.surfaceLight,
      paddingVertical: 6,
      alignItems: 'center',
    },
    lockChipText: {
      color: C.textMuted,
      fontSize: 9,
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
