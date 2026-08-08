// ============================================================
// notifications.js — yerel OS bildirimleri (expo-notifications)
// Uygulama KAPALIYKEN de çalışan günlük hatırlatma planlar.
// - initNotifications: ön plandayken bildirimin görünmesini sağlar
//   + Android bildirim kanalını oluşturur (Android 13+ izin istemi
//   kanal olmadan gösterilmez).
// - scheduleDailyReminder: ayarlanan saatte HER GÜN tekrarlayan
//   bildirim planlar (SchedulableTriggerInputTypes.DAILY).
// - cancelDailyReminder: planlanan tüm bildirimleri iptal eder.
// ============================================================
import * as Notifications from 'expo-notifications';

const REMINDER_CHANNEL_ID = 'daily-reminder';
const REMINDER_TITLE = '⏰ Habit Tracker';
const REMINDER_BODY = 'Bugünkü alışkanlıklarını işaretlemeyi unutma!';

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

// Android bildirim kanalını oluşturur (Android 8+ zorunlu).
async function ensureChannel() {
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Günlük hatırlatma',
      description: 'Alışkanlıklarını hatırlatan günlük bildirim',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (e) {
    console.warn('Bildirim kanalı oluşturulamadı:', e);
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
// Önce eski plan iptal edilir → saat değişince yığın oluşmaz.
export async function scheduleDailyReminder(hour) {
  try {
    await ensureChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();
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
    return { ok: true, id };
  } catch (e) {
    console.warn('Hatırlatma planlanamadı:', e);
    return { ok: false, error: 'Hatırlatma planlanamadı' };
  }
}

// Planlanan tüm bildirimleri iptal eder (hatırlatma kapatılınca).
export async function cancelDailyReminder() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return { ok: true };
  } catch (e) {
    console.warn('Hatırlatma iptal edilemedi:', e);
    return { ok: false, error: 'Hatırlatma iptal edilemedi' };
  }
}
