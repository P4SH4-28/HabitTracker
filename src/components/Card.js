// ============================================================
// Card.js — Premium elevated yüzey primitive'i.
// - Köşe yarıçapı: 20 (design token)
// - Yarı saydam ultra-subtle kenarlık (solid değil)
// - İsteğe bağlı glow (dış ışıma) ve press geri bildirimi
// ============================================================
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

export default function Card({ children, style, onPress, glowColor, selected, ...rest }) {
  const { colors: C, radius, glow } = useTheme();
  const styles = useMemo(() => makeStyles(C, radius), [C, radius]);
  const glowStyle = glowColor
    ? glow(glowColor, { opacity: selected ? 0.28 : 0.14, radius: 26, offset: 8, elevation: selected ? 12 : 6 })
    : null;

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          glowStyle,
          selected && styles.selected,
          pressed && { transform: [{ scale: 0.985 }] },
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, glowStyle, selected && styles.selected, style]} {...rest}>
      {children}
    </View>
  );
}

function makeStyles(C, radius) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      padding: 18,
    },
    selected: {
      borderColor: C.primary + '66',
    },
  });
}