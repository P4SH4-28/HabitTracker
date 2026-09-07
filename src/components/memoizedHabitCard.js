// ============================================================
// memoizedHabitCard — React.memo ile Wrapper
// Ana HomeScreen FlatList tarafından kullanılır.
// ============================================================
import React, { useEffect, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { calcStreak } from '../logic';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';

// React.memo ile memoized component - ekranda değişmeyen props
// ile aynı referans verildiği taktirde yeniden render edilmez.
const HabitCard = React.memo(function HabitCard({ habit, today, onToggle, onDelete }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  // DataContext'ten directly erişim (hook her render'de yeni ref döndürür ama
  // memo kapsamı için yeterli - gerçek veri değişikliği ile birlikte güncellenir).
  const freezeDay = useData().data.activeEffects?.streakFreeze || null;
  const completedToday = habit.completedDates.includes(today);
  const frozen = !!freezeDay && !completedToday;
  const streak = calcStreak(habit.completedDates, today, freezeDay);

  // Tamamlama animasyonu: "tamamlanmadı → tamamlandı" geçişinde
  // ✓ dairesi spring ile "bonk" yapar ve çevresinde renkli glow parlar.
  const prevDoneRef = useRef(completedToday);
  const checkScale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (completedToday && !prevDoneRef.current) {
      checkScale.setValue(0.4);
      glow.setValue(0);
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 130,
          useNativeDriver: true,
        }),
        Animated.timing(glow, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
      // Cihazda olumlu haptik bildirimi (web'de etkisiz).
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    prevDoneRef.current = completedToday;
  }, [completedToday, checkScale, glow]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
      onLongPress={() =>
        // Silme onayı: Mobilde Alert, web'de confirm.
        onDelete(habit.id)
      }
    >
      {/* Alışkanlığın rengiyle boyanmış emoji rozeti */}
      <View style={[styles.emojiBox, { backgroundColor: habit.color + '22' }]}>
        <Text style={styles.emoji}>{habit.emoji || '✅'}</Text>
      </View>

      {/* Tamamlama butonu: dolu daire = bugün tamamlandı */}
      <Pressable style={styles.checkbox} onPress={() => onToggle(habit.id)} hitSlop={8}>
        <View>
          {/* Tamamlanma anında kısa parlayan halka */}
          {completedToday ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.checkGlow,
                {
                  backgroundColor: habit.color,
                  borderColor: habit.color,
                  opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [
                    {
                      scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
          {completedToday ? (
            <Animated.View
              style={[
                styles.checkCircle,
                { backgroundColor: habit.color, transform: [{ scale: checkScale }] },
              ]}
            >
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
          ) : (
            <View style={[styles.checkCircle, styles.checkCircleEmpty]} />
          )}
        </View>
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
});

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
  checkGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
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
export default HabitCard;