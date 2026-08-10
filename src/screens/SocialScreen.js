// ============================================================
// SocialScreen — "Sosyal" sekmesi
// Üst sekmelerle (Top Tabs) üç bölüm: Arkadaşlar (eski arkadaş
// ekranı), Canlı Pomodoro Odaları ve Genel Sohbet. Sekmeler
// hafif segment kontrollü özel bir tab bar ile çizilir (ekstra
// navigasyon bağımlılığı gerekmez).
// ============================================================
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FriendsScreen from './FriendsScreen';
import LiveRooms from '../components/LiveRooms';
import ChatTab from '../components/ChatTab';
import { useTheme } from '../theme';

const TABS = [
  { key: 'friends', label: 'Arkadaşlar', emoji: '👥' },
  { key: 'rooms', label: 'Canlı Odalar', emoji: '🍅' },
  { key: 'chat', label: 'Genel Sohbet', emoji: '💬' },
];

export default function SocialScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [tab, setTab] = useState('friends');

  return (
    <View style={styles.container}>
      {/* Üst sekmeler */}
      <View style={[styles.tabBar, { backgroundColor: C.surface }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && { backgroundColor: C.primary + '22' }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, active ? { color: C.primary } : { color: C.textMuted }]}>
                {t.emoji} {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Aktif sekme içeriği */}
      <View style={styles.content}>
        {tab === 'friends' && <FriendsScreen />}
        {tab === 'rooms' && <LiveRooms />}
        {tab === 'chat' && <ChatTab />}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    tab: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 8,
      alignItems: 'center',
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '800',
    },
    content: {
      flex: 1,
    },
  });
}
