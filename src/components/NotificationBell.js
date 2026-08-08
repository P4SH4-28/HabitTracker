import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';
import AvatarCircle from './AvatarCircle';
import Sheet from './Sheet';

// Home üst satırındaki bildirim zili: gelen arkadaşlık isteklerini
// rozetle gösterir; açınca Onayla/Reddet listesi çıkar.
export default function NotificationBell() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { server, acceptRequest, declineRequest } = useData();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(null);
  const count = server.requests?.length || 0;

  const onAccept = async (id) => {
    setBusy(id);
    await acceptRequest(id);
    setBusy(null);
  };

  const onDecline = async (id) => {
    setBusy(id);
    await declineRequest(id);
    setBusy(null);
  };

  return (
    <>
      <Pressable style={styles.bellWrap} onPress={() => setVisible(true)} hitSlop={8}>
        <Text style={styles.bell}>🔔</Text>
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </Pressable>

      <Sheet visible={visible} onClose={() => setVisible(false)} title="Gelen İstekler">
        {count === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🔕</Text>
            <Text style={styles.emptyText}>Bekleyen istek yok</Text>
            <Text style={styles.emptySub}>
              Birisi sana istek gönderince burada görünür.
            </Text>
          </View>
        ) : (
          server.requests.map((r) => (
            <View key={r.requestId} style={styles.row}>
              <AvatarCircle
                avatarId={r.avatarId}
                emoji={r.avatarId ? undefined : r.emoji}
                frameId={r.frameId}
                size={40}
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.rowMeta}>
                  🔥 {r.streak} • ⚡ {r.totalXp} XP
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.acceptButton, busy === r.requestId && styles.disabled]}
                  onPress={() => onAccept(r.requestId)}
                  disabled={busy === r.requestId}
                >
                  <Text style={styles.acceptText}>Onayla</Text>
                </Pressable>
                <Pressable
                  style={[styles.declineButton, busy === r.requestId && styles.disabled]}
                  onPress={() => onDecline(r.requestId)}
                  disabled={busy === r.requestId}
                >
                  <Text style={styles.declineText}>Reddet</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </Sheet>
    </>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    bellWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    bell: {
      fontSize: 18,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 6,
    },
    emptyEmoji: {
      fontSize: 34,
    },
    emptyText: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    emptySub: {
      color: C.textMuted,
      fontSize: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    rowName: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    rowMeta: {
      color: C.textMuted,
      fontSize: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
    },
    acceptButton: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    acceptText: {
      color: C.onPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    declineButton: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    declineText: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '800',
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
