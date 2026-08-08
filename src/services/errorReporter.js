// ============================================================
// errorReporter.js — Sessiz çökmeleri yakalayan global yakalayıcı
// Release build'lerde yakalanmayan bir JS hatası uygulamayı SESSİZCE
// kapatır (kullanıcı "çöktü" der ama neden belli olmaz). Bu modül:
//  1) ErrorUtils.setGlobalHandler ile yakalanmayan hataları yakalar.
//  2) "unhandledrejection" olayıyla karşılanmayan promise hatalarını alır.
//  3) Yakalanan hatayı AsyncStorage'a yazar (uygulama kapansa da kalır).
//  4) App.js tarafından kaydedilen bir handler'a iletir; o da hatayı
//     ekranda tam metinle gösterir (FatalErrorView).
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ERROR_KEY = '@habit_tracker_last_error';

// Ekran overlay'i gösterecek dinleyici (App.js kaydeder).
let handler = null;

export function setErrorHandler(fn) {
  handler = fn;
}

// Hata nesnesini saklanabilir/gösterilebilir forma çevirir.
function normalizeError(error) {
  if (error && typeof error === 'object') {
    return {
      message: typeof error.message === 'string' && error.message ? error.message : 'Bilinmeyen hata',
      stack: typeof error.stack === 'string' ? error.stack : '',
    };
  }
  return { message: String(error || 'Bilinmeyen hata'), stack: '' };
}

function report(source, error) {
  const record = { ...normalizeError(error), source, ts: Date.now() };
  if (handler) {
    try {
      handler(record);
    } catch (e) {
      // Overlay handler'ı hata yutarsa sessizce devam edilir.
    }
  }
  // Kayıt dosyaya yazılır: uygulama o an kapansa bile son hata saklanır.
  AsyncStorage.setItem(LAST_ERROR_KEY, JSON.stringify(record)).catch(() => {});
  if (__DEV__) {
    console.error(`[${source}]`, record.message, record.stack);
  }
}

let installed = false;

// Global dinleyicileri kurar (App.js import zamanında çağrılır; bir kez).
export function initErrorReporter() {
  if (installed) return;
  installed = true;
  try {
    if (global.ErrorUtils && typeof global.ErrorUtils.setGlobalHandler === 'function') {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        report(isFatal ? 'fatal' : 'error', error);
      });
    }
  } catch (e) {
    // ErrorUtils yoksa (çok nadir) sorun değil; diğer dinleyiciler durur.
  }
  try {
    if (global.addEventListener && typeof global.addEventListener === 'function') {
      global.addEventListener('unhandledrejection', (event) => {
        const reason = event && event.reason;
        report('unhandledrejection', reason || 'Karşılanmayan promise hatası');
      });
    }
  } catch (e) {
    // Olay sistemi yoksa sorun değil.
  }
}

// Kaydedilmiş son hatayı okur (uygulama açılışında göstermek için).
export async function readLastError() {
  try {
    const raw = await AsyncStorage.getItem(LAST_ERROR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Kayıtlı hatayı temizler.
export async function clearLastError() {
  try {
    await AsyncStorage.removeItem(LAST_ERROR_KEY);
  } catch (e) {
    // Temizlenemedi: sorun değil.
  }
}
