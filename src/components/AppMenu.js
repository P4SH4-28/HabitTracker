// ============================================================
// AppMenu — Sol kayar menü (drawer)
// Profil/Çark ikonunun arkasında: Günün Görevleri, Season Pass,
// Ayarlar ve Yönetici Paneli. Tıklanan öğe ilgili ekranı açar
// (root stack navigasyonu). Modal + kayan panel olarak çizilir.
// Animasyon: panel soldan kayar, arka plan soluklaşır, öğeler
// sırayla (stagger) belirir; kapanışta tersi akar (smooth).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  { key: 'Inventory', icon: 'cube', label: 'Envanter', desc: 'Eşyalarını kullan' },
  { key: 'Achievements', icon: 'trophy', label: 'Başarımlar', desc: 'Kupa ve ödüller' },
  { key: 'League', icon: 'podium', label: 'Haftalık Ligler', desc: 'Lig rütben ve ödül' },
  { key: 'Team', icon: 'people', label: 'Takımım', desc: 'Kulüp kur veya katıl' },
  { key: 'Settings', icon: 'settings', label: 'Ayarlar', desc: 'Profil, yedek ve tercihler' },
];

const PANEL_WIDTH = 340; // maxWidth ile uyumlu (78% cap)

export default function AppMenu() {
  const { visible, closeMenu } = useMenu();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const { data } = useData();

  // Animasyon değerleri (açılış/kapanış ortak).
  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current; // panel X
  const fade = useRef(new Animated.Value(0)).current; // arka plan opaklığı
  // İlk render'da öğe animasyonları henüz kurulmadıysa kullanılacak sabit.
  const idleItem = useRef(new Animated.Value(1)).current;
  const [itemAnims, setItemAnims] = useState([]);

  const items = useMemo(
    () => [
      ...MENU_ITEMS,
      ...(authUser?.isAdmin
        ? [{ key: 'Admin', icon: 'shield-checkmark', label: 'Yönetici Paneli', desc: 'Kullanıcı yönetimi' }]
        : []),
    ],
    [authUser?.isAdmin]
  );

  const levelInfo = levelFromTotalXp(data.stats.totalXp);

  // Öğe sayısı değişince animasyon değerlerini yeniden kur.
  useEffect(() => {
    setItemAnims((prev) => {
      if (prev.length === items.length) return prev;
      const next = items.map((_, i) => prev[i] || new Animated.Value(0));
      return next;
    });
  }, [items.length]);

  // Açılış animasyonu: panel kayar + öğeler sırayla belirir.
  const openAnim = useCallback(() => {
    fade.setValue(0);
    slide.setValue(-PANEL_WIDTH);
    itemAnims.forEach((a) => a.setValue(0));
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // Öğeler sırayla (stagger): 30ms arayla yukarıdan + opaklık.
    const anims = itemAnims.map((a, i) =>
      Animated.timing(a, {
        toValue: 1,
        duration: 180,
        delay: 60 + i * 30,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.stagger(30, anims).start();
  }, [itemAnims, fade, slide]);

  // Kapanış animasyonu: öğeler söner, panel kayar, sonra modal kapanır.
  const closeAnim = useCallback(
    (onDone) => {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: -PANEL_WIDTH,
          duration: 190,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          closeMenu();
          if (onDone) onDone();
        } else {
          closeMenu();
        }
      });
    },
    [fade, slide, closeMenu]
  );

  useEffect(() => {
    if (visible) openAnim();
  }, [visible, openAnim]);

  const go = (key) => {
    closeAnim(() => navigation.navigate(key));
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => closeAnim()}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeAnim()} />
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX: slide }] },
          ]}
        >
          {/* Üst: profil özeti */}
          <View style={styles.profileRow}>
            <AvatarCircle
              avatarId={data.settings.avatarId}
              frameId={data.settings.frameId}
              photo={data.settings.photoUrl}
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
            <Pressable style={styles.closeBtn} onPress={() => closeAnim()} hitSlop={8}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Menü öğeleri */}
          <View style={styles.items}>
            {items.map((item, i) => {
              const a = itemAnims[i] || idleItem;
              return (
                <Animated.View
                  key={item.key}
                  style={{
                    opacity: a,
                    transform: [
                      {
                        translateY: a.interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Pressable
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
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      flexDirection: 'row',
    },
    panel: {
      width: '78%',
      maxWidth: PANEL_WIDTH,
      height: '100%',
      backgroundColor: C.surface,
      padding: 18,
      paddingTop: 40,
      gap: 18,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 24,
      shadowOffset: { width: 8, height: 0 },
      elevation: 24,
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
