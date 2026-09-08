// ============================================================
// ListRow.js — Premium satır çözümü (IconTile + bilgi + chevron).
// Card tabanlı: tutarlı köşe/kenarlık, dokunulabilir satırlarda
// hafif baskı geri bildirimi + chevron.
// ============================================================
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import Card from '../Card';
import IconTile from './IconTile';

export default function ListRow({
  icon,
  emoji,
  name,
  title,
  subtitle,
  right,
  onPress,
  iconVariant = 'glass',
  style,
  titleStyle,
  selected,
}) {
  const { colors: C } = useTheme();
  return (
    <Card onPress={onPress} style={[styles.card, style]} selected={selected}>
      <IconTile name={name} emoji={emoji || icon} variant={iconVariant} size={40} />
      <Text style={[styles.title, { color: C.text }, titleStyle]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: C.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.rightSlot}>
        {right || (onPress ? <Ionicons name="chevron-forward" size={16} color={C.textMuted} /> : null)}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  rightSlot: {
    marginLeft: 'auto',
  },
});