import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme';

// Alt-Sheet — glassmorphism tasarım.
// - Arka plan: ince blur + karartma katmanı
// - Panel: köşe 24, yarı saydam kenarlık, zarif tutma çubuğu
export default function Sheet({ visible, onClose, title, children }) {
  const { colors: C, radius } = useTheme();
  const styles = useMemo(() => makeStyles(C, radius), [C, radius]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={26} tint="dark" style={styles.frost} pointerEvents="none" />
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: C.surfaceLight, borderColor: C.border },
                pressed && { transform: [{ scale: 0.92 }], opacity: 0.8 },
              ]}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(C, radius) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    frost: {
      ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: C.border,
      padding: 20,
      paddingBottom: 36,
      gap: 18,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      color: C.text,
      fontSize: 18,
      fontWeight: '800',
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: radius.chip,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    close: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}