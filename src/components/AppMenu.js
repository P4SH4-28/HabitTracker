// ============================================================
// AppMenu — Sol kayar menü (drawer)
// Profil/Çark ikonunun arkasında: Günün Görevleri, Season Pass,
// Ayarlar ve Yönetici Paneli. Tıklanan öğe ilgili ekranı açar
// (root stack navigasyonu). Modal + kayan panel olarak çizilir.
// ============================================================
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useMenu } from '../context/MenuContext';
import AvatarCircle from './AvatarCircle';
import { levelFromTotalXp } from '../logic';
import { useTheme } from '../theme';

const MENU_ITEMS = [
  { key: 'QuestBoard', icon: 'flag', label: 'Günün Görevleri', desc: 'Günlük 4+4 görev' },
  { key: 'SeasonPass', icon: 'ticket', label: 'Season Pass', desc: 'Seviye ödülleri ve VIP' },
  { key: 'Settings', icon: 'settings', label: 'Ayarlar', desc: 'Profil, yedek ve tercihler' },
];

export default function AppMenu() {
  const { visible, closeMenu } = useMenu();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const { data } = useData();

  const levelInfo = levelFromTotalXp(data.stats.totalXp);
  const items = [
    ...MENU_ITEMS,
    ...(authUser?.isAdmin
      ? [{ key: 'Admin', icon: 'shield-checkmark', label: 'Yönetici Paneli', desc: 'Kullanıcı yönetimi' }]
      : []),
  ];

  const go = (key) => {
    closeMenu();
    navigation.navigate(key);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closeMenu}
    >
      <Pressable style={styles.backdrop} onPress={closeMenu}>
        <Pressable style={styles.panel} onPress={() => {}}>
          {/* Üst: profil özeti */}
          <View style={styles.profileRow}>
            <AvatarCircle
              avatarId={data.settings.avatarId}
              frameId={data.settings.frameId}
              size={52}
              ringColor={C.primary}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {authUser?.name || 'Oyuncu'}
              </Text>
              <Text style={styles.profileLevel}>
                Seviye {levelInfo.level} • {data.stats.gold || 0} 🪙
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={closeMenu} hitSlop={8}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Menü öğeleri */}
          <View style={styles.items}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                style={({ pressed }) => [
                  styles.item,
                  pressed && { backgroundColor: C.surfaceLight },
                ]}
                onPress={() => go(item.key)}
              >
                <View style={[styles.itemIcon, { backgroundColor: C.surfaceLight }]}>
                  <Ionicons name={item.icon} size={19} color={C.primary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    panel: {
      width: '78%',
      maxWidth: 340,
      height: '100%',
      backgroundColor: C.surface,
      padding: 18,
      paddingTop: 40,
      gap: 18,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    profileInfo: {
      flex: 1,
      gap: 2,
    },
    profileName: {
      color: C.text,
      fontSize: 16,
      fontWeight: '800',
    },
    profileLevel: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    items: {
      gap: 8,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 14,
      padding: 12,
    },
    itemIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
      gap: 1,
    },
    itemLabel: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
    },
    itemDesc: {
      color: C.textMuted,
      fontSize: 11,
    },
  });
}
