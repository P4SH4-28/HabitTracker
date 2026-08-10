// ============================================================
// HabitCard — Tek bir alışkanlığı gösteren kart bileşeni
// - Solda: alışkanlığın emoji rozeti
// - Ortada: adı + bugünkü durumu
// - Sağda: 🔥 seri sayacı
// - Dokununca: tamamla/geri al | Uzun basınca: silme onayı
// "today" bir prop olarak dışarıdan gelir; böylece gece yarısı
// gün değişince kart otomatik yeni güne göre çizilir.
// ============================================================
import { useMemo } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { calcStreak } from '../logic';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';

// Silme onayı: mobilde doğal Alert, web'de tarayıcının confirm kutusu kullanılır.
export function confirmDialog(title, message, onOk) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onOk();
  } else {
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: onOk },
    ]);
  }
}

export default function HabitCard({ habit, today, onToggle, onDelete }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  // Seri Dondurucu aktifken bugünün serisi korunur (kartta ❄️ ile gösterilir).
  const freezeDay = useData().data.activeEffects?.streakFreeze || null;
  const completedToday = habit.completedDates.includes(today);
  const frozen = !!freezeDay && !completedToday;
  const streak = calcStreak(habit.completedDates, today, freezeDay);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
      onLongPress={() =>
        confirmDialog('Alışkanlığı sil', `"${habit.name}" silinecek. Emin misin?`, () =>
          onDelete(habit.id)
        )
      }
    >
      {/* Alışkanlığın rengiyle boyanmış emoji rozeti */}
      <View style={[styles.emojiBox, { backgroundColor: habit.color + '22' }]}>
        <Text style={styles.emoji}>{habit.emoji || '✅'}</Text>
      </View>

      {/* Tamamlama butonu: dolu daire = bugün tamamlandı */}
      <Pressable style={styles.checkbox} onPress={() => onToggle(habit.id)} hitSlop={8}>
        {completedToday ? (
          <View style={[styles.checkCircle, { backgroundColor: habit.color }]}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        ) : (
          <View style={[styles.checkCircle, styles.checkCircleEmpty]} />
        )}
      </Pressable>

      {/* Alışkanlık adı ve bugünkü durumu */}
      <View style={styles.info}>
        <Text style={[styles.name, completedToday && styles.nameDone]} numberOfLines={1}>
          {habit.name}
        </Text>
        <Text style={styles.meta}>
          {completedToday ? 'Bugün tamamlandı' : 'Bugün henüz yapılmadı'}
        </Text>
      </View>

      {/* 🔥 Seri sayacı (dondurulmuşsa ❄️) */}
      <View style={[styles.streakBadge, { borderColor: habit.color }]}>
        <Text style={styles.streakIcon}>{frozen ? '❄️' : '🔥'}</Text>
        <Text style={styles.streakText}>{streak}</Text>
      </View>
    </Pressable>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  emojiBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  checkbox: {
    width: 34,
    alignItems: 'center',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleEmpty: {
    borderWidth: 2,
    borderColor: C.textMuted,
    backgroundColor: 'transparent',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  nameDone: {
    textDecorationLine: 'line-through',
    color: C.textMuted,
  },
  meta: {
    color: C.textMuted,
    fontSize: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
  },
  streakIcon: {
    fontSize: 13,
  },
  streakText: {
    color: C.text,
    fontSize: 13,
    fontWeight: '800',
  },
});
}
