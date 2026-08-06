import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HABIT_COLORS, useTheme } from '../theme';

export default function ColorPicker({ value, onChange }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Renk</Text>
      <View style={styles.row}>
        {HABIT_COLORS.map((c) => (
          <Pressable
            key={c}
            style={[
              styles.swatch,
              { backgroundColor: c },
              value === c && styles.swatchSelected,
            ]}
            onPress={() => onChange(c)}
          >
            {value === c && <Text style={styles.check}>✓</Text>}
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.12 }],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  check: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 2,
  },
});
}
