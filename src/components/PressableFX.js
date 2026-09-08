// ============================================================
// PressableFX.js — Basınç geri bildirimli dokunulabilir sarmalayıcı.
// Premium mikro-etkileşim:
//   - Basınçta yumuşak spring küçülme (0.96 varsayılan, prop ile değişir)
//   - Çok hafif "tap" haptiği (cihazda)
//   - Reanimated (UI thread) ile akıcı animasyon
// Normal Pressable'a 1:1 alternatiftir (style prop'u çözülmüş stil bekler;
// children bir render-props olabilir: ({ pressed }) => node).
// ============================================================
import { useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { tap } from '../services/sfx';

const SPRING = { damping: 18, stiffness: 340, mass: 0.8 };

export default function PressableFX({
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  scale = 0.96,
  haptic = true,
  style,
  ...rest
}) {
  const tapGuard = useRef(0);
  const anim = useSharedValue(1);

  const handlePressIn = (e) => {
    if (disabled) return;
    anim.value = withSpring(scale, SPRING);
    if (haptic) tap();
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e) => {
    anim.value = withSpring(1, SPRING);
    if (onPressOut) onPressOut(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: anim.value }],
    opacity: anim.value < 1 ? 0.92 : 1,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      {({ pressed: p }) => (
        <Animated.View style={[style, animatedStyle]}>
          {typeof children === 'function' ? children({ pressed: p }) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}