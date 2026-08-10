// ============================================================
// Onboarding — ilk açılış tanıtım rehberi
// Yeni kayıt olan kullanıcıya 3 sayfalık hızlı bir tanıtım gösterir
// (Alışkanlıklar → XP/Altın → Pomodoro & Görevler). "Başla" dendiğinde
// AsyncStorage'a bayrak yazılır; bir daha gösterilmez. Admin hesabı
// (P4SH4) tanıtıma ihtiyaç duymadığı için rehber onlara gösterilmez.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

const ONBOARDED_KEY = '@habit_tracker_onboarded';

const PAGES = [
  {
    emoji: '🏃',
    title: 'Alışkanlıklarını takip et',
    text: 'Günlük alışkanlıklarını ekle, her gün işaretle, 🔥 serini koru. Kaçırdığın her gün altın cezası keser — düzen şart!',
  },
  {
    emoji: '⚡',
    title: 'XP, Altın ve Seviyeler',
    text: 'Tamamlanan her görev XP ve altın kazandırır. Seviye atla, dükkandan avatar ve tema satın al, kendini ödüllendir.',
  },
  {
    emoji: '🍅',
    title: 'Pomodoro ve Görevler',
    text: 'Odak seanslarıyla üretkenliğini artır, günlük görevlerden ödüller topla ve arkadaşlarınla liderlikte yarış.',
  },
  {
    emoji: '🌱',
    title: 'Kişisel gelişim yolculuğun',
    text: 'Bu uygulama senin kişisel gelişim yolculuğun. Hile yaparsan sadece kendi geleceğini kandırırsın.',
  },
];

export default function Onboarding({ onComplete }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(false);

  // Bayrak kontrolü: daha önce görülmediyse göster (yedekler dahil).
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{p.emoji}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{p.title}</Text>
        <Text style={[styles.text, { color: colors.textMuted }]}>{p.text}</Text>

        {/* Sayfa noktaları */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === page ? { backgroundColor: colors.primary } : { backgroundColor: colors.border },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={() => (last ? finish() : setPage((x) => x + 1))}
        >
          <Text style={[styles.nextText, { color: colors.onPrimary }]}>{last ? 'Başla 🚀' : 'İleri →'}</Text>
        </Pressable>

        <Pressable onPress={finish} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>Atla</Text>
        </Pressable>
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
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 28,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  skipButton: {
    marginTop: 14,
    padding: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
