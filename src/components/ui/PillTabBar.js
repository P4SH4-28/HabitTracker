// ============================================================
// PillTabBar — Premium oyun tab bar (Linear/Vercel tarzı).
// Bottom-tabs navigator'ına `tabBar` olarak bağlanır.
// - Yüzen kapsül form: blur zemin + ince border + indigo glow
// - Aktif sekme: indigo→violet gradient dolu pill, beyaz ikon/etiket
// - İnaktif sekmeler: outline ikon + soluk etiket, press'te mikro scale
// - İkonlar hâlâ ekranOptions.tabBarIcon'tan gelir (kilit liderlik
//   ikonu mantığı dahil burada korunur).
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import PressableFX from '../PressableFX';

export default function PillTabBar({ state, descriptors, navigation }) {
  const { colors: C, radius, glow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingLeft: insets.left + 13,
          paddingRight: insets.right + 13,
          paddingBottom: Math.max(insets.bottom, 12) + 4,
        },
      ]}
    >
      <BlurView intensity={70} tint="dark" style={styles.bar}>
        <View style={styles.barInner}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? Array.isArray(options.tabBarLabel) || typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : options.tabBarLabel.toString()
                : options.title != null
                  ? options.title
                  : route.name;
            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const color = focused ? '#FFFFFF' : C.textMuted;
            const glyph = options.tabBarIcon
              ? options.tabBarIcon({ focused, color, size: 18 })
              : null;

            return (
              <PressableFX
                key={route.key}
                onPress={onPress}
                scale={0.93}
                style={styles.itemWrap}
              >
                {focused ? (
                  <LinearGradient
                    colors={[C.primary, C.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.item, glow(C.primary, { opacity: 0.4, radius: 14, offset: 3 })]}
                  >
                    <View style={styles.itemInner}>{glyph}</View>
                    <Text style={[styles.label, { color: '#FFFFFF' }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.item}>
                    <View style={styles.itemInner}>{glyph}</View>
                    <Text style={[styles.label, { color: C.textMuted }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                )}
              </PressableFX>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  bar: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(16,18,26,0.82)',
    overflow: 'hidden',
  },
  barInner: {
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  itemWrap: {
    flex: 1,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 20,
    gap: 2,
  },
  itemInner: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
  },
});