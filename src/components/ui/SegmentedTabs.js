// ============================================================
// SegmentedTabs.js — Çok sekmeli segmented kontrol.
// "Yumuşatılmış keskin": kapsül track + aktif segment glass; pressFX
// ile yumuşak mikro-etkileşim.
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import PressableFX from '../PressableFX';
import Icon from './icons';

export default function SegmentedTabs({ options, value, onChange, style }) {
  const { colors: C, radius, space } = useTheme();
  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: C.surface,
          borderColor: C.border,
          borderRadius: radius.control,
          padding: space.xs,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <PressableFX
            key={opt.key}
            onPress={() => {
              if (onChange) onChange(opt.key);
            }}
            scale={0.97}
            haptic={false}
            style={[
              styles.seg,
              { borderRadius: radius.control - 2 },
              active && {
                backgroundColor: C.surfaceLight,
                borderWidth: 1,
                borderColor: C.border,
              },
            ]}
          >
            {opt.icon ? (
              <Icon emoji={opt.icon} size={14} color={active ? C.text : C.textMuted} style={styles.icon} />
            ) : null}
            <Text
              style={[
                styles.label,
                { color: active ? C.text : C.textMuted },
              ]}
            >
              {opt.label}
            </Text>
          </PressableFX>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    gap: 6,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 6,
  },
  icon: {
    // gap manages spacing
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});