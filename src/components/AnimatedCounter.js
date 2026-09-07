// ============================================================
// AnimatedCounter.js — Değer değişince yumuşakça sayan animasyonlu sayaç.
// Alışkanlık tamamlanınca XP/altın/istatistik değerlerinin heyecanla
// artıp düşmesini sağlar (Faz A: daha canlı etkileşim).
// Sadece sayıyı gösterir; stil tamamen dışarıdan (style) verilir.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Animated, Text } from 'react-native';

export default function AnimatedCounter({ value, duration = 600, style }) {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value) return;
    prevRef.current = value;
    anim.setValue(prev);
    const listener = anim.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(listener);
  }, [value, duration, anim]);

  return <Text style={style}>{display}</Text>;
}
