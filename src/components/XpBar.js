import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

// Günlük XP göstergesi (anti-farm şeffaflığı): bugün kazanılan XP,
// günlük tavanla birlikte gösterilir. Tavan dolduysa sarı uyarı rengi.
export default function XpBar({ level, curXp, nextThreshold, todayXp = null, todayCap = null }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const percent = Math.min(100, (curXp / nextThreshold) * 100);
  const capReached = todayCap != null && todayXp != null && todayXp >= todayCap;
  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Text style={styles.levelNumber}>{level}</Text>
        <Text style={styles.levelLabel}>SEVİYE</Text>
      </View>
      <View style={styles.block}>
        <View style={styles.header}>
          <Text style={styles.label}>Deneyim</Text>
          <Text style={styles.value}>
            {curXp} / {nextThreshold} XP
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
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
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.8)',
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
    backgroundColor: C.xp,
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
