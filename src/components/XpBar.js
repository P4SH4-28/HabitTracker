import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

// Günlük XP göstergesi (anti-farm şeffaflığı): bugün kazanılan XP,
// günlük tavanla birlikte gösterilir. Tavan dolduysa sarı uyarı rengi.
// Premium: gradient seviye rozeti + gradient dolu çubuk + soft glow.
export default function XpBar({ level, curXp, nextThreshold, todayXp = null, todayCap = null }) {
  const { colors: C, glow } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const percent = Math.min(100, (curXp / nextThreshold) * 100);
  const capReached = todayCap != null && todayXp != null && todayXp >= todayCap;
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        style={[styles.badge, glow(C.primary, { opacity: 0.5, radius: 18, offset: 5, elevation: 10 })]}
      >
        <Text style={styles.levelNumber}>{level}</Text>
        <Text style={styles.levelLabel}>SEVİYE</Text>
      </LinearGradient>
      <View style={styles.block}>
        <View style={styles.header}>
          <Text style={styles.label}>Deneyim</Text>
          <Text style={styles.value}>
            {curXp} / {nextThreshold} XP
          </Text>
        </View>
        <View style={styles.track}>
          <LinearGradient
            colors={capReached ? [C.danger, '#B91C5C'] : [C.xp, C.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${percent}%` }]}
          />
        </View>
        {todayCap != null && todayXp != null ? (
          <Text style={[styles.hint, capReached && styles.hintCap]}>
            {capReached
              ? `Bugünün XP sınırı doldu (${todayXp}/${todayCap})`
              : `Bugünkü XP: ${todayXp}/${todayCap} • Sonraki seviyeye ${nextThreshold - curXp} XP kaldı`}
          </Text>
        ) : (
          <Text style={styles.hint}>Sonraki seviyeye {nextThreshold - curXp} XP kaldı</Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    badge: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelNumber: {
      color: C.onPrimary,
      fontSize: 28,
      fontWeight: '800',
    },
    levelLabel: {
      color: C.onPrimary + 'CC',
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.5,
    },
    block: {
      flex: 1,
      gap: 6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    value: {
      color: C.xp,
      fontSize: 13,
      fontWeight: '700',
    },
    track: {
      height: 12,
      borderRadius: 6,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 6,
    },
    hint: {
      color: C.textMuted,
      fontSize: 11,
    },
    hintCap: {
      color: C.danger,
      fontWeight: '700',
    },
  });
}