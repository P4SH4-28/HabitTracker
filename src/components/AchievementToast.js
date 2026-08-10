// ============================================================
// AchievementToast — Ekranın üstünden kayan bildirim (toast)
// Başarım açıldığında ve pomodoro bittiğinde kısa bir bilgi gösterir.
// Kuyruk mantığı: birden fazla bildirim aynı anda geldiyse tek tek
// gösterilir (her biri 4 saniye ekranda kalır, sonra otomatik kapanır).
// ============================================================
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';

export default function AchievementToast() {
  const { toasts, dismissToast } = useData();
  const toast = toasts[0];
  // Çentik/status bar altında görünür (üstten gelen bildirim kameraya takılmaz).
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;

  // Yukarıdan kayarak gelme animasyonu.
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!toast) return;
    // Yeni bildirim geldiğinde animasyonu baştan başlat.
    translateY.setValue(-120);
    Animated.spring(translateY, {
      toValue: 0,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();
    // 4 saniye sonra otomatik kapat (kuyruktaki sonraki bildirim gelir).
    const timer = setTimeout(() => dismissToast(toast.key), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);

  if (!toast) return null;

  return (
    <View style={[styles.wrap, { paddingTop: topPad }]} pointerEvents="box-none">
      <Pressable
        onPress={() => dismissToast(toast.key)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Animated.View
          style={[styles.toast, { backgroundColor: toast.color, transform: [{ translateY }] }]}
        >
          <Text style={styles.icon}>{toast.icon}</Text>
          <Text style={styles.text} numberOfLines={2}>
            {toast.title}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: 480,
  },
  icon: {
    fontSize: 22,
  },
  text: {
    color: '#0B0E14',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
