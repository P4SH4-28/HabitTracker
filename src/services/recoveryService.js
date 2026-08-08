// ============================================================
// recoveryService.js — kurtarma anahtarı servisi (hesap kurtarma)
// "recovery-action" edge function'ına bağlanır:
// - setRecoveryKey: kurtarma anahtarının hash'ini sunucuya yazar
//   (kayıtta üretilen anahtar; hash dışarı ASLA çıkmaz).
// - verifyRecoveryKey: kurtarma anahtarını sunucuda doğrular
//   (şifre sıfırlama akışının ilk adımı).
// İstemci anahtarı recovery_hash sütununu hiçbir zaman OKUYAMAZ;
// doğrulama her zaman sunucuda yapılır.
// ============================================================
import { SUPABASE_URL } from '../config/supabase';

const FN_URL = `${SUPABASE_URL}/functions/v1/recovery-action`;
const TIMEOUT_MS = 10000;

async function callRecovery(body) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // JSON olmayan yanıt — aşağıda genel hata döndürülür.
    }
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Kurtarma hatası (${res.status})`,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: 'Sunucuya ulaşılamadı (çevrimdışı mısın?)' };
  }
}

// Kurtarma anahtarını sunucuya kaydeder (yeni anahtar veya anahtar değişimi).
// - İlk kayıt: profilde anahtar yoksa oldHash gerekmez.
// - Anahtar değişimi: eski anahtarın hash'i (oldHash) zorunludur.
export async function setRecoveryKey(username, recoveryHash, oldHash = '') {
  return callRecovery({ action: 'set', username, recoveryHash, oldHash });
}

// Kurtarma anahtarını sunucuda doğrular. Başarılıysa { ok: true }.
export async function verifyRecoveryKey(username, recoveryHash) {
  return callRecovery({ action: 'verify', username, recoveryHash });
}
