// ============================================================
// ShopScreen — "Dükkan" sekmesi
// Altın (🪙) ile yeni avatar/profil fotoğrafları satın alırsın.
// - Altın: alışkanlık tamamla (+5), odak seansı bitir (+15),
//   başarım aç (+25..250) ile kazanılır.
// - Satın alınan avatarlar "Sahip" listesine eklenir; "Seç" ile
//   aktif profil fotoğrafın olur (Bugün ekranı ve liderlikte görünür).
// ============================================================
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AvatarCircle, { FrameDecor } from '../components/AvatarCircle';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { FRAMES, getShopItem, SHOP_ITEMS } from '../data/shop';
import { ITEMS } from '../data/items';
import { pickProfilePhoto, removeProfilePhoto, uploadProfilePhoto } from '../services/avatarService';
import { THEMES, useTheme } from '../theme';

export default function ShopScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const { data, buyAvatar, selectAvatar, buyTheme, selectTheme, buyFrame, selectFrame, buyItem, vipActive, setProfilePhoto } = useData();
  const [photoBusy, setPhotoBusy] = useState(false);
  const gold = data.stats.gold || 0;
  const ownedAvatars = data.ownedAvatars || [];
  const ownedThemes = data.ownedThemes || [];
  const ownedFrames = data.ownedFrames || [];
  const inventory = data.inventory || {};
  const currentAvatar = data.settings.avatarId || 'av_fox';
  const currentItem = getShopItem(currentAvatar);
  const currentThemeId = data.settings.themeId || 'dark';
  const currentFrameId = data.settings.frameId || null;
  const photoUrl = data.settings.photoUrl || null;
  const username = data.settings.username || authUser?.name || 'kullanici';
  // VIP çerçeveler yalnızca aktif VIP kullanıcılara gösterilir.
  const shopFrames = FRAMES.filter((f) => !f.vip || vipActive);

  const pickAndUpload = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    const picked = await pickProfilePhoto();
    if (!picked.ok) {
      if (!picked.canceled) alert(picked.error || 'Fotoğraf seçilemedi');
      setPhotoBusy(false);
      return;
    }
    const uploaded = await uploadProfilePhoto(username, picked.uri);
    if (!uploaded.ok) {
      alert(uploaded.error || 'Yükleme başarısız');
      setPhotoBusy(false);
      return;
    }
    setProfilePhoto(uploaded.photoUrl);
    setPhotoBusy(false);
  };

  const removePhoto = async () => {
    await removeProfilePhoto(username);
    setProfilePhoto(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.screenTitle}>Dükkan</Text>
          <Text style={styles.screenSub}>Eşyalar, avatarlar, çerçeveler ve temalar</Text>
        </View>
        {/* Altın bakiyesi */}
        <View style={styles.balanceChip}>
          <Text style={styles.balanceIcon}>🪙</Text>
          <Text style={styles.balanceText}>{gold}</Text>
        </View>
      </View>

      {/* Aktif profil fotoğrafı */}
      <View style={styles.currentCard}>
        <AvatarCircle
          avatarId={currentAvatar}
          frameId={currentFrameId}
          photo={photoUrl}
          size={84}
          ringColor={C.gold}
        />
        <View style={styles.currentInfo}>
          <Text style={styles.currentLabel}>AKTİF PROFİL FOTOĞRAFIN</Text>
          <Text style={styles.currentName}>{currentItem?.name || 'Avatar'}</Text>
          <Text style={styles.currentHint}>
            Bugün ekranında ve liderlikte bu avatar görünür.
          </Text>
        </View>
      </View>

      {/* Profil fotoğrafı eylemleri */}
      <View style={styles.photoRow}>
        <Pressable
          style={[styles.photoBtn, { backgroundColor: C.primary }]}
          onPress={pickAndUpload}
          disabled={photoBusy}
        >
          <Text style={styles.photoBtnText}>
            {photoBusy ? '⏳ Yükleniyor…' : photoUrl ? '📷 Fotoğrafı Değiştir' : '📷 Fotoğraf Yükle'}
          </Text>
        </Pressable>
        {photoUrl ? (
          <Pressable style={[styles.photoBtn, { backgroundColor: C.surfaceLight }]} onPress={removePhoto}>
            <Text style={styles.photoBtnMuted}>Kaldır</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.photoBtn, { backgroundColor: C.surfaceLight }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.photoBtnMuted}>Profili Düzenle</Text>
          </Pressable>
        )}
      </View>

      {/* Nasıl altın kazanılır? */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>🪙 Altın nasıl kazanılır?</Text>
        <View style={styles.howRow}>
          <Text style={styles.howItem}>✅ Alışkanlık tamamla +5</Text>
          <Text style={styles.howItem}>🍅 Odak seansı bitir +15</Text>
          <Text style={styles.howItem}>🏆 Başarım aç +25..250</Text>
          <Text style={styles.howItem}>🎯 Günlük görevler +20..150</Text>
        </View>
      </View>

      {/* Eşya ızgarası (tüketilebilirler) */}
      <Text style={styles.sectionTitle}>Eşyalar</Text>
      <View style={styles.grid}>
        {ITEMS.map((item) => {
          const count = inventory[item.id] || 0;
          const affordable = gold >= item.price;
          return (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemDesc} numberOfLines={3}>
                {item.desc}
              </Text>
              <Pressable
                style={[
                  styles.itemBtn,
                  styles.btnBuy,
                  !affordable && styles.btnDisabled,
                ]}
                disabled={!affordable}
                onPress={() => buyItem(item.id)}
              >
                <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                  🪙 {item.price}
                </Text>
              </Pressable>
              <Text style={styles.ownedCount}>{count} adetin var</Text>
            </View>
          );
        })}
      </View>

      {/* Tema ızgarası */}
      <Text style={styles.sectionTitle}>Temalar</Text>
      <View style={styles.grid}>
        {THEMES.map((theme) => {
          const isOwned = ownedThemes.includes(theme.id);
          const isSelected = currentThemeId === theme.id;
          const affordable = gold >= theme.price;
          const tColors = { ...C, ...theme.colors };
          return (
            <View key={theme.id} style={styles.itemCard}>
              {/* Tema önizlemesi: renk örnekleri + desen */}
              <View style={[styles.themePreview, { backgroundColor: tColors.background }]}>
                <View style={[styles.themeSwatch, { backgroundColor: tColors.surface }]}>
                  <View style={[styles.themeDot, { backgroundColor: tColors.primary }]} />
                  <View style={[styles.themeDot, { backgroundColor: tColors.accent }]} />
                </View>
                <Text style={styles.themePattern}>{theme.pattern || theme.emoji}</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={1}>
                {theme.emoji} {theme.name}
              </Text>
              {isSelected ? (
                <View style={[styles.itemBtn, styles.btnSelected]}>
                  <Text style={styles.btnSelectedText}>✓ Seçili</Text>
                </View>
              ) : isOwned ? (
                <Pressable
                  style={[styles.itemBtn, styles.btnOwned]}
                  onPress={() => selectTheme(theme.id)}
                >
                  <Text style={styles.btnOwnedText}>Uygula</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.itemBtn,
                    styles.btnBuy,
                    !affordable && styles.btnDisabled,
                  ]}
                  disabled={!affordable}
                  onPress={() => buyTheme(theme.id)}
                >
                  <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                    🪙 {theme.price}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {/* Avatar ızgarası */}
      <Text style={styles.sectionTitle}>Profil Avatarları</Text>
      <View style={styles.grid}>
        {SHOP_ITEMS.map((item) => {
          const isOwned = ownedAvatars.includes(item.id);
          const isSelected = currentAvatar === item.id;
          const affordable = gold >= item.price;
          return (
            <View key={item.id} style={styles.itemCard}>
              <AvatarCircle
                avatarId={item.id}
                size={64}
                ringColor={isSelected ? C.gold : C.border}
              />
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              {isSelected ? (
                <View style={[styles.itemBtn, styles.btnSelected]}>
                  <Text style={styles.btnSelectedText}>✓ Seçili</Text>
                </View>
              ) : isOwned ? (
                <Pressable
                  style={[styles.itemBtn, styles.btnOwned]}
                  onPress={() => selectAvatar(item.id)}
                >
                  <Text style={styles.btnOwnedText}>Seç</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.itemBtn,
                    styles.btnBuy,
                    !affordable && styles.btnDisabled,
                  ]}
                  disabled={!affordable}
                  onPress={() => buyAvatar(item.id)}
                >
                  <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                    🪙 {item.price}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {/* Çerçeve ızgarası */}
      <Text style={styles.sectionTitle}>Avatar Çerçeveleri</Text>
      <View style={styles.grid}>
        {shopFrames.map((frame) => {
          const isOwned = ownedFrames.includes(frame.id);
          const isSelected = currentFrameId === frame.id;
          const affordable = gold >= frame.price;
          return (
            <View key={frame.id} style={styles.itemCard}>
              {frame.lottie ? (
                // Lottie çerçeve: canlı animasyonlu aura önizlemesi
                <AvatarCircle
                  avatarId={currentAvatar}
                  frameId={frame.id}
                  size={64}
                  ringColor={isSelected ? C.gold : C.border}
                />
              ) : (
                <FrameDecor ring={frame.emoji} size={64}>
                  <View style={styles.frameAvatar}>
                    <Text style={styles.frameAvatarEmoji}>
                      {currentItem?.emoji || '😀'}
                    </Text>
                  </View>
                </FrameDecor>
              )}
              <Text style={styles.itemName} numberOfLines={1}>
                {frame.vip ? '👑 ' : ''}{frame.name}
              </Text>
              {isSelected ? (
                <View style={[styles.itemBtn, styles.btnSelected]}>
                  <Text style={styles.btnSelectedText}>✓ Seçili</Text>
                </View>
              ) : isOwned ? (
                <Pressable
                  style={[styles.itemBtn, styles.btnOwned]}
                  onPress={() => selectFrame(frame.id)}
                >
                  <Text style={styles.btnOwnedText}>Seç</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.itemBtn,
                    styles.btnBuy,
                    !affordable && styles.btnDisabled,
                  ]}
                  disabled={!affordable}
                  onPress={() => buyFrame(frame.id)}
                >
                  <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                    {frame.price > 0 ? `🪙 ${frame.price}` : '👑 VIP'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      {!vipActive && (
        <View style={styles.vipHint}>
          <Text style={styles.vipHintText}>
            👑 Aurora çerçeveler Season Pass'te seni bekliyor — VIP olarak
            hepsini açabilirsin!
          </Text>
        </View>
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 İpucu: Örnek veriyi kullanırken tamamladığın alışkanlıklar da altın
          kazandırır — dükkanda hemen yeni avatar, çerçeve ve temalar açabilirsin!
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 60,
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
    balanceChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.gold + '66',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    balanceIcon: {
      fontSize: 16,
    },
    balanceText: {
      color: C.gold,
      fontSize: 16,
      fontWeight: '800',
    },
    currentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.gold + '55',
      padding: 16,
    },
    currentInfo: {
      flex: 1,
      gap: 4,
    },
    currentLabel: {
      color: C.gold,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    currentName: {
      color: C.text,
      fontSize: 18,
      fontWeight: '800',
    },
    currentHint: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    photoRow: {
      flexDirection: 'row',
      gap: 10,
    },
    photoBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    photoBtnText: {
      color: C.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    photoBtnMuted: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
    howCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 8,
    },
    howTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
    howRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    howItem: {
      color: C.textMuted,
      fontSize: 11,
      backgroundColor: C.background,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    itemCard: {
      width: '48%',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      padding: 14,
      gap: 8,
    },
    themePreview: {
      width: 72,
      height: 72,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeSwatch: {
      flexDirection: 'row',
      gap: 5,
      borderRadius: 8,
      padding: 5,
    },
    themeDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    themePattern: {
      fontSize: 16,
      marginTop: 4,
    },
    frameAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    frameAvatarEmoji: {
      fontSize: 30,
    },
    itemName: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
    itemDesc: {
      color: C.textMuted,
      fontSize: 11,
      lineHeight: 15,
      minHeight: 45,
    },
    itemEmoji: {
      fontSize: 34,
    },
    ownedCount: {
      color: C.textMuted,
      fontSize: 10,
    },
    itemBtn: {
      width: '100%',
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    btnSelected: {
      backgroundColor: C.gold + '22',
      borderWidth: 1,
      borderColor: C.gold,
    },
    btnSelectedText: {
      color: C.gold,
      fontSize: 12,
      fontWeight: '800',
    },
    btnOwned: {
      backgroundColor: C.primary + '22',
    },
    btnOwnedText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    btnBuy: {
      backgroundColor: C.surfaceLight,
    },
    btnBuyText: {
      color: C.gold,
      fontSize: 12,
      fontWeight: '800',
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnDisabledText: {
      color: C.textMuted,
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
    vipHint: {
      backgroundColor: C.gold + '1a',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.gold + '55',
      padding: 14,
    },
    vipHintText: {
      color: C.text,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
