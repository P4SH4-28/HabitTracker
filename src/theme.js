// ============================================================
// Tema sistemi
// THEMES: Dükkan'da satılan tema tanımları (ad, ikon, fiyat, renkler, desen).
// useTheme: Bileşenlerin "şu an uygulanan renkleri" aldığı hook. Tema
// değişince ThemeProvider'ın değeri değişir, tüm bileşenler yeniden
// çizilir ve yeni renklerle stil üretir.
// ============================================================
import { createContext, useContext } from 'react';

// Varsayılan (Gece teması) renkler — temalar bu değerlerin üzerine yazar.
const BASE_COLORS = {
  background: '#0B0E14',
  surface: '#151A23',
  surfaceLight: '#1E2530',
  border: '#2A3340',
  primary: '#7C5CFF',
  primaryDark: '#5E3FD4',
  accent: '#22D3A5',
  danger: '#F0436E',
  text: '#F2F5F9',
  textMuted: '#8A94A6',
  xp: '#FFB454',
  gold: '#FFD75E',
  silver: '#C0C8D8',
  bronze: '#D98E5A',
  // Birincil butonların ÜZERİNDEKİ yazı rengi (açık/koyu temaya göre değişir).
  onPrimary: '#FFFFFF',
  // Ekran arka planına serpiştirilen dekoratif desen emojisi (null = desensiz).
  pattern: null,
};

// Eski bileşenlerin importunu kırmamak için aynı isimde export.
// Yeni kod doğrudan useTheme() kullanır; bu nesne yalnızca varsayılandır.
export const COLORS = { ...BASE_COLORS };

// Alışkanlık oluştururken seçilebilecek semboller (EmojiPicker).
export const EMOJIS = [
  '💧', '🏃', '📖', '🧘', '💪', '🍎', '🎨', '🎸',
  '✍️', '🧹', '💻', '🚶', '🌅', '😴', '🥗', '📵',
  '🌊', '🔥', '⚽', '🎵', '📷', '🌱', '🍵', '💊',
  '💡', '🧠', '🎯', '🚿', '🛌', '🧦', '🦷', '⏰',
];

// Alışkanlık oluştururken seçilebilecek renkler (ColorPicker).
export const HABIT_COLORS = [
  '#7C5CFF', '#22D3A5', '#38BDF8', '#F59E0B', '#F0436E',
  '#4ADE80', '#C084FC', '#F472B6', '#EF4444', '#60A5FA',
];

// Tema tanımları. "colors" yalnızca BASE_COLORS'tan farklı olanları içerir.
export const THEMES = [
  {
    id: 'dark',
    name: 'Gece',
    emoji: '🌑',
    price: 0,
    desc: 'Klasik koyu tema',
    pattern: null,
    colors: {},
  },
  {
    id: 'mono',
    name: 'Siyah Beyaz',
    emoji: '⚫',
    price: 0,
    desc: 'Sade ve şık monokrom',
    pattern: null,
    colors: {
      background: '#0B0B0D',
      surface: '#151518',
      surfaceLight: '#202024',
      border: '#333338',
      primary: '#F5F5F5',
      primaryDark: '#C9C9CE',
      accent: '#9E9EA6',
      text: '#F2F2F4',
      textMuted: '#8F8F98',
      xp: '#D8D8DE',
      gold: '#CFCFD6',
      silver: '#A9A9B0',
      bronze: '#8A8A92',
      onPrimary: '#0B0B0D',
    },
  },
  {
    id: 'heart',
    name: 'Kalpli',
    emoji: '❤️',
    price: 300,
    desc: 'Sevimli kalp deseni',
    pattern: '❤️',
    colors: {
      background: '#1B0D13',
      surface: '#261420',
      surfaceLight: '#351B2B',
      border: '#47243A',
      primary: '#FF5C8A',
      primaryDark: '#D94371',
      accent: '#FF8FB0',
    },
  },
  {
    id: 'forest',
    name: 'Orman',
    emoji: '🌲',
    price: 350,
    desc: 'Yeşilin huzuru',
    pattern: '🌲',
    colors: {
      background: '#0B160D',
      surface: '#142118',
      surfaceLight: '#1E2F24',
      border: '#2A3F30',
      primary: '#4ADE80',
      primaryDark: '#36B962',
      accent: '#86EFAC',
    },
  },
  {
    id: 'ocean',
    name: 'Okyanus',
    emoji: '🌊',
    price: 350,
    desc: 'Derin mavi dalgalar',
    pattern: '🌊',
    colors: {
      background: '#07141C',
      surface: '#0F2028',
      surfaceLight: '#17303C',
      border: '#224052',
      primary: '#22D3EE',
      primaryDark: '#17A9C6',
      accent: '#2DD4BF',
    },
  },
  {
    id: 'lavender',
    name: 'Lavanta',
    emoji: '💜',
    price: 400,
    desc: 'Yumuşak mor tonlar',
    pattern: '💜',
    colors: {
      background: '#100B1C',
      surface: '#1A1228',
      surfaceLight: '#251A38',
      border: '#32254B',
      primary: '#C084FC',
      primaryDark: '#A05FE0',
      accent: '#E9D5FF',
    },
  },
  {
    id: 'sunset',
    name: 'Gün Batımı',
    emoji: '🌅',
    price: 400,
    desc: 'Turuncu-pembe ufuk',
    pattern: '🌅',
    colors: {
      background: '#1C0F0B',
      surface: '#281813',
      surfaceLight: '#382219',
      border: '#4A2E22',
      primary: '#FF8A5C',
      primaryDark: '#E06E42',
      accent: '#FFC46B',
    },
  },
  {
    id: 'galaxy',
    name: 'Galaksi',
    emoji: '🌌',
    price: 450,
    desc: 'Yıldız tozu deseni',
    pattern: '✨',
    colors: {
      background: '#0B0E1F',
      surface: '#141831',
      surfaceLight: '#1E2347',
      border: '#2B3160',
      primary: '#8B5CF6',
      primaryDark: '#6F3FE0',
      accent: '#38BDF8',
    },
  },
  {
    id: 'candy',
    name: 'Şekerleme',
    emoji: '🍬',
    price: 450,
    desc: 'Tatlı pembe-mor',
    pattern: '🍬',
    colors: {
      background: '#160F1E',
      surface: '#211631',
      surfaceLight: '#2D2045',
      border: '#3D2C5C',
      primary: '#F472B6',
      primaryDark: '#D7509B',
      accent: '#A78BFA',
    },
  },
  {
    id: 'cherry',
    name: 'Kiraz',
    emoji: '🍒',
    price: 500,
    desc: 'Kırmızı-pembe kiraz',
    pattern: '🍒',
    colors: {
      background: '#1A0B14',
      surface: '#261323',
      surfaceLight: '#331C2F',
      border: '#452843',
      primary: '#FF4D6D',
      primaryDark: '#DE3357',
      accent: '#FF7A9E',
    },
  },
  {
    id: 'cyber',
    name: 'Siber',
    emoji: '🤖',
    price: 550,
    desc: 'Neon yeşil-mor',
    pattern: '🤖',
    colors: {
      background: '#050B10',
      surface: '#0C141D',
      surfaceLight: '#14202C',
      border: '#1F3040',
      primary: '#00FFC2',
      primaryDark: '#00CC9B',
      accent: '#7C5CFF',
      onPrimary: '#00231A',
    },
  },
  {
    id: 'royal',
    name: 'Kraliyet',
    emoji: '👑',
    price: 600,
    desc: 'Altın ve mor ihtişam',
    pattern: '👑',
    colors: {
      background: '#0F0A1E',
      surface: '#1A1230',
      surfaceLight: '#251A45',
      border: '#332659',
      primary: '#D4A92E',
      primaryDark: '#B38C1F',
      accent: '#E8C75A',
    },
  },
  {
    id: 'dragon',
    name: 'Ejderha',
    emoji: '🐲',
    price: 700,
    desc: 'Ateşli kırmızı-amber',
    pattern: '🐲',
    colors: {
      background: '#0C0A14',
      surface: '#161226',
      surfaceLight: '#221B38',
      border: '#302749',
      primary: '#EF4444',
      primaryDark: '#D02C2C',
      accent: '#F59E0B',
    },
  },
];

// Tema id'sine göre tema tanımını döndürür (yoksa varsayılan "Gece").
export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// Tema id'si için TAM renk sözlüğünü üretir (temel + tema farkları + desen).
export function resolveTheme(themeId) {
  const theme = getTheme(themeId);
  return { ...BASE_COLORS, ...theme.colors, pattern: theme.pattern || null };
}

// ---------- Tema Context ----------
// App.js kökünde ThemeProvider ile "şu anki renkler" verilir; her bileşen
// useTheme() ile alır. Tema değişince provider değeri değişir ve tüm
// bileşenler yeni renklerle yeniden çizilir.

const ThemeContext = createContext({ colors: BASE_COLORS });

export const ThemeProvider = ThemeContext.Provider;

export function useTheme() {
  return useContext(ThemeContext);
}
