// ============================================================
// SyncStatusChip — minimalist senkron durum indikatörü
// Offline-First Sync Engine:
// - Yalnızca mutation_queue'da bekleyen değişiklikler VARSA ve
//   internete bağlanılamıyorsa köşede küçük bir rozet durur:
//   "Çevrimdışı · N değişiklik bekliyor".
// - Arka plan senkronu tamamlandığı an rozet SESSİZCE kaybolur
//   (kullanıcıya "Senkronize Et" butonu dayatılmaz; tıklama
//   yalnızca isteğe bağlı anında denemedir).
// ============================================================
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';

export default function SyncStatusChip() {
  const { pendingCount, isOnline, isSyncing, refreshServer } = useData();
  const { colors: C } = useTheme();

  // Koşul: yalnızca bekleyen değişiklik VARSA göster (kuyruk boşsa gizle).
  if (!pendingCount || pendingCount <= 0) return null;

  const offline = isOnline === false;
  const syncing = isSyncing;

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: offline ? C.danger + '18' : C.gold + '1f' }]}
      onPress={() => refreshServer()}
      hitSlop={8}
    >
      {syncing ? (
        <Ionicons name="sync" size={13} color={C.primary} />
      ) : offline ? (
        <Ionicons name="cloud-offline-outline" size={13} color={C.danger} />
      ) : (
        <Ionicons name="cloud-upload-outline" size={13} color={C.gold} />
      )}
      <Text
        style={[
          styles.text,
          { color: syncing ? C.primary : offline ? C.danger : C.gold },
        ]}
        numberOfLines={1}
      >
        {syncing
          ? `Eşitleniyor (${pendingCount})…`
          : offline
            ? `Çevrimdışı · ${pendingCount} değişiklik bekliyor`
            : `${pendingCount} değişiklik eşitleniyor`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 150,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
  },
});
