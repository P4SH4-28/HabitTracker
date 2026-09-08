// ============================================================
// BrandMark.js — Auth/onboarding markası: gradient amblem + isim.
// Gece temasında indigo→violet LinearGradient + dış indigo glow;
// ikon eşlenik tablosundan gelir (ör. 🎯 → navigate).
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import Icon from './icons';

export default function BrandMark({
  name = 'Habit Tracker',
  emblem = '🎯',
  subtitle,
  size = 88,
}) {
  const { colors: C, glow } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.amblemWrap, glow(C.primary, { opacity: 0.32, radius: 30, offset: 8 })]}>
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.amblem, { width: size, height: size, borderRadius: size * 0.3 }]}
        >
          <Icon emoji={emblem} size={size * 0.4} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={[styles.name, { color: C.text }]}>{name}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  amblemWrap: {
    marginBottom: 10,
  },
  amblem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});