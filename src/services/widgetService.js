// ============================================================
// widgetService — Android widget köprüsü + veri paylaşım katmanı
// - Uygulama açıkken veri değişince "anlık görüntü" (snapshot)
//   AsyncStorage'a yazılır ve tüm widget'lar requestWidgetUpdate
//   ile yeniden çizilir.
// - Widget sisteminden gelen güncellemelerde (ekleme, periyodik
//   yenileme) widgetTaskHandler aynı snapshot'ı okur.
// - Widget tıklamaları: OPEN_APP/OPEN_URI native'de işlenir,
//   TASK_DONE:<id> görevi arka planda (pending kuyruk) tamamlar.
// - Web/iOS ve Expo Go'da bu modül sessizce hiçbir şey yapmaz.
// ============================================================
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { calcStreak } from '../logic';
import { getDailyQuests, questClaimedToday } from '../data/quests';
import { StreakWidget } from '../widgets/StreakWidget';
import { PomodoroWidget } from '../widgets/PomodoroWidget';
import { QuickTaskWidget } from '../widgets/QuickTaskWidget';
import { DuelWidget } from '../widgets/DuelWidget';

export const WIDGET_NAMES = ['StreakWidget', 'PomodoroWidget', 'QuickTaskWidget', 'DuelWidget'];
export const WIDGET_DATA_KEY = 'habittracker:widgetSnapshot';
export const PENDING_TASKS_KEY = 'habittracker:pendingWidgetTasks';

// Günün görevlerini widget listesine çevirir (en fazla 4).
function buildTasks(data, today) {
  const quests = getDailyQuests(today);
  const list = [...quests.base, ...quests.vip].slice(0, 4);
  return list.map((q) => ({
    id: q.id,
    title: q.title || q.name || q.id,
    emoji: q.emoji || q.icon || '📋',
    done: questClaimedToday(q, data.questClaims || {}, today),
  }));
}

export function buildWidgetSnapshot(data, today) {
  const freezeDay = data?.activeEffects?.streakFreeze || null;
  const habits = data?.habits || [];
  // En uzun aktif seri (kullanıcının "seri" sayısı olarak gösterilir).
  const streak = Math.max(0, ...habits.map((h) => calcStreak(h.completedDates || [], today, freezeDay)));
  const doneToday = habits.filter((h) => (h.completedDates || []).includes(today)).length;
  const totalToday = habits.length;
  // Açık düello (aktif durumdaki ilk kayıt).
  const duels = Array.isArray(data?.duels) ? data.duels : [];
  const activeDuel = duels.find((d) => d && d.status === 'active') || duels[0] || null;
  return {
    today,
    streak: {
      streak,
      doneToday,
      totalToday,
      allDone: totalToday > 0 && doneToday >= totalToday,
    },
    tasks: buildTasks(data, today),
    duel: {
      active: !!(activeDuel && activeDuel.status !== 'finished' && activeDuel.status !== 'declined'),
      opponent: activeDuel?.opponent || null,
    },
    gold: data?.stats?.gold || 0,
    frozen: freezeDay === today,
    pomodoroRunning: data?.pomodoro?.state === 'running',
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

// Widget'lardan gelen "TASK_DONE:<id>" isteklerini kuyruğa ekler.
// Uygulama bir sonraki açılışta DataContext bu kuyruğu işleyerek
// görevi normal akışla (sunucu doğrulaması + ödül) tamamlar.
export async function enqueueWidgetTask(taskId) {
  try {
    const raw = await AsyncStorage.getItem(PENDING_TASKS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(taskId)) {
      list.push(taskId);
      await AsyncStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Widget görev kuyruğu yazılamadı:', e);
  }
}

export async function drainWidgetTasks() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function clearWidgetTasks(ids) {
  try {
    const raw = await AsyncStorage.getItem(PENDING_TASKS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const keep = list.filter((id) => !ids.includes(id));
    await AsyncStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(keep));
  } catch (e) {
    // önemli değil
  }
}

// Veri değişince çağrılır: snapshot'ı kaydeder ve (Android'de) tüm
// widget'ları günceller. Widget ekli değilse sessizce bırakır.
export async function refreshAndroidWidget(data, today) {
  if (Platform.OS !== 'android') return;
  const snapshot = await saveWidgetSnapshot(data, today);
  try {
    await requestWidgetUpdate({
      widgetName: 'StreakWidget',
      renderWidget: () => ({ light: <StreakWidget snapshot={snapshot} />, dark: <StreakWidget snapshot={snapshot} /> }),
    });
    await requestWidgetUpdate({
      widgetName: 'PomodoroWidget',
      renderWidget: () => ({ light: <PomodoroWidget snapshot={snapshot} />, dark: <PomodoroWidget snapshot={snapshot} /> }),
    });
    await requestWidgetUpdate({
      widgetName: 'QuickTaskWidget',
      renderWidget: () => ({ light: <QuickTaskWidget snapshot={snapshot} />, dark: <QuickTaskWidget snapshot={snapshot} /> }),
    });
    await requestWidgetUpdate({
      widgetName: 'DuelWidget',
      renderWidget: () => ({ light: <DuelWidget snapshot={snapshot} />, dark: <DuelWidget snapshot={snapshot} /> }),
    });
  } catch (e) {
    // Widget ekli değil veya native modül yok — sorun değil.
  }
}
