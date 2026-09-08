// ============================================================
// BackgroundPattern — Premium ambient zemin katmanı
// - Yumuşak gradyan ışımalar (indigo üstte, emerald altta) derinlik verir;
//   Linear/Vercel tarzı ekranın arka planına hafif "atmosphere" katar.
// - Temanın emoji deseni (örn. ❤️ ✨ 🌊) şimdi çok düşük opaklıkta ince bir
//   doku olarak korunur (tema kimliği kaybolmaz).
// - Tüm katman pointerEvents="none" — dokunuşları asla engellemez.
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

export default function BackgroundPattern() {
  const { colors: C } = useTheme();

  return (
    <View style={styles.layer} pointerEvents="none">
      {/* Ambient ışıma: üstte birincil aksan, altta emerald — çok yumuşak */}
      <LinearGradient
        colors={['rgba(99,102,241,0.10)', 'transparent', 'rgba(16,185,129,0.05)', 'transparent']}
        locations={[0, 0.35, 0.7, 1]}
        style={styles.atmosphere}
      />
      {/* Temaya özgü emoji dokusu (burnu varsa) */}
      {C.pattern ? <EmojiTexture pattern={C.pattern} /> : null}
    </View>
  );
}

function EmojiTexture({ pattern }) {
  const cells = Array.from({ length: 160 });
  return (
    <View style={styles.grid}>
      {cells.map((_, i) => (
        <Text key={i} style={styles.cell}>
          {pattern}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  atmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.028,
  },
  cell: {
    width: '12.5%',
    fontSize: 18,
    textAlign: 'center',
  },
});