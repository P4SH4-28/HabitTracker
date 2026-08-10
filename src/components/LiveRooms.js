// ============================================================
// LiveRooms — Canlı Pomodoro Odaları (Sosyal sekme)
// Supabase Realtime ile canlı oda listesi: katılımcı sayısı ve
// yeni odalar anında güncellenir. Odalara katıl/ayrıl, kendi
// odanı kur. Yazma işlemleri 'chat-action' Edge Function'ından
// (servis rolü) geçer — anon key ile yazılamaz.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  createRoom,
  fetchRooms,
  joinRoom,
  leaveRoom,
  subscribeRooms,
} from '../services/socialService';
import { serverNow } from '../services/serverClock';
import { useTheme } from '../theme';

function timeAgo(iso) {
  const diff = Math.max(0, (serverNow() - Date.parse(iso)) / 1000);
  if (diff < 60) return 'şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  return `${Math.floor(diff / 86400)} gün önce`;
}

export default function LiveRooms() {
  const { user: authUser } = useAuth();
  const { server } = useData();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const me = authUser?.name || 'Kullanıcı';
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRoom, setMyRoom] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const myRoomRef = useRef(null);

  const applyRooms = useCallback((list, preserveMyRoom = true) => {
    setRooms(list || []);
    if (preserveMyRoom && myRoomRef.current) {
      // Odam silindiyse temizle; aksi halde katılımcı sayısını güncelle.
      const stillThere = (list || []).find((r) => r.id === myRoomRef.current);
      if (!stillThere) {
        myRoomRef.current = null;
        setMyRoom(null);
      }
    }
  }, []);

  // İlk yükleme + Realtime aboneliği.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await fetchRooms();
      if (mounted) {
        applyRooms(r.ok ? r.data?.rooms : []);
        setLoading(false);
      }
    })();
    const unsub = subscribeRooms((room, eventType) => {
      if (!mounted || !room?.id) return;
      setRooms((prev) => {
        if (eventType === 'DELETE' || (eventType === 'UPDATE' && room.participants === 0 && room.host !== me)) {
          return prev.filter((r) => r.id !== room.id);
        }
        const idx = prev.findIndex((r) => r.id === room.id);
        if (idx === -1) return [room, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], ...room };
        return next;
      });
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [applyRooms, me]);

  const handleJoin = async (room) => {
    if (busyId) return;
    setBusyId(room.id);
    setError(null);
    const r = await joinRoom(me, room.id);
    setBusyId(null);
    if (r.ok) {
      myRoomRef.current = room.id;
      setMyRoom(room.id);
      const refreshed = await fetchRooms();
      if (refreshed.ok) applyRooms(refreshed.data?.rooms);
    } else {
      setError(r.error === 'room_not_found' ? 'Oda artık yok' : 'Odaya katılınamadı');
    }
  };

  const handleLeave = async (roomId) => {
    if (busyId) return;
    setBusyId(roomId);
    setError(null);
    const r = await leaveRoom(me, roomId);
    setBusyId(null);
    if (r.ok) {
      myRoomRef.current = null;
      setMyRoom(null);
      const refreshed = await fetchRooms();
      if (refreshed.ok) applyRooms(refreshed.data?.rooms);
    } else {
      setError('Odadan ayrılamadı');
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (name.length < 2 || busyId) return;
    setBusyId('create');
    setError(null);
    const r = await createRoom(me, name);
    setBusyId(null);
    if (r.ok) {
      setNewName('');
      const room = r.data?.room;
      if (room) {
        myRoomRef.current = room.id;
        setMyRoom(room.id);
      }
      const refreshed = await fetchRooms();
      if (refreshed.ok) applyRooms(refreshed.data?.rooms);
    } else {
      setError(r.error === 'invalid_room_name' ? 'Oda adı 2-40 karakter olmalı' : 'Oda kurulamadı');
    }
  };

  const renderRoom = ({ item }) => {
    const isMine = myRoom === item.id;
    return (
      <View style={[styles.room, { borderColor: isMine ? C.primary + '66' : C.border }]}>
        <View style={styles.roomEmojiWrap}>
          <Text style={styles.roomEmoji}>🍅</Text>
        </View>
        <View style={styles.roomInfo}>
          <View style={styles.roomTitleRow}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.name}
            </Text>
            {isMine && (
              <View style={[styles.mineChip, { backgroundColor: C.primary + '22' }]}>
                <Text style={[styles.mineChipText, { color: C.primary }]}>İçindesin</Text>
              </View>
            )}
          </View>
          <Text style={styles.roomMeta}>
            {item.host === me ? 'Senin odan' : `Kurucu: ${item.host}`} • {timeAgo(item.last_active_at)}
          </Text>
        </View>
        <View style={styles.roomSide}>
          <View style={[styles.liveDot, { backgroundColor: item.participants > 0 ? '#3DDC84' : C.textMuted }]} />
          <Text style={styles.participants}>{item.participants}</Text>
          {busyId === item.id ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : isMine ? (
            <Pressable style={styles.leaveBtn} onPress={() => handleLeave(item.id)}>
              <Text style={styles.leaveBtnText}>Ayrıl</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.joinBtn, { backgroundColor: C.primary }]}
              onPress={() => handleJoin(item)}
              disabled={!!busyId}
            >
              <Text style={[styles.joinBtnText, { color: C.onPrimary }]}>Katıl</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Yeni oda kur */}
      <View style={styles.createRow}>
        <TextInput
          style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
          placeholder="Oda adı (örn: Sabah Odak Grubu)"
          placeholderTextColor={C.textMuted}
          value={newName}
          onChangeText={setNewName}
          maxLength={40}
        />
        <Pressable
          style={[styles.createBtn, { backgroundColor: C.accent }, (newName.trim().length < 2 || busyId) && styles.disabled]}
          onPress={handleCreate}
          disabled={newName.trim().length < 2 || !!busyId}
        >
          {busyId === 'create' ? (
            <ActivityIndicator size="small" color={C.background} />
          ) : (
            <Text style={[styles.createBtnText, { color: C.background }]}>Oluştur</Text>
          )}
        </Pressable>
      </View>

      {error && (
        <Text style={[styles.error, { color: C.danger }]}>{error}</Text>
      )}

      {server.connected === false && (
        <Text style={[styles.offline, { color: C.textMuted }]}>
          📡 Çevrimdışısın — canlı odalar sunucu bağlantısı ister.
        </Text>
      )}

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Canlı Odalar</Text>
            <View style={[styles.countChip, { backgroundColor: C.surface }]}>
              <Text style={[styles.countText, { color: C.textMuted }]}>{rooms.length} oda</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.emptyLoad} size="large" color={C.primary} />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🍅</Text>
              <Text style={styles.emptyTitle}>Şu an aktif oda yok</Text>
              <Text style={styles.emptyText}>
                İlk odayı sen kur — arkadaşların katılıp birlikte odaklanabilsin!
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    createRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      fontWeight: '600',
    },
    createBtn: {
      borderRadius: 12,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    createBtnText: {
      fontSize: 13,
      fontWeight: '800',
    },
    disabled: {
      opacity: 0.5,
    },
    error: {
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    offline: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    listContent: {
      padding: 16,
      gap: 10,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    countChip: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
    },
    room: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      padding: 12,
    },
    roomEmojiWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: C.danger + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    roomEmoji: {
      fontSize: 20,
    },
    roomInfo: {
      flex: 1,
      gap: 2,
    },
    roomTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    roomName: {
      color: C.text,
      fontSize: 14,
      fontWeight: '800',
      flexShrink: 1,
    },
    mineChip: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    mineChipText: {
      fontSize: 9,
      fontWeight: '800',
    },
    roomMeta: {
      color: C.textMuted,
      fontSize: 11,
    },
    roomSide: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    participants: {
      color: C.text,
      fontSize: 13,
      fontWeight: '800',
    },
    joinBtn: {
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    joinBtnText: {
      fontSize: 11,
      fontWeight: '800',
    },
    leaveBtn: {
      borderRadius: 9,
      backgroundColor: C.surfaceLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    leaveBtnText: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '800',
    },
    emptyLoad: {
      marginTop: 40,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
    emptyEmoji: {
      fontSize: 44,
      marginBottom: 12,
    },
    emptyTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptyText: {
      color: C.textMuted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
