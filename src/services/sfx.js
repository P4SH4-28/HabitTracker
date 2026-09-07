// ============================================================
// sfx.js — Dokunsal + işlemsel geri bildirim yardımcıları.
// Web'de haptik yoktur; tüm çağrılar sessizce çökmeden tamamlanır.
// Faz A (GUI modernizasyonu): buton basınçlarında ufak "tap" haptiği
// vererek uygulamayı daha canlı/konforlu hissettirir.
// ============================================================
import * as Haptics from 'expo-haptics';

// Basınç/hafif dokunuş geri bildirimi (küçük butonlar, çipler).
export function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Orta yoğunlukta geri bildirim (ana işlem butonları).
export function tapMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

// Başarı geri bildirimi (ödül, satın alma, tamamlama).
export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// Hata/uylaşma geri bildirimi (hata, kısıtlama).
export function warn() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
