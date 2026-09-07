// ============================================================
// Heatmap — Son 5 haftanın tamamlama yoğunluğu (GitHub tarzı ısı haritası)
// Her hücre bir günü temsil eder; renk koyulaştıkça o gün tamamlanan
// alışkanlık oranı artar. Veri: ProgressScreen'in merkezi "daily" dizisi.
// GUI modernizasyonu (Faz C): veri değişince hücreler soldan sağa
// kademeli (cascade) belirir; bugün hücresi nabız atar.
// ============================================================
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

// Hex renk kodunu ("#22D3A5") istenen şeffaflıkta rgba'ya çevirir.
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function Heatmap({ daily }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  // Son 35 günü al (5 hafta).
  const cells = daily.slice(-35);

  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Veri değişince hücreler kademeli belirir.
  useEffect(() => {
    reveal.setValue(0);
    const a = Animated.timing(reveal, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [reveal, daily]);

  // Bugün hücresi için sürekli nabız animasyonu.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const todayIndex = cells.length - 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Son 5 Hafta</Text>
        {/* Açıklama: açık renk az tamamlama, koyu renk çok tamamlama */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>Az</Text>
          {[0, 0.33, 0.66, 1].map((p) => (
            <View
              key={p}
              style={[styles.legendCell, { backgroundColor: hexToRgba(C.accent, 0.2 + p * 0.8) }]}
            />
          ))}
          <Text style={styles.legendText}>Çok</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {cells.map(({ key, done, pct }, i) => {
          const isToday = i === todayIndex;
          const band = i / cells.length;
          const opacity = reveal.interpolate({
            inputRange: [Math.max(0, band - 0.12), band + 0.08],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={key}
              style={[
                styles.cell,
                {
                  opacity,
                  transform: [
                    {
                      scale: reveal.interpolate({
                        inputRange: [Math.max(0, band - 0.12), band + 0.08],
                        outputRange: [0.5, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                  backgroundColor:
                    done > 0 ? hexToRgba(C.accent, 0.25 + pct * 0.75) : C.surfaceLight,
                },
                isToday && done > 0 && {
                  transform: [
                    {
                      scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }),
                    },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      gap: 14,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendText: {
      color: C.textMuted,
      fontSize: 10,
    },
    legendCell: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    // flexBasis %12.5 + flexGrow: satırda 7 hücre eşit dağılır (35 hücre = 5 satır)
    cell: {
      flexBasis: '12.5%',
      flexGrow: 1,
      aspectRatio: 1,
      borderRadius: 4,
    },
  });
}