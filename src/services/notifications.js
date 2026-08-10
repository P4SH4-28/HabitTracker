// ============================================================
// notifications.js — yerel OS bildirimleri (expo-notifications)
// Uygulama KAPALIYKEN de çalışan bildirimleri planlar.
// İki ayrı plan yönetilir (birbirini EZMEZ):
//   1) Günlük hatırlatma   → ayarlanan saatte HER GÜN (DAILY trigger)
//   2) Saatlik motivasyon  → her 1 saatte bir (INTERVAL trigger).
//      Metin, planlandığı andaki görev durumuna göre seçilir:
//      - bekleyen görev varsa: "Bekleyen görevlerin var!"
//      - yoksa: "İlerlemeni sürdür!"
//      Uygulama her açıldığında yeniden planlanır → metin güncel kalır.
// Planlanan bildirim id'leri AsyncStorage'da tutulur; böylece bir planı
// iptal etmek diğerini bozmaz.
// - initNotifications: ön plandayken bildirimin görünmesini sağlar
//   + Android bildirim kanallarını oluşturur (Android 13+ izin istemi
//   kanal olmadan gösterilmez).
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const REMINDER_CHANNEL_ID = 'daily-reminder';
const MOTIVATION_CHANNEL_ID = 'hourly-motivation';
const IDS_STORAGE_KEY = '@habit_notif_ids';
const REMINDER_TITLE = '⏰ Habit Tracker';
const REMINDER_BODY = 'Bugünkü alışkanlıklarını işaretlemeyi unutma!';

// Planlanan bildirim id'leri: { reminder: string|null, hourly: string|null }.
async function loadIds() {
  try {
    const raw = await AsyncStorage.getItem(IDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { reminder: null, hourly: null };
  } catch (e) {
    return { reminder: null, hourly: null };
  }
}
async function saveIds(ids) {
  try {
    await AsyncStorage.setItem(IDS_STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn("Bildirim id'leri yazılamadı:", e);
  }
}

// Uygulama açıkken bildirim geldiğinde ekran üstünden gösterilir.
// (Bu ayar yapılmazsa ön plandayken bildirimler görünmez.)
export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Android bildirim kanallarını oluşturur (Android 8+ zorunlu).
async function ensureChannels() {
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Günlük hatırlatma',
      description: 'Alışkanlıklarını hatırlatan günlük bildirim',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(MOTIVATION_CHANNEL_ID, {
      name: 'Saatlik motivasyon',
      description: 'Görev durumuna göre her saat gönderilen motivasyon bildirimi',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
    });
  } catch (e) {
    console.warn('Bildirim kanalları oluşturulamadı:', e);
  }
}

// Bildirim iznini ister; kullanıcı kabul ederse true döner.
export async function ensureNotificationPermission() {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch (e) {
    console.warn('Bildirim izni alınamadı:', e);
    return false;
  }
}

// Saat verildiğinde (0-23) her gün tekrarlayan hatırlatmayı planlar.
// Önce ESKİ hatırlatma iptal edilir (saatlik plan bozulmaz) → saat
// değişince yığın oluşmaz.
export async function scheduleDailyReminder(hour) {
  try {
    await ensureChannels();
    const ids = await loadIds();
    if (ids.reminder) {
      await Notifications.cancelScheduledNotificationAsync(ids.reminder).catch(() => {});
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        sound: 'default',
        data: { type: 'habit-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.min(23, Math.max(0, hour)),
        minute: 0,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
    await saveIds({ ...ids, reminder: id });
    return { ok: true, id };
  } catch (e) {
    console.warn('Hatırlatma planlanamadı:', e);
    return { ok: false, error: 'Hatırlatma planlanamadı' };
  }
}

// Günlük hatırlatmayı iptal eder (saatlik plan bozulmaz).
export async function cancelDailyReminder() {
  try {
    const ids = await loadIds();
    if (ids.reminder) {
      await Notifications.cancelScheduledNotificationAsync(ids.reminder).catch(() => {});
      await saveIds({ ...ids, reminder: null });
    }
    return { ok: true };
  } catch (e) {
    console.warn('Hatırlatma iptal edilemedi:', e);
    return { ok: false, error: 'Hatırlatma iptal edilemedi' };
  }
}

// Saatlik motivasyon bildirimi planlar (her 1 saatte bir tekrarlar).
// "pending" true ise bekleyen görev mesajı, değilse sürdürme mesajı.
// Her çağrıda eski saatlik plan iptal edilir → metin güncel kalır.
export async function scheduleHourlyMotivation(pending) {
  try {
    await ensureChannels();
    const ids = await loadIds();
    if (ids.hourly) {
      await Notifications.cancelScheduledNotificationAsync(ids.hourly).catch(() => {});
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: pending ? 'Bekleyen görevlerin var!' : 'İlerlemeni sürdür!',
        body: pending
          ? 'Hemen göz at ve günlük ödüllerini kaçırma 🎯'
          : 'Yeni bir alışkanlık kazan veya odak seansı başlat 🔥',
        sound: 'default',
        data: { type: 'hourly-motivation', pending },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60,
        repeats: true,
        channelId: MOTIVATION_CHANNEL_ID,
      },
    });
    await saveIds({ ...ids, hourly: id });
    return { ok: true, id };
  } catch (e) {
    console.warn('Saatlik motivasyon planlanamadı:', e);
    return { ok: false, error: 'Saatlik motivasyon planlanamadı' };
  }
}

// Saatlik motivasyon planını iptal eder (günlük hatırlatma bozulmaz).
export async function cancelHourlyMotivation() {
  try {
    const ids = await loadIds();
    if (ids.hourly) {
      await Notifications.cancelScheduledNotificationAsync(ids.hourly).catch(() => {});
      await saveIds({ ...ids, hourly: null });
    }
    return { ok: true };
  } catch (e) {
    console.warn('Saatlik motivasyon iptal edilemedi:', e);
    return { ok: false, error: 'Saatlik motivasyon iptal edilemedi' };
  }
}
