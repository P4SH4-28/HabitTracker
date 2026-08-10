// ============================================================
// useSyncEngine — Offline-First senkronizasyon motoru hook'u
//
// - NetInfo ile ağ durumunu dinler (isConnected + isInternetReachable).
// - Bağlantı kopup geri geldiğinde veya uygulama ön plana döndüğünde
//   (AppState === 'active') arka planda SESSİZCE senkron tetikler.
// - UI'ı asla kilitlemez, yükleniyor göstergesi koymaz.
// - SyncState döndürür: isOnline, pendingCount, isSyncing, lastSyncedAt.
// ============================================================
import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

// SyncState yapısı: src/sync/types.ts (isOnline, pendingCount, isSyncing,
// lastSyncedAt, lastError). Burada yalnızca JSDoc referansı olarak kullanılır.

const INITIAL = {
  isOnline: null,
  pendingCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  lastError: null,
};

export function useSyncEngine(onSyncRequested) {
  const [syncState, setSyncState] = useState(INITIAL);
  // Yeni bağlantı geldiğinde yalnızca BİR kez senkron tetiklenir
  // (arka arkaya gelen NetInfo olaylarını yutar — debounce).
  const syncQueuedRef = useRef(false);
  const onlineRef = useRef(null);
  const onSyncRef = useRef(onSyncRequested);
  useEffect(() => {
    onSyncRef.current = onSyncRequested;
  }, [onSyncRequested]);

  const queueSync = useCallback(() => {
    if (syncQueuedRef.current) return;
    syncQueuedRef.current = true;
    // Mikro görev yerine kısa gecikme: NetInfo olayları genelde 2-3 kez
    // üst üste gelir; son durum oturduktan sonra tek seferlik senkron yeterli.
    setTimeout(() => {
      syncQueuedRef.current = false;
      if (onSyncRef.current) onSyncRef.current();
    }, 250);
  }, []);

  // Ağ durumunu dinle: bağlantı GERİ GELDİĞİNDE sessizce senkronla.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      const prev = onlineRef.current;
      onlineRef.current = online;
      setSyncState((s) => ({ ...s, isOnline: online }));
      if (online && prev !== true) {
        // Bağlantı yoktan geldi → kuyruğu boşaltmaya çalış.
        queueSync();
      }
    });
    // Açılışta mevcut ağ durumunu hemen oku.
    NetInfo.fetch()
      .then((state) => {
        const online = state.isConnected === true && state.isInternetReachable !== false;
        onlineRef.current = online;
        setSyncState((s) => ({ ...s, isOnline: online }));
        if (online) queueSync();
      })
      .catch(() => {});
    return () => unsub();
  }, [queueSync]);

  // Uygulama arka plandan ön plana döndüğünde de sessizce senkronla.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && onlineRef.current) queueSync();
    });
    return () => sub.remove();
  }, [queueSync]);

  // Kuyruk/bağlantı bilgisi dışarıdan güncellenebilsin (DataContext yazar).
  const setPending = useCallback((pendingCount) => {
    setSyncState((s) => ({ ...s, pendingCount }));
  }, []);

  const setSyncing = useCallback((isSyncing) => {
    setSyncState((s) => ({ ...s, isSyncing }));
  }, []);

  const setLastSync = useCallback((lastSyncedAt, lastError = null) => {
    setSyncState((s) => ({ ...s, lastSyncedAt, lastError }));
  }, []);

  const refresh = useCallback(() => {
    queueSync();
  }, [queueSync]);

  return {
    syncState,
    setPending,
    setSyncing,
    setLastSync,
    refresh,
  };
}
