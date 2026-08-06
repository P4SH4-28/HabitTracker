// ============================================================
// LevelUpModal — Seviye atlama kutlama ekranı
// DataContext'teki "levelUpEvent" her seviye atlayışında dolar;
// bu bileşen onu algılayıp animasyonlu bir kutlama gösterir.
// Hangi sekmede olursan ol çalışır (App.js kökünde render edilir).
// ============================================================
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';

export default function LevelUpModal() {
  const { levelUpEvent, dismissLevelUp } = useData();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const visible = levelUpEvent !== null;

  // Kart animasyonu: görünür olduğunda sıçrama (spring) ile büyür.
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.5);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissLevelUp}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.confetti}>🎉 ⭐ ✨</Text>
          <Text style={styles.label}>SEVİYE ATLADIN!</Text>
          <Text style={styles.bigLevel}>{levelUpEvent?.level}</Text>
          <Text style={styles.subtitle}>
            Tebrikler! Artık <Text style={styles.highlight}>Seviye {levelUpEvent?.level}</Text>{' '}
            oldun. 🚀
          </Text>
          <Pressable style={styles.button} onPress={dismissLevelUp}>
            <Text style={styles.buttonText}>Devam Et</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 24,
      paddingVertical: 36,
      paddingHorizontal: 28,
      alignItems: 'center',
      width: '100%',
      maxWidth: 360,
      borderWidth: 1,
      borderColor: C.gold,
    },
    confetti: {
      fontSize: 40,
      marginBottom: 12,
    },
    label: {
      color: C.gold,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 2,
    },
    bigLevel: {
      color: C.text,
      fontSize: 96,
      fontWeight: '900',
      marginVertical: 4,
    },
    subtitle: {
      color: C.textMuted,
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    highlight: {
      color: C.gold,
      fontWeight: '700',
    },
    button: {
      backgroundColor: C.primary,
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 14,
    },
    buttonText: {
      color: C.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
