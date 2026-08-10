// ============================================================
// SyncStatusChip — "Senkronizasyon Bekliyor" göstergesi
// Yerel veri sunucuya henüz aktarılmadıysa (pendingSync) başlık
// çubuğunun köşesinde şık bir rozet durur; dokununca manuel
// senkron tetiklenir. Senkron tamamlanınca rozet kaybolur.
// ============================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';

export default function SyncStatusChip() {
  const { pendingSync, refreshServer, server } = useData();
  const { colors: C } = useTheme();
  // Bekleme yok ve çevrimdışı değil → gösterilecek bir şey yok.
  if (!pendingSync && server.connected !== false) return null;

  const syncing = server.syncing;

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: syncing ? C.primary + '22' : C.danger + '18' }]}
      onPress={() => refreshServer()}
      hitSlop={8}
    >
      {syncing ? (
        <Ionicons name="sync" size={13} color={C.primary} />
      ) : server.connected === false ? (
        <Ionicons name="cloud-offline-outline" size={13} color={C.danger} />
      ) : (
        <Ionicons name="cloud-upload-outline" size={13} color={C.gold} />
      )}
      <Text
        style={[
          styles.text,
          { color: syncing ? C.primary : server.connected === false ? C.danger : C.gold },
        ]}
        numberOfLines={1}
      >
        {syncing
          ? 'Senkronize ediliyor…'
          : server.connected === false
            ? 'Çevrimdışı'
            : 'Senkronizasyon Bekliyor'}
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
    maxWidth: 140,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
  },
});
