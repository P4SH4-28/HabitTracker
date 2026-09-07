// ============================================================
// PressableFX.js — Basınç geri bildirimli dokunulabilir sarmalayıcı.
// Birleşik deneyim:
//   - Basınçta küçük ölçek (şişme değil, hafif küçülme) animasyonu
//   - Çok hafif "tap" haptiği (cihazda)
// contentContainerStyle ile dış tasarım stillerini geçirebilirsin.
// Normal Pressable'a 1:1 alternatif olarak kullanılabilir (style prop
// fonksiyon destekli değildir; harici kart hâline getirildiğinde style
// prop'una çözülmüş stil nesnesi verilir).
// ============================================================
import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import { tap } from '../services/sfx';

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
  const anim = useRef(new Animated.Value(1)).current;
  const handlePressIn = (e) => {
    if (disabled) return;
    Animated.spring(anim, {
      toValue: scale,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
    if (haptic) tap();
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e) => {
    Animated.spring(anim, {
      toValue: 1,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
    if (onPressOut) onPressOut(e);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    >
      {({ pressed }) => (
        <Animated.View
          style={[style, { transform: [{ scale: anim }] }, pressed && { opacity: 0.9 }]}
        >
          {typeof children === 'function' ? children({ pressed }) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}