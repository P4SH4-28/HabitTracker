// ============================================================
// SectionHeader.js — Bölüm başlığı (metin + isteğe bağlı eylem).
// ============================================================
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';

export default function SectionHeader({ title, actionLabel, onAction, style }) {
  const { colors: C } = useTheme();
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} disabled={!onAction}>
          <Text style={[styles.action, { color: C.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
  },
});