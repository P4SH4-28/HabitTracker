// ============================================================
// AvatarCircle — Daire şeklinde emoji avatar (profil fotoğrafı)
// Emoji tabanlıdır; "emoji" verilirse doğrudan, verilmezse
// "avatarId" ile dükkan ürününe bakıp emojiyi bulur.
// "frameId" verilirse avatarın etrafına dükkan çerçevesinin
// emojilerinden oluşan bir halka sarılır (FrameDecor). Çerçeve
// Lottie animasyonluysa (Season Pass VIP çerçeveleri) avatarın
// arkasında dönen animasyon (LottieView) oynatılır.
// ============================================================
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { getAvatarEmoji, getFrame } from '../data/shop';
import { useTheme } from '../theme';

// Lottie animasyon kaynakları (assets/lottie/*.json).
export const LOTTIE_SOURCES = {
  heart: require('../../assets/lottie/heart.json'),
  flame: require('../../assets/lottie/flame.json'),
  glow: require('../../assets/lottie/glow.json'),
};

export function getLottieSource(frameId) {
  const frame = getFrame(frameId);
  if (!frame?.lottie) return null;
  return LOTTIE_SOURCES[frame.lottie] || null;
}

// Lottie çerçeve sarmalayıcısı: animasyonu avatarın arkasında döndürür.
export function LottieFrame({ frame, size, style, children }) {
  const source = getLottieSource(frame?.id);
  if (!source) return children;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <LottieView
        source={source}
        autoPlay
        loop
        style={{
          position: 'absolute',
          width: size * 1.9,
          height: size * 1.9,
        }}
      />
      {children}
    </View>
  );
}

// Çerçeve halkası: verilen emojiyi avatarın çevresinde 8 noktada gösterir.
// Her avatar boyutuna ölçeklenir; çocuk öğe (avatar) ortada kalır.
export function FrameDecor({ ring = '⭐', size = 64, style, children }) {
  const dots = [];
  const radius = size * 0.52;
  const dotSize = size * 0.2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    dots.push(
      <Text
        key={i}
        style={{
          position: 'absolute',
          left: size / 2 + Math.cos(angle) * radius - dotSize / 2,
          top: size / 2 + Math.sin(angle) * radius - dotSize / 2,
          fontSize: dotSize,
        }}
      >
        {ring}
      </Text>
    );
  }
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {dots}
      {children}
    </View>
  );
}

export default function AvatarCircle({ avatarId, emoji, frameId, size = 44, ringColor, style }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const resolved = emoji || (avatarId ? getAvatarEmoji(avatarId) : '😀');
  const frame = frameId ? getFrame(frameId) : null;
  const circle = (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        ringColor ? { borderWidth: 2, borderColor: ringColor } : null,
        !frame && style,
      ]}
    >
      <Text style={{ fontSize: size * 0.48 }}>{resolved}</Text>
    </View>
  );
  if (!frame) return circle;
  // Lottie çerçeve: animasyon avatarın arkasında oynar.
  if (frame.lottie) {
    return (
      <LottieFrame frame={frame} size={size} style={style}>
        {circle}
      </LottieFrame>
    );
  }
  return (
    <FrameDecor ring={frame.emoji} size={size} style={style}>
      {circle}
    </FrameDecor>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    circle: {
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
