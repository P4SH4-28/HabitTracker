// ============================================================
// SoftButton.js — İkincil/soft buton (primary CTA GradientButton'dur).
// Varyantlar:
//   default — surfaceLight zemin + ikon + metin
//   subtle  — zeminsiz, primary metin (link stili)
//   danger  — kırmızı tonlu zemin + danger metin
//   ghost   — surface + border (çerçeveli)
// Boyut: md (44) | sm (34) | xs (28). PressFX mikro-etkileşimli.
// ============================================================
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme';
import PressableFX from '../PressableFX';
import Icon from './icons';

const SIZES = {
  md: { paddingV: 12, paddingH: 18, fontSize: 14, icon: 16 },
  sm: { paddingV: 8, paddingH: 13, fontSize: 13, icon: 14.5 },
  xs: { paddingV: 5, paddingH: 11, fontSize: 12, icon: 13 },
};

export default function SoftButton({
  label,
  icon,
  emoji,
  name,
  onPress,
  variant = 'default',
  size = 'md',
  disabled,
  style,
  textStyle,
}) {
  const { colors: C, radius } = useTheme();
  const s = SIZES[size] || SIZES.md;

  const bg =
    variant === 'danger' ? C.danger + '1A' : variant === 'ghost' ? C.surface : C.surfaceLight;
  const fg =
    variant === 'danger' ? C.danger : variant === 'subtle' ? C.primary : C.text;
  const hasBorder = variant === 'ghost';

  return (
    <PressableFX
      onPress={onPress}
      disabled={disabled}
      scale={0.97}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: radius.control,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
        },
        hasBorder && { borderWidth: 1, borderColor: C.border },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon || emoji || name ? (
        <Icon name={name} emoji={emoji || icon} size={s.icon} color={fg} style={styles.icon} />
      ) : null}
      <Text style={[styles.label, { color: fg, fontSize: s.fontSize }, textStyle]}>{label}</Text>
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});