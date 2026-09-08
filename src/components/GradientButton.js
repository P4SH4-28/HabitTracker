// ============================================================
// GradientButton.js — Premium CTA butonu.
// - İndigo→violet doğrusal gradyan (Linear/Vercel tarzı)
// - Dış indigo glow (soft shadow) + basınçta scale 0.97
// - Varsayılan küçük haptik; disabled'da matlaşır
// ============================================================
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { tap } from '../services/sfx';
import { useTheme } from '../theme';
import Icon from './ui/icons';

const SPRING = { damping: 20, stiffness: 320, mass: 0.8 };

export default function GradientButton({
  label,
  onPress,
  disabled,
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  textStyle,
  icon,
  glowColor,
  haptic = true,
  compact = false,
}) {
  const { colors: C, radius, glow } = useTheme();
  const styles = useMemo(() => makeStyles(C, radius), [C, radius]);
  const anim = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: anim.value }],
    opacity: anim.value < 1 ? 0.94 : 1,
  }));

  const handleIn = () => {
    if (disabled) return;
    anim.value = withSpring(0.97, SPRING);
    if (haptic) tap();
  };
  const handleOut = () => {
    if (disabled) return;
    anim.value = withSpring(1, SPRING);
  };

  const gradient = colors || [C.primary, C.primaryDark];
  const glowStyle = glowColor
    ? glow(glowColor, { opacity: disabled ? 0 : 0.4, radius: 18, offset: 6 })
    : null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        glowStyle,
        disabled && glowStyle && { shadowOpacity: 0 },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        disabled={disabled}
      >
        {({ pressed }) => (
          <LinearGradient
            colors={gradient}
            start={start}
            end={end}
            style={[
              styles.btn,
              compact && styles.btnCompact,
              disabled && styles.disabled,
              pressed && !disabled && styles.pressed,
            ]}
          >
            {icon ? <Icon emoji={icon} size={15} color={C.onPrimary} style={styles.icon} /> : null}
            <Text style={[styles.label, disabled && styles.labelDisabled, textStyle]}>
              {label}
            </Text>
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(C, radius) {
  return StyleSheet.create({
    wrap: {
      borderRadius: radius.control,
    },
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.control,
      paddingVertical: 14,
      paddingHorizontal: 20,
      overflow: 'hidden',
    },
    btnCompact: {
      paddingVertical: 9,
      paddingHorizontal: 14,
    },
    pressed: {
      opacity: 0.92,
    },
    icon: {
      color: C.onPrimary,
      marginRight: 6,
    },
    label: {
      color: C.onPrimary,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.4,
    },
    labelDisabled: {
      opacity: 0.6,
    },
  });
}