// ============================================================
// Confetti — sıfır bağımlılık kutlama parçacıkları (RN Animated)
// - Modal içinde (LevelUpModal) veya App.js kökünde overlay olarak
//   çalışır; ikisi aynı anda var olabilir.
// - Event tabanlı: services/effects.js'teki celebrate() çağrılınca
//   patlama başlar. "filter" prop'u hangi kaynağı dinleyeceğini seçer:
//     <Confetti filter={(src) => src === 'levelup'} />
// - Web + iOS + Android uyumlu (useNativeDriver güvenli).
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { subscribeEffects } from '../services/effects';

const PALETTE = [
  '#7C5CFF',
  '#22D3A5',
  '#F0436E',
  '#38BDF8',
  '#F59E0B',
  '#FFD75E',
  '#4ADE80',
  '#F472B6',
];

// Tam patlama: 40 parçacık. Mini (seri kilometre taşı): 18 parçacık.
function makeParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: PALETTE[i % PALETTE.length],
    size: 5 + Math.random() * 8,
    circle: i % 3 === 0,
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    rot: new Animated.Value(0),
    scale: new Animated.Value(0.5 + Math.random() * 0.9),
    opacity: new Animated.Value(0),
    angle: Math.random() * Math.PI * 2,
    dist: 110 + Math.random() * 230,
    rise: 60 + Math.random() * 150,
    rotate: (Math.random() - 0.5) * 720,
    delay: Math.random() * 220,
  }));
}

function runBurst(setRun, origin, mode) {
  const count = mode === 'mini' ? 18 : 40;
  const particles = makeParticles(count);
  const onDone = () => setRun(null);

  const anims = particles.map((p) =>
    Animated.sequence([
      Animated.delay(p.delay),
      Animated.parallel([
        Animated.timing(p.opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(p.x, {
          toValue: Math.cos(p.angle) * p.dist,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: Math.sin(p.angle) * p.dist - p.rise,
          duration: 460,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.rot, { toValue: p.rotate, duration: 850, useNativeDriver: true }),
        Animated.timing(p.scale, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ]),
      // Yerçekimi: parçacık önce yükselir, sonra aşağı düşer.
      Animated.timing(p.y, {
        toValue: Math.sin(p.angle) * p.dist + 260 + Math.random() * 220,
        duration: 560,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(p.opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ])
  );

  Animated.parallel(anims).start(onDone);
  setRun({ particles, origin, token: Date.now() });
}

export default function Confetti({ filter }) {
  const { width, height } = useWindowDimensions();
  const [run, setRun] = useState(null);
  // Kullanıcı kaynak/ekran boyutu değiştiğinde eski zamanlayıcıyı temizle.
  const timerRef = useRef(null);

  useEffect(() => {
    return subscribeEffects((payload) => {
      if (payload?.type !== 'celebrate') return;
      if (filter && !filter(payload.source)) return;
      // Önceki patlamayı durdur → art arda gelen kutlamalar kuyruksuz üst üste biner.
      setRun(null);
      clearTimeout(timerRef.current);
      const origin =
        payload.origin ||
        (payload.mode === 'mini'
          ? { x: width * 0.5, y: height * 0.38 }
          : { x: width * 0.5, y: height * 0.42 });
      setTimeout(() => runBurst(setRun, origin, payload.mode || 'full'), 30);
    });
    // window boyutu dynamic; yeniden bağlanma yeterlidir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, width, height]);

  // Patlama süresince içerik kaybolmasın diye 1.6s sonra temizlik garantisi.
  useEffect(() => {
    if (!run) return;
    const t = setTimeout(() => setRun((r) => (r && r.token === run.token ? null : r)), 1700);
    return () => clearTimeout(t);
  }, [run]);

  if (!run) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {run.particles.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={[
            p.circle ? styles.circle : styles.square,
            {
              position: 'absolute',
              left: run.origin.x - p.size / 2,
              top: run.origin.y - p.size / 2,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 2000,
  },
  square: {
    borderRadius: 2,
  },
  circle: {
    borderRadius: 99,
  },
});