// ============================================================
// Heatmap — Son 5 haftanın tamamlama yoğunluğu (GitHub tarzı ısı haritası)
// Her hücre bir günü temsil eder; renk koyulaştıkça o gün tamamlanan
// alışkanlık oranı artar. Veri: ProgressScreen'in merkezi "daily" dizisi.
// ============================================================
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
        {cells.map(({ key, done, pct }) => (
          <View
            key={key}
            style={[
              styles.cell,
              {
                backgroundColor:
                  done > 0
                    ? hexToRgba(C.accent, 0.25 + pct * 0.75)
                    : C.surfaceLight,
              },
            ]}
          />
        ))}
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
