// ============================================================
// BackgroundPattern — Temanın desenini arka planda gösterir
// Tema tanımındaki "pattern" emojisini (örn. ❤️ ✨ 🌊) tüm ekranın
// arkasına düşük opaklıkta serpiştirir. Ekranların arka planları
// saydam olduğu için desen, kartların arasından görünür.
// Desen olmayan temalarda hiçbir şey çizilmez (boş bir katman).
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export default function BackgroundPattern() {
  const { colors: C } = useTheme();
  if (!C.pattern) return null;
  // Yeterli sayıda hücre üret ki geniş ekranlarda da tüm alan kaplansın.
  const cells = Array.from({ length: 160 });
  return (
    <View style={styles.layer} pointerEvents="none">
      <View style={styles.grid}>
        {cells.map((_, i) => (
          <Text key={i} style={styles.cell}>
            {C.pattern}
          </Text>
        ))}
      </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '12.5%',
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.05,
  },
});
