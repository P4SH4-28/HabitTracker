// ============================================================
// icons.js — Premium ikonografi yardımcıları.
// UI'da kullanılan emoji'leri Ionicons adlarına eşler; dönüşüm tek
// yerde tutulur. Emoji bilinmiyorsa (kullanıcı içeriği) emoji olarak
// render edilir — avatar/dükkan/alışkanlık içerikleri bozulmaz.
// ============================================================
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ICON_MAP = {
  '🎯': 'navigate',
  '🔔': 'notifications',
  '🔕': 'notifications-off',
  '🍅': 'timer',
  '🏆': 'trophy',
  '🚀': 'rocket',
  '📡': 'radio',
  '💬': 'chatbubble',
  '⚔': 'flash',
  '💡': 'bulb',
  '📊': 'bar-chart',
  '⚠': 'warning',
  '📋': 'clipboard',
  '🔍': 'search',
  '🎁': 'gift',
  '🎨': 'color-palette',
  '⚖': 'scale',
  '📜': 'document-text',
  '💰': 'cash',
  '🔒': 'lock-closed',
  '✨': 'star',
  '⚡': 'flash',
  '🪙': 'cash',
  '🔥': 'flame',
  '✅': 'checkmark',
  '✓': 'checkmark',
  '❄': 'snow',
  '👋': 'hand-left',
  '🗑': 'trash',
  '📅': 'calendar',
  '📷': 'camera',
  '💍': 'diamond',
  '👁': 'eye',
  '🎤': 'mic',
  '🎒': 'bag-handle',
  '🛍': 'bag',
  '🖼': 'image',
  '🥇': 'medal',
  '🥈': 'medal',
  '🥉': 'medal',
  '🛡': 'shield-checkmark',
  '👤': 'person',
  '🌱': 'leaf',
  '🏃': 'body',
  '🎖': 'medal',
  '💎': 'diamond',
  '👑': 'crown',
  '🕐': 'time',
  '⏳': 'hourglass',
  '▶': 'play',
  '⏸': 'pause',
  '↺': 'refresh',
  '✏': 'create',
  '⛔': 'ban',
  '💪': 'barbell',
  '💧': 'water',
  '📖': 'book',
  '🧘': 'fitness',
};

// Emoji'yi ait olduğu Ionicons adına çevirir (bilinmiyorsa null).
export function iconForEmoji(emoji) {
  return emoji && ICON_MAP[emoji] ? ICON_MAP[emoji] : null;
}

// Evrensel ikon render'ı: `name` (Ionicons) → `emoji` (haritadan eşleme) →
// map'te yoksa emoji içeriğin kendini render et (geriye uyumlu).
export default function Icon({ name, emoji, size = 18, color, style }) {
  const resolved = name || (emoji ? iconForEmoji(emoji) : null);
  if (!resolved) {
    return (
      <Text style={[{ fontSize: size, lineHeight: size * 1.2 }, style]}>{emoji || ''}</Text>
    );
  }
  return <Ionicons name={resolved} size={size} color={color} style={style} />;
}