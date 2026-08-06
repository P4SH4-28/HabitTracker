import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AddFriendModal from '../components/AddFriendModal';
import AvatarCircle from '../components/AvatarCircle';
import { confirmDialog } from '../components/HabitCard';
import PlayerProfileModal from '../components/PlayerProfileModal';
import { useData } from '../context/DataContext';
import { useTheme } from '../theme';

export default function FriendsScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, today, removeFriend } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.screenTitle}>Arkadaşlar</Text>
          <Text style={styles.screenSub}>Arkadaşların liderlik tablosunda da görünür</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Ekle</Text>
        </Pressable>
      </View>
      {data.friends.length > 0 && (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            💡 Arkadaşına dokunarak profilini ziyaret edebilir, gelişimini görebilirsin.
            Uzun basarak silersin. Liderlik tablosundan da arkadaşlık isteği gönderebilirsin.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data.friends}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const activeToday = item.lastActive === today;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => setSelected(item)}
              onLongPress={() =>
                confirmDialog('Arkadaşı sil', `${item.name} silinecek. Emin misin?`, () =>
                  removeFriend(item.name)
                )
              }
            >
              <AvatarCircle
                avatarId={item.avatarId}
                emoji={item.avatarId ? undefined : item.emoji}
                frameId={item.frameId}
                size={44}
              />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>🔥</Text>
                    <Text style={styles.metaText}>{item.streak} gün seri</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>⚡</Text>
                    <Text style={styles.metaText}>{item.totalXp} XP</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.profileChevron}>›</Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: activeToday ? C.accent : C.textMuted },
                ]}
              />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>Henüz arkadaş yok</Text>
            <Text style={styles.emptyText}>
              Arkadaş ekleyerek liderlik tablosunda rekabet etmeye başla. Uzun basarak
              arkadaşını silebilirsin.
            </Text>
          </View>
        }
      />
      <AddFriendModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      {/* Arkadaş profili ziyareti */}
      <PlayerProfileModal
        player={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      gap: 14,
      marginBottom: 6,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    screenTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: '800',
    },
    screenSub: {
      color: C.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    addButton: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    noteBox: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
    },
    noteText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    content: {
      padding: 20,
      gap: 10,
      paddingBottom: 60,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 12,
    },
    profileChevron: {
      color: C.textMuted,
      fontSize: 18,
      fontWeight: '700',
    },
    info: {
      flex: 1,
      gap: 6,
    },
    name: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      gap: 14,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaIcon: {
      fontSize: 12,
    },
    metaText: {
      color: C.textMuted,
      fontSize: 12,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: 50,
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
