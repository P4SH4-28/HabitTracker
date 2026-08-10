// Android widget köprüsü.
// - Uygulama açıkken veri değişince "anlık görüntü" (snapshot) AsyncStorage'a
//   yazılır ve requestWidgetUpdate ile widget yeniden çizilir.
// - Widget sistemi tarafından tetiklenen güncellemelerde (ekleme, periyodik
//   yenileme) widgetTaskHandler aynı snapshot'ı AsyncStorage'dan okur.
// - Web/iOS ve Expo Go'da bu modül sessizce hiçbir şey yapmaz.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { calcStreak } from '../logic';
import { HabitWidget } from '../widgets/HabitWidget';

export const WIDGET_NAME = 'HabitTracker';
export const WIDGET_DATA_KEY = 'habittracker:widgetSnapshot';

export function buildWidgetSnapshot(data, today) {
  const freezeDay = data?.activeEffects?.streakFreeze || null;
  const habits = (data?.habits || []).map((h) => ({
    name: h.name,
    emoji: h.emoji || '✅',
    done: (h.completedDates || []).includes(today),
    streak: calcStreak(h.completedDates || [], today, freezeDay),
  }));
  return {
    today,
    habits,
    totalDone: habits.filter((h) => h.done).length,
    total: habits.length,
    gold: data?.stats?.gold || 0,
    frozen: freezeDay === today,
  };
}

export async function saveWidgetSnapshot(data, today) {
  const snapshot = buildWidgetSnapshot(data, today);
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('Widget anlık görüntüsü yazılamadı:', e);
  }
  return snapshot;
}

export async function loadWidgetSnapshot() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Widget anlık görüntüsü okunamadı:', e);
    return null;
  }
}

// Veri değişince çağrılır: snapshot'ı kaydeder ve (Android'de) widget'ı
// günceller. Widget ana ekrana eklenmemişse sessizce bırakır.
export async function refreshAndroidWidget(data, today) {
  if (Platform.OS !== 'android') return;
  const snapshot = await saveWidgetSnapshot(data, today);
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => ({
        light: <HabitWidget snapshot={snapshot} />,
        dark: <HabitWidget snapshot={snapshot} />,
      }),
    });
  } catch (e) {
    // Widget ekli değil veya native modül yok — sorun değil.
  }
}
