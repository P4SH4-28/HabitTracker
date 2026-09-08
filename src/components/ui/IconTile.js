// ============================================================
// IconTile.js — Gradient/glass ikon kutusu (premium geometri).
// - Renkli varyantlar: tema single-color textrans degrade (primary),
//   marka gradientleri (violet/accent/danger/xp/gold/silver/bronze),
//   glass (surface + border) — hepsi "yumuşatılmış keskin" köşelerde.
// - İsteğe bağlı yumuşak dış ışıma (glow).
// ============================================================
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import Icon from './icons';

const MARK_GRADIENTS = {
  violet: ['#A78BFA', '#7C3AED'],
  accent: ['#34D399', '#059669'],
  danger: ['#FB7185', '#E11D48'],
  xp: ['#FBBF24', '#F59E0B'],
  gold: ['#FCD34D', '#C98900'],
  silver: ['#E4E4E7', '#90909A'],
  bronze: ['#E7A87B', '#B2653A'],
};

export default function IconTile({
  icon,
  emoji,
  name,
  variant = 'primary',
  tint,
  size = 40,
  iconSize,
  iconColor,
  glow3x = true,
  style,
}) {
  const { colors: C, radius, glow } = useTheme();
  const styles = useMemo(() => makeStyles(C, radius), [C, radius]);

  const borderRadius = Math.round(size * 0.34);
  const inner = iconSize || Math.round(size * 0.46);
  const isGlass = variant === 'glass' && !tint;

  const gradient = useMemo(() => {
    if (tint) return [tint, tint + 'CC'];
    if (variant === 'primary') return [C.primary, C.primaryDark];
    if (isGlass) return null;
    return MARK_GRADIENTS[variant] || [C.primary, C.primaryDark];
  }, [tint, variant, isGlass, C.primary, C.primaryDark]);

  const gradPair = MARK_GRADIENTS[variant];
  const glowColor = tint || (variant === 'primary' ? C.primary : gradPair ? gradPair[1] : C.primary);
  const glowStyle = glow3x
    ? glow(glowColor, { opacity: 0.22, radius: 16, offset: 5, elevation: 5 })
    : null;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius,
        },
        glowStyle,
        style,
      ]}
    >
      {isGlass ? (
        <View style={[styles.body, { borderRadius, borderWidth: 1, borderColor: C.border }]}>
          <Icon
            name={name}
            emoji={emoji || icon}
            size={inner}
            color={iconColor || C.text}
          />
        </View>
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.body, { borderRadius }]}
        >
          <Icon name={name} emoji={emoji || icon} size={inner} color={iconColor || '#FFFFFF'} />
        </LinearGradient>
      )}
    </View>
  );
}

function makeStyles(C, radius) {
  return StyleSheet.create({
    tile: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}