// ============================================================
// Pill.js — Rozet/etiket çözümü (radius 999 kapsül).
// İsteğe bağlı ikon; metin içi "🔥 12", "🪙 120" gibi değer
// etiketlerinde de kullanılır. Boyut: sm | md.
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import Icon from './icons';

export default function Pill({
  children,
  icon,
  emoji,
  name,
  color,
  bg,
  bordered = false,
  size = 'md',
  iconSize,
  style,
  textStyle,
  numberOfLines,
}) {
  const { colors: C, radius } = useTheme();
  const fg = color || C.text;
  const isSm = size === 'sm';
  const fontSize = isSm ? 11 : 12.5;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: bg || C.surfaceLight,
          borderRadius: radius.pill,
          paddingHorizontal: isSm ? 8 : 12,
          paddingVertical: isSm ? 3 : 5,
        },
        bordered && { borderWidth: 1, borderColor: C.border },
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={name}
          emoji={emoji || icon}
          size={iconSize || fontSize + 2}
          color={fg}
          style={styles.icon}
        />
      ) : null}
      <Text
        numberOfLines={numberOfLines}
        style={[styles.text, { color: fg, fontSize }, textStyle]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});