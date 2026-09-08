// ============================================================
// Onboarding — ilk açılış tanıtım rehberi
// 4 sayfalık tanıtım: Alışkanlıklar → XP/Altın → Pomodoro & Görevler
// → Kişisel yolculuk. Her sayfa kendi gradient amblemine sahip.
// "Başla" → AsyncStorage bayrağı, bir daha gösterilmez. Admin görmez.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import BackgroundPattern from './BackgroundPattern';
import GradientButton from './GradientButton';
import SoftButton from './ui/SoftButton';
import IconTile from './ui/IconTile';
import { useTheme } from '../theme';

const ONBOARDED_KEY = '@habit_tracker_onboarded';

const PAGES = [
  {
    name: 'body',
    variant: 'primary',
    title: 'Alışkanlıklarını takip et',
    text: 'Günlük alışkanlıklarını ekle, her gün işaretle, serini koru. Kaçırdığın her gün altın cezası keser — düzen şart!',
  },
  {
    name: 'flash',
    variant: 'xp',
    title: 'XP, Altın ve Seviyeler',
    text: 'Tamamlanan her görev XP ve altın kazandırır. Seviye atla, dükkandan avatar ve tema satın al, kendini ödüllendir.',
  },
  {
    name: 'timer',
    variant: 'accent',
    title: 'Pomodoro ve Görevler',
    text: 'Odak seanslarıyla üretkenliğini artır, günlük görevlerden ödüller topla ve arkadaşlarınla liderlikte yarış.',
  },
  {
    name: 'leaf',
    variant: 'violet',
    title: 'Kişisel gelişim yolculuğun',
    text: 'Bu uygulama senin kişisel gelişim yolculuğun. Hile yaparsan sadece kendi geleceğini kandırırsın.',
  },
];

export default function Onboarding({ onComplete }) {
  const { colors: C, radius, glow } = useTheme();
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (!seen) setVisible(true);
      } catch (e) {
        console.warn('Onboarding bayrağı okunamadı:', e);
      }
    })();
  }, []);

  const finish = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, '1');
    } catch (e) {
      console.warn('Onboarding bayrağı yazılamadı:', e);
    }
    if (onComplete) onComplete();
  };

  if (!visible) return null;

  const p = PAGES[page];
  const last = page === PAGES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <BackgroundPattern />
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.card,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            borderRadius: radius.card,
          },
          glow(C.primary, { opacity: 0.16, radius: 34, offset: 0, elevation: 0 }),
        ]}
      >
        <IconTile name={p.name} variant={p.variant} size={96} />
        <Text style={[styles.title, { color: C.text }]}>{p.title}</Text>
        <Text style={[styles.text, { color: C.textMuted }]}>{p.text}</Text>

        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { width: i === page ? 26 : 8 },
                { backgroundColor: i === page ? C.primary : C.border },
              ]}
            />
          ))}
        </View>

        <GradientButton
          label={last ? 'Başla' : 'Devam et'}
          onPress={() => (last ? finish() : setPage((x) => x + 1))}
          style={styles.nextButton}
          glowColor={C.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <SoftButton label="Atla" variant="subtle" size="sm" onPress={finish} style={styles.skip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    padding: 32,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 14,
    height: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    alignSelf: 'stretch',
  },
  skip: {
    alignSelf: 'center',
    marginTop: 2,
  },
});