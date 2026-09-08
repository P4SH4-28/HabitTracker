// ============================================================
// TopBar — Tüm ekranların ortak başlık çubuğu
// Sol: hamburger (sekmeler) veya geri ok (alt ekranlar).
// Orta: başlık. Sağ: senkron durum rozeti + isteğe bağlı içerik.
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMenu } from '../context/MenuContext';
import SyncStatusChip from './SyncStatusChip';
import { useTheme } from '../theme';

export default function TopBar({ title, onBack, right }) {
  const { colors: C, radius } = useTheme();
  const { openMenu } = useMenu();
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={55}
      tint="dark"
      style={[styles.bar, { paddingTop: insets.top + 6 }]}
    >
      <View style={styles.inner}>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            { backgroundColor: C.surfaceLight, borderColor: C.border },
            pressed && { transform: [{ scale: 0.93 }], opacity: 0.85 },
          ]}
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
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 8,
    overflow: 'hidden',
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
    borderWidth: 1,
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
