// ============================================================
// syncService.ts — Offline-First Synchronization Engine
// Local-First (AsyncStorage) + Supabase arasındaki veri akışı:
//
// 1) MUTATION QUEUE — internet yokken yapılan tüm yazma işlemleri
//    yerel depoya anında yazılır (uygulama zaten local-first) ve
//    QueueItem olarak sıraya kaydedilir.
// 2) AUTO-SYNC — NetInfo + AppState (useSyncEngine) bağlantı
//    geldiğinde / uygulama öne döndüğünde drainQueue'yu sessizce
//    tetikler. UI asla bloklanmaz, kullanıcıya hissettirilmez.
// 3) DELTA SYNC — sunucudan yalnızca updated_at > last_synced_at
//    olan kayıtlar çekilir (pullDeltaProfiles).
// 4) CONFLICT RESOLUTION — Last-Write-Wins: aynı kayda ait iki
//    mutasyon birleştirilirken daha yeni timestamp kazanır;
//    sunucuya başarıyla iletilen item'lar kuyruktan silinir.
//
// Kuyruk HESABA ÖZELDİR (her kullanıcının kendi kuyruğu vardır).
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import type { DeltaProfile, QueueAction, QueueInput, QueueItem, QueueTable } from '../sync/types';

// Kuyruk anahtarı: '@sync_engine:mutation_queue:<name>' (name güvenli).
const QUEUE_KEY_PREFIX = '@sync_engine:mutation_queue:';
// Son başarılı delta senkron zamanı: '@sync_engine:last_synced_at:<name>'.
const LAST_SYNCED_KEY_PREFIX = '@sync_engine:last_synced_at:';
// Bir item'ın en fazla kaç kez denenip "beklemeye" alınacağı.
const MAX_RETRY_COUNT = 5;

function sanitizeName(name: string): string {
  const s = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'varsayilan';
}

export function queueKeyFor(name: string): string {
  return `${QUEUE_KEY_PREFIX}${sanitizeName(name)}`;
}

export function lastSyncedKeyFor(name: string): string {
  return `${LAST_SYNCED_KEY_PREFIX}${sanitizeName(name)}`;
}

// ---------- 1) Mutation Queue ----------

export async function getQueue(name: string): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(queueKeyFor(name));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export async function getQueueCount(name: string): Promise<number> {
  return (await getQueue(name)).length;
}

// Kuyruğa bir mutasyon ekler. Aynı kayda (mergeKey) ait bekleyen bir
// item varsa LAST-WRITE-WINS: daha yeni payload kazanır; timestamp
// en yeni değere güncellenir. Eşit/zamansız durumlar eskiyi korur.
// Dönüş: kuyruğa yazılan item'ın id'si (anında gönderim + hata durumunda
// kuyruktan silmek için kullanılabilir).
export async function enqueueMutation(
  name: string,
  input: QueueInput,
  merge?: (prev: any, next: any) => any
): Promise<string> {
  const item: QueueItem = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    action: input.action,
    table: input.table,
    payload: input.payload,
    timestamp: Date.now(),
    retryCount: 0,
  };
  try {
    const list = await getQueue(name);
    const idx = input.mergeKey
      ? list.findIndex(
          (i) => i.table === input.table && i.payload?.mergeKey === input.mergeKey
        )
      : -1;
    if (idx >= 0) {
      const prev = list[idx];
      // LWW: eski item'ın retry sayısı korunur, payload birleştirilir.
      const mergedPayload = merge ? merge(prev.payload, item.payload) : { ...prev.payload, ...item.payload };
      list[idx] = {
        ...prev,
        payload: mergedPayload,
        // Yeni yazma her zaman "daha yeni" kabul edilir (LWW yerel taraf).
        timestamp: item.timestamp,
        retryCount: 0,
      };
    } else {
      list.push(item);
    }
    await AsyncStorage.setItem(queueKeyFor(name), JSON.stringify(list));
  } catch (e) {
    // Kuyruk yazılamadıysa bile uygulama yerel veriyle devam eder.
    console.warn('Mutation kuyruğuna yazılamadı:', e);
  }
  return item.id;
}

// Başarıyla sunucuya iletilen item'ları kuyruktan siler.
export async function removeFromQueue(name: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    const list = await getQueue(name);
    const keep = list.filter((i) => !ids.includes(i.id));
    await AsyncStorage.setItem(queueKeyFor(name), JSON.stringify(keep));
  } catch (e) {
    console.warn('Kuyruk temizlenemedi:', e);
  }
}

// Başarısız denemelerde retryCount'u artırır (MAX_RETRY sonrası beklemeye alır).
export async function bumpRetryCount(name: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    const list = await getQueue(name);
    const next = list.map((i) =>
      ids.includes(i.id) ? { ...i, retryCount: Math.min(MAX_RETRY_COUNT, i.retryCount + 1) } : i
    );
    await AsyncStorage.setItem(queueKeyFor(name), JSON.stringify(next));
  } catch (e) {
    // önemli değil
  }
}

// ---------- 2) Delta Sync (last_synced_at) ----------

export async function getLastSyncedAt(name: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(lastSyncedKeyFor(name));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (e) {
    return null;
  }
}

export async function setLastSyncedAt(name: string, ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(lastSyncedKeyFor(name), String(ts));
  } catch (e) {
    // önemli değil
  }
}

// Sunucudan yalnızca son senkrondan bu yana GÜNCELLENMİŞ profilleri çeker.
// updated_at kolonu yoksa (eski şema) tam çekim yapılır (güvenli varsayılan).
export async function pullDeltaProfiles(
  name: string,
  usernames: string[]
): Promise<{ profiles: DeltaProfile[]; lastSyncedAt: number }> {
  const now = Date.now();
  const seen: string[] = [];
  const unique = (usernames || []).filter((u) => {
    if (!u || seen.includes(u)) return false;
    seen.push(u);
    return true;
  });
  let last: number | null = null;
  try {
    last = await getLastSyncedAt(name);
    let query = supabase
      .from('profiles')
      .select('username, xp, coins, streak, bio, photo_url, avatar_id, frame_id, updated_at')
      .in('username', unique.length ? unique : [name]);
    if (last) query = query.gt('updated_at', new Date(last).toISOString());
    const { data, error } = await query;
    if (error) throw error;
    await setLastSyncedAt(name, now);
    return { profiles: Array.isArray(data) ? data : [], lastSyncedAt: now };
  } catch (e) {
    // Sorgu başarısızsa (kolon yok / bağlantı) güvenli boş dön; last_synced_at
    // yalnızca başarılı sorguda ilerler (bir sonraki denemede tekrar çeker).
    return { profiles: [], lastSyncedAt: last || 0 };
  }
}

// ---------- 4) Conflict Resolution yardımcıları ----------

// Last-Write-Wins: yerel mutasyonun timestamp'i sunucu updated_at'inden
// yeni ise YEREL kazanır (true); değilse sunucu değeri geçerli (false).
export function localWins(localTimestamp: number, serverUpdatedAt: string | null): boolean {
  if (!serverUpdatedAt) return true;
  const serverTs = Date.parse(serverUpdatedAt);
  if (Number.isNaN(serverTs)) return true;
  return localTimestamp > serverTs;
}

// Merge stratejileri (enqueueMutation'a verilir):
// Profil meta güncellemelerinde alan bazlı birleştir (bio/photoUrl ayrı ayrı).
export function mergeProfileMeta(prev: any, next: any): any {
  return { ...prev, ...next, mergeKey: next.mergeKey || prev.mergeKey };
}

// Kazanım deltalarında: aynı güne ait delta'lar toplanır (tek tek kayıp olmaz).
export function mergeEarnings(prev: any, next: any): any {
  return {
    ...next,
    deltaXp: (prev.deltaXp || 0) + (next.deltaXp || 0),
    deltaGold: (prev.deltaGold || 0) + (next.deltaGold || 0),
    // Mutlak toplamlar (taze cihaz koruması için) en yeni değeri taşır.
    totalXp: next.totalXp ?? prev.totalXp,
    totalGold: next.totalGold ?? prev.totalGold,
    claimedDay: next.claimedDay || prev.claimedDay,
  };
}

// ---------- 3) Auto-Sync: kuyruğu sunucuya boşalt ----------

export interface DrainHandlers {
  // Kuyruktaki kazanım (earnings) item'larını tek çağrıyla sunucuya yollar.
  // Başarılıysa true döner; DataContext syncAnchor'ı burada günceller.
  publishEarnings: (items: QueueItem[]) => Promise<boolean>;
  // Profil meta (bio/fotoğraf) item'ını sunucuya yollar. Başarı: true.
  applyMeta: (item: QueueItem) => Promise<boolean>;
}

// Kuyruktaki tüm item'ları işler: başarılı olanlar silinir, başarısız
// olanların retryCount'u artırılır (bir sonraki tetiklemede yeniden denenir).
// UI'ı asla bloklamaz; tüm hatalar sessizce yönetilir.
export async function drainQueue(
  name: string,
  handlers: DrainHandlers
): Promise<{ synced: number; retried: number }> {
  const items = await getQueue(name);
  if (!items.length) return { synced: 0, retried: 0 };

  let synced: string[] = [];
  let retried: string[] = [];

  // Kazanım item'ları (XP/altın kazandıran her mutasyon): tek toplu çağrıyla
  // sunucuya iletilir. profiles.earnings + pomodoro kayıtları delta köprüsü
  // (publishProfile → updateProfileData) üzerinden tek seferde gider.
  const isEarning = (i: QueueItem) =>
    (i.table === 'profiles' && i.payload?.kind === 'earnings') || i.table === 'pomodoro';
  const earnings = items.filter(isEarning);
  if (earnings.length) {
    const ok = await handlers.publishEarnings(earnings);
    if (ok) {
      synced = synced.concat(earnings.map((i) => i.id));
    } else {
      retried = retried.concat(earnings.map((i) => i.id));
    }
  }

  // Meta (bio/fotoğraf) + yerel tablolar (habits): tekil replike.
  const rest = items.filter((i) => !isEarning(i));
  for (const item of rest) {
    try {
      const ok = await handlers.applyMeta(item);
      if (ok) {
        synced.push(item.id);
      } else {
        retried.push(item.id);
      }
    } catch (e) {
      retried.push(item.id);
    }
  }

  if (synced.length) await removeFromQueue(name, synced);
  if (retried.length) await bumpRetryCount(name, retried);
  return { synced: synced.length, retried: retried.length };
}
