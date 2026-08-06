import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export default function StatCard({ label, value, icon, color }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: (color || C.primary) + '22' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 6,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      fontSize: 15,
    },
    value: {
      color: C.text,
      fontSize: 20,
      fontWeight: '800',
    },
    label: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
  });
}
