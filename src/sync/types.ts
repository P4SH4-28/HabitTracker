// ============================================================
// types.ts — Offline-First Sync Engine tip güvenliği
// Mutation kuyruğu, senkron durumu ve delta senkron yükleri
// için TypeScript arayüzleri. JS tarafı JSDoc referanslarıyla
// aynı tipleri kullanır (metro .ts dosyalarını derler).
// ============================================================

// Kuyruktaki her aksiyon: bağlantı yokken yerel veritabanına yazılan
// her yazma/güncelleme/silme işlemi bu yapıda sıraya alınır.
export type QueueAction = 'CREATE' | 'UPDATE' | 'DELETE';

// Sunucu tablo adları. 'profiles' ana tablodur; 'habits' ve 'pomodoro'
// yalnızca yerel mutasyonlardır (sunucuya giderken delta'ya dönüştürülür).
export type QueueTable = 'profiles' | 'habits' | 'pomodoro' | 'quests';

export interface QueueItem {
  id: string;
  action: QueueAction;
  table: QueueTable;
  payload: any;
  /** Oluşturulduğu an (ms) — Last-Write-Wins karşılaştırmasında kullanılır. */
  timestamp: number;
  /** Kaç kez sunucuya iletilmeye çalışıldı (başarısız denemeler). */
  retryCount: number;
}

// Kuyruğa yazılacak mutasyonun ham girdisi (id/timestamp üretilir).
export interface QueueInput {
  action: QueueAction;
  table: QueueTable;
  payload: any;
  /** Aynı kayıt için sonraki mutasyonları birleştirmek üzere kullanılan anahtar. */
  mergeKey?: string;
}

// Uygulama genelinde paylaşılan senkron durumu (useSyncEngine döndürür).
export interface SyncState {
  /** NetInfo isConnected && isInternetReachable — gerçek internete erişim. */
  isOnline: boolean | null;
  /** Kuyrukta bekleyen mutasyon sayısı (sunucuya iletilmemiş). */
  pendingCount: number;
  /** Şu anda arka planda senkron çalışıyor mu? (UI asla bloklanmaz.) */
  isSyncing: boolean;
  /** En son başarılı senkron zamanı (ms, null = hiç senkron olmadı). */
  lastSyncedAt: number | null;
  /** Son senkron hatası (varsa; sessiz loglama + gösterge için). */
  lastError: string | null;
}

// Delta senkron çekimi: updated_at > last_synced_at olan kayıtlar.
export interface DeltaProfile {
  username: string;
  xp: number;
  coins: number;
  streak: number;
  bio: string | null;
  photo_url: string | null;
  avatar_id: string | null;
  frame_id: string | null;
  updated_at: string | null;
}
