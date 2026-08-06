// ============================================================
// WeekChart — Son 7 günün tamamlama oranını gösteren çubuk grafik
// Veriyi kendisi hesaplamaz; ProgressScreen'in useMemo ile ürettiği
// merkezi "daily" dizisinden son 7 günü alır (tek hesaplama, çift çalışma yok).
// ============================================================
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dayNameShort } from '../logic';
import { useTheme } from '../theme';

export default function WeekChart({ daily, today, total }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const days = daily.slice(-7);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Haftalık Tamamlama</Text>
      <View style={styles.chart}>
        {days.map(({ key, date, done, pct }) => {
          const isToday = key === today;
          return (
            <View key={key} style={styles.column}>
              {/* Günlük tamamlanan/toplam sayısı */}
              <Text style={[styles.value, isToday && styles.valueToday]}>
                {done}/{total || 0}
              </Text>
              {/* Çubuk yüksekliği tamamlama oranıyla orantılı */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(6, pct * 100)}%`,
                      backgroundColor: isToday ? C.primary : C.accent,
                    },
                  ]}
                />
              </View>
              {/* Gün adı (bugün vurgulu) */}
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {dayNameShort(date)}
              </Text>
            </View>
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
    title: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    chart: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 160,
    },
    column: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      height: '100%',
      justifyContent: 'flex-end',
    },
    value: {
      color: C.textMuted,
      fontSize: 10,
      fontWeight: '600',
    },
    valueToday: {
      color: C.primary,
    },
    barTrack: {
      width: 14,
      height: 90,
      borderRadius: 7,
      backgroundColor: C.surfaceLight,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: 7,
    },
    dayLabel: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    dayLabelToday: {
      color: C.primary,
      fontWeight: '800',
    },
  });
}
