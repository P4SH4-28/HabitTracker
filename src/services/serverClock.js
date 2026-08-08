// ============================================================
// serverClock.js — Sunucu saatine bağlanma (zaman farm'ı koruması)
// Kullanıcı cihaz saatiyle oynayıp "yeni gün" açarak günlük tavanları
// aşamasın diye tüm ekonomi kararları SUNUCU saatine dayanır.
// - Her Supabase yanıtı HTTP "Date" başlığı içerir (sunucu saati).
// - wrapFetch: createClient'a verilen özel fetch ile her yanıttan
//   bu başlık okunur ve "offset = sunucuSaati - cihazSaati" hesaplanır.
// - serverNow(): ekonomi kararlarında kullanılacak güvenilir "şimdi".
// - Offset AsyncStorage'a yazılır; uygulama kapansa da korunur.
// - Sunucuya ulaşılamıyorsa (çevrimdışı) son bilinen offset kullanılır.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFSET_KEY = '@habit_tracker_server_clock_offset';

// Sunucu saati - cihaz saati farkı (milisaniye).
let offsetMs = 0;
let offsetKnown = false;
let lastSetAt = 0;

// Kaydedilmiş son offset'i yükler (uygulama açılışında çağrılır).
export async function loadServerClock() {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.offsetMs === 'number' && Number.isFinite(parsed.offsetMs)) {
        offsetMs = parsed.offsetMs;
        offsetKnown = true;
        lastSetAt = parsed.at || 0;
      }
    }
  } catch (e) {
    // Depolama hatası: sessizce sıfırla, sunucu saatinden yeniden öğrenilir.
  }
}

// Yeni ölçülen offset'i kaydeder. Cihaz saati son ölçümden bu yana
// belirgin şekilde değiştiyse "changed: true" döner (senkron yapıldığı
// anda tazelendiği için tavan mantığı yine de güvenlidir).
export function setServerOffset(serverTimeMs) {
  const now = Date.now();
  const newOffset = serverTimeMs - now;
  const changed = offsetKnown && Math.abs(newOffset - offsetMs) > 5 * 60 * 1000;
  offsetMs = newOffset;
  offsetKnown = true;
  lastSetAt = now;
  AsyncStorage.setItem(OFFSET_KEY, JSON.stringify({ offsetMs, at: now })).catch(() => {});
  return changed;
}

// Offset biliniyor mu? (ilk senkrona kadar false olabilir)
export function isServerClockKnown() {
  return offsetKnown;
}

// Güvenilir "şimdi" (ms). Çevrimdışıyken son bilinen offset kullanılır.
export function serverNow() {
  return Date.now() + offsetMs;
}

// Güvenilir "şimdi" üzerinden gün anahtarı (opsiyonel gün kayması).
// TEST amaçlı devOffset burada uygulanır.
export function serverTodayKey(offsetDays = 0) {
  const d = new Date(serverNow());
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Supabase istemcisine verilecek fetch sarmalayıcısı: yanıtların
// "Date" başlığından sunucu saatini okur ve offset'i günceller.
// Ağ hataları vb. durumlarda isteği etkilemez (sadece dinler).
export function wrapFetch(innerFetch) {
  return async (...args) => {
    const res = await innerFetch(...args);
    try {
      const dateHeader = res && res.headers && res.headers.get
        ? res.headers.get('date')
        : null;
      if (dateHeader) {
        const serverTime = Date.parse(dateHeader);
        if (!Number.isNaN(serverTime)) {
          setServerOffset(serverTime);
        }
      }
    } catch (e) {
      // Başlık okunamadı: sorun değil, mevcut offset korunur.
    }
    return res;
  };
}
