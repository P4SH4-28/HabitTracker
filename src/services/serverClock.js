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
// Monotonik çapa: son sunucu doğrulamasındaki cihaz saati. Cihaz saati
// bu değerin GERİSİNE alındıysa saat kurcalanmış demektir (saat geri
// almak fiziksel olarak imkânsız). İleri almayı ise tazelik kontrolü
// yakalar: ödül kararları son doğrulamanın üzerinden uzun süre geçmiş
// bir saatle verilmez.
const ANCHOR_KEY = '@habit_tracker_clock_anchor';
// Saat oynatma tespiti için geriye alınma toleransı (5 dakika).
const BACKWARD_TOLERANCE_MS = 5 * 60 * 1000;

// Sunucu saati - cihaz saati farkı (milisaniye).
let offsetMs = 0;
let offsetKnown = false;
let lastSetAt = 0;
// Cihaz saati geriye alınmış mı? (açılışta çapa karşılaştırmasıyla bulunur)
let clockTampered = false;

// Kaydedilmiş son offset'i yükler (uygulama açılışında çağrılır).
// Monotonik çapayı da okur: cihaz saati geriye alındıysa offset geçersiz
// sayılır ve sıfırlanır (taze sunucu doğrulaması yeniden gerekecek).
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
  try {
    const anchorRaw = await AsyncStorage.getItem(ANCHOR_KEY);
    if (anchorRaw) {
      const anchor = JSON.parse(anchorRaw);
      if (anchor && typeof anchor.deviceNow === 'number') {
        if (Date.now() < anchor.deviceNow - BACKWARD_TOLERANCE_MS) {
          // Cihaz saati geriye alınmış: eski offset geçersiz.
          clockTampered = true;
          offsetKnown = false;
          offsetMs = 0;
          lastSetAt = 0;
          AsyncStorage.removeItem(OFFSET_KEY).catch(() => {});
        }
      }
    }
  } catch (e) {
    // Çapa okunamadı: sorun değil, mevcut durum korunur.
  }
}

// Yeni ölçülen offset'i kaydeder. Cihaz saati son ölçümden bu yana
// belirgin şekilde değiştiyse "changed: true" döner (senkron yapıldığı
// anda tazelendiği için tavan mantığı yine de güvenlidir).
// Ayrıca monotonik çapayı günceller: her sunucu doğrulamasında cihaz
// saatinin o anki değeri saklanır; bir sonraki açılışta geriye alınma
// tespit edilir.
export function setServerOffset(serverTimeMs) {
  const now = Date.now();
  const newOffset = serverTimeMs - now;
  const changed = offsetKnown && Math.abs(newOffset - offsetMs) > 5 * 60 * 1000;
  offsetMs = newOffset;
  offsetKnown = true;
  lastSetAt = now;
  clockTampered = false; // taze doğrulama kurcalama durumunu temizler
  AsyncStorage.setItem(OFFSET_KEY, JSON.stringify({ offsetMs, at: now })).catch(() => {});
  AsyncStorage.setItem(
    ANCHOR_KEY,
    JSON.stringify({ deviceNow: now, serverNow: serverTimeMs, at: now })
  ).catch(() => {});
  return changed;
}

// Offset biliniyor mu? (ilk senkrona kadar false olabilir)
export function isServerClockKnown() {
  return offsetKnown;
}

// Ödül kararları için izin verilen en eski doğrulama yaşı.
// Bundan eski bir offsetle (örn. uygulama çevrimdışı açıldı ve hiç
// sunucu yanıtı gelmedi) ekonomi kararları verilmez — çünkü cihaz saati
// ileri alındıysa eski offset "geleceği" gösterir (farm penceresi).
export const CLOCK_FRESH_WINDOW_MS = 10 * 60 * 1000; // 10 dakika

// Sunucu saati GÜVENİLİR derecede taze mi? (son doğrulama ~10 dk içinde)
export function isClockFresh(windowMs = CLOCK_FRESH_WINDOW_MS) {
  return offsetKnown && Date.now() - lastSetAt <= windowMs;
}

// Cihaz saati geriye alınmış mı? (açılışta tespit edilir; taze doğrulama temizler)
export function isClockTampered() {
  return clockTampered;
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
