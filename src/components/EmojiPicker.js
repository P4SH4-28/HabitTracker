import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EMOJIS, useTheme } from '../theme';

export default function EmojiPicker({ value, onChange }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Sembol</Text>
      <View style={styles.grid}>
        {EMOJIS.map((e) => (
          <Pressable
            key={e}
            style={[styles.item, value === e && styles.itemSelected]}
            onPress={() => onChange(e)}
          >
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: C.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  item: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
    borderColor: C.primary,
    backgroundColor: C.primary + '26',
    transform: [{ scale: 1.08 }],
  },
  emoji: {
    fontSize: 21,
  },
});
}
