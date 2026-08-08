// ============================================================
// syncService.js — Bulut bağlantı ve senkronizasyon servisi
// Supabase istemcisi üzerinden hafif bir sorguyla (profiles
// tablosundan tek kayıt isteği) bulut veritabanına erişilip
// erişilemediğini boolean olarak döndürür. Ağ hatası, zaman
// aşımı veya veritabanı erişim sorunlarında asla çökmez;
// her durumda güvenli bir sonuç döner.
// ============================================================
import { supabase } from '../config/supabase';

const REQUEST_TIMEOUT_MS = 10000;

// Bulut bağlantısını doğrular. Bağlantı başarılı ise true,
// herhangi bir hata durumunda false döner.
export async function checkServerConnection() {
  try {
    const result = await Promise.race([
      supabase.from('profiles').select('id').limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('connection_timeout')), REQUEST_TIMEOUT_MS)
      ),
    ]);
    return !result.error;
  } catch (error) {
    return false;
  }
}
