// ============================================================
// SplashSkeleton.js — Uygulama verisi yüklenirken gösterilen
// titreşimli (pulse) iskelet ekranı. Spinner yerine ana sayfanın
// ana hatlarını ipucu gibi göstererek yükleme hissi verir.
// Faz C3 (modal revizyonu) sonrası yalnızca statik bir yer tutucu.
// ============================================================
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

function SkeletonBlock({ width, height, radius = 10, opacity, style }) {
  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export default function SplashSkeleton() {
  const { colors: C } = useTheme();
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const block = {
    backgroundColor: C.surfaceLight,
    opacity: pulse,
  };

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={styles.topRow}>
        <View style={styles.topText}>
          <SkeletonBlock width={140} height={20} {...block} />
          <SkeletonBlock width={190} height={14} {...block} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBlock width={48} height={48} radius={24} {...block} />
      </View>

      <SkeletonBlock width="100%" height={90} {...block} style={{ marginTop: 16 }} />

      {[0, 1, 2].map((i) => (
        <SkeletonBlock
          key={i}
          width="100%"
          height={64}
          {...block}
          style={{ marginTop: 12 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  topText: {
    gap: 2,
  },
  block: {
    backgroundColor: '#22262f',
  },
});
