// ============================================================
// WeeklyCompare — "Bu Hafta vs Geçen Hafta" karşılaştırma kartı
// weekly: { currentWeek, lastWeek, diff, trend } (logic.js'teki weeklyComparison)
// Trend oku ▲ / ▼ / ■ ile artış, düşüş veya aynı kaldığını gösterir.
// ============================================================
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export default function WeeklyCompare({ weekly }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  // Trend bilgisi temaya bağlı renkler kullandığı için bileşen içinde üretilir.
  const trend = (
    weekly.trend === 'up'
      ? { arrow: '▲', color: C.accent, text: 'Geçen haftadan daha iyi' }
      : weekly.trend === 'down'
        ? { arrow: '▼', color: C.danger, text: 'Geçen haftanın gerisinde' }
        : { arrow: '■', color: C.textMuted, text: 'Geçen haftayla aynı' }
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Haftalık Karşılaştırma</Text>
      <View style={styles.columns}>
        {/* Geçen hafta (7-14 gün önce) */}
        <View style={styles.column}>
          <Text style={styles.columnLabel}>Geçen Hafta</Text>
          <Text style={styles.columnValue}>{weekly.lastWeek}</Text>
          <Text style={styles.columnHint}>tamamlama</Text>
        </View>
        {/* Bu hafta (son 7 gün) */}
        <View style={[styles.column, styles.columnHighlight]}>
          <Text style={[styles.columnLabel, styles.labelHighlight]}>Bu Hafta</Text>
          <Text style={[styles.columnValue, styles.valueHighlight]}>
            {weekly.currentWeek}
          </Text>
          <Text style={styles.columnHint}>tamamlama</Text>
        </View>
      </View>
      {/* Trend satırı: ok + fark + açıklama */}
      <View style={styles.trendRow}>
        <Text style={[styles.arrow, { color: trend.color }]}>{trend.arrow}</Text>
        <Text style={[styles.trendText, { color: trend.color }]}>
          {weekly.diff > 0 ? `+${weekly.diff}` : weekly.diff} tamamlama
        </Text>
        <Text style={styles.trendHint}>{trend.text}</Text>
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
    title: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    columns: {
      flexDirection: 'row',
      gap: 10,
    },
    column: {
      flex: 1,
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      gap: 4,
    },
    columnHighlight: {
      borderWidth: 1,
      borderColor: C.primary,
    },
    columnLabel: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    labelHighlight: {
      color: C.primary,
    },
    columnValue: {
      color: C.text,
      fontSize: 26,
      fontWeight: '800',
    },
    valueHighlight: {
      color: C.primary,
    },
    columnHint: {
      color: C.textMuted,
      fontSize: 11,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    arrow: {
      fontSize: 14,
      fontWeight: '900',
    },
    trendText: {
      fontSize: 13,
      fontWeight: '800',
    },
    trendHint: {
      color: C.textMuted,
      fontSize: 12,
      flex: 1,
      textAlign: 'right',
    },
  });
}
