// ============================================================
// TopBar — Tüm ekranların ortak başlık çubuğu
// Sol: hamburger (sekmeler) veya geri ok (alt ekranlar).
// Orta: başlık. Sağ: senkron durum rozeti + isteğe bağlı içerik.
// ============================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMenu } from '../context/MenuContext';
import SyncStatusChip from './SyncStatusChip';
import { useTheme } from '../theme';

export default function TopBar({ title, onBack, right }) {
  const { colors: C } = useTheme();
  const { openMenu } = useMenu();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: C.surface }]}>
      <View style={styles.inner}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: C.surfaceLight }]}
          onPress={onBack || openMenu}
          hitSlop={8}
        >
          <Ionicons
            name={onBack ? 'arrow-back' : 'menu'}
            size={20}
            color={C.text}
          />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.right}>
          {right || <SyncStatusChip />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
    paddingBottom: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
