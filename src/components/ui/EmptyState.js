// ============================================================
// EmptyState.js — Boş durum ekranı (ikon halkası + metin + aksiyon).
// İkon, zarif glow'lu bir halka içinde IconTile olarak gösterilir.
// ============================================================
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme';
import IconTile from './IconTile';
import SoftButton from './SoftButton';

export default function EmptyState({
  icon,
  emoji,
  name,
  title,
  subtitle,
  actionLabel,
  onAction,
  tint = 'primary',
  compact = false,
  style,
}) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const ringSize = compact ? 76 : 104;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      <View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: C.border,
          },
        ]}
      >
        <IconTile name={name} emoji={emoji || icon} variant={tint} size={compact ? 40 : 52} />
      </View>
      {title ? <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text> : null}
      {subtitle ? (
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
      ) : null}
      {actionLabel ? (
        <SoftButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
      gap: 14,
    },
    wrapCompact: {
      paddingVertical: 20,
      gap: 10,
    },
    ring: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    title: {
      color: C.text,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    titleCompact: {
      fontSize: 15,
    },
    subtitle: {
      color: C.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    subtitleCompact: {
      fontSize: 12.5,
    },
    action: {
      marginTop: 6,
    },
  });
}