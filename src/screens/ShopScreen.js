// ============================================================
// ShopScreen — "Dükkan" sekmesi
// Altın (🪙) ile yeni avatar/profil fotoğrafları satın alırsın.
// - Altın: alışkanlık tamamla (+5), odak seansı bitir (+15),
//   başarım aç (+25..250) ile kazanılır.
// - Satın alınan avatarlar "Sahip" listesine eklenir; "Seç" ile
//   aktif profil fotoğrafın olur (Bugün ekranı ve liderlikte görünür).
// GUI modernizasyonu (Faz B):
//   - Sekmeli yapı: Eşyalar · Avatarlar · Çerçeveler · Temalar
//   - Sahip olduğun ürünlerde "✓" rozeti
//   - Tema kartına dokununca CANLI önizleme paneli (mini ekran mock'u)
//   - Satın alımda toast + haptic geri bildirim
//   - Balance bakiyesi animasyonlu sayaçta
// ============================================================
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AnimatedCounter from '../components/AnimatedCounter';
import AvatarCircle, { FrameDecor } from '../components/AvatarCircle';
import memoizedAvatarCircle from '../components/memoizedAvatarCircle';
import PressableFX from '../components/PressableFX';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { FRAMES, getShopItem, SHOP_ITEMS } from '../data/shop';
import { ITEMS } from '../data/items';
import { pickProfilePhoto, removeProfilePhoto, uploadProfilePhoto } from '../services/avatarService';
import { success } from '../services/sfx';
import { THEMES, useTheme } from '../theme';

const TABS = [
  { key: 'items', label: '🎒 Eşyalar' },
  { key: 'avatars', label: '🧑‍🎤 Avatarlar' },
  { key: 'frames', label: '💍 Çerçeveler' },
  { key: 'themes', label: '🎨 Temalar' },
];

export default function ShopScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation();
  const { user: authUser } = useAuth();
  const {
    data,
    buyAvatar,
    selectAvatar,
    buyTheme,
    selectTheme,
    buyFrame,
    selectFrame,
    buyItem,
    vipActive,
    setProfilePhoto,
    pushToast,
  } = useData();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [tab, setTab] = useState('items');
  const [previewThemeId, setPreviewThemeId] = useState(data.settings.themeId || 'dark');

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
  // Canlı önizlenen tema (varsayılan: aktif tema).
  const activeTheme =
    THEMES.find((t) => t.id === previewThemeId) || THEMES.find((t) => t.id === currentThemeId) || THEMES[0];

  // Satın alma bildirimi: toast + haptic geri bildirim.
  const notifyBuy = useCallback(
    (name) => {
      success();
      pushToast({ icon: '🛍️', title: `${name} satın alındı!`, color: C.gold });
    },
    [C.gold, pushToast]
  );

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
          <AnimatedCounter value={gold} style={styles.balanceText} />
        </View>
      </View>

      {/* Sekme çubuğu */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <PressableFX
              key={t.key}
              style={[styles.tabChip, active && { backgroundColor: C.primary }]}
              haptic
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{t.label}</Text>
            </PressableFX>
          );
        })}
      </ScrollView>

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
        <PressableFX
          style={[styles.photoBtn, { backgroundColor: C.primary }]}
          onPress={pickAndUpload}
          disabled={photoBusy}
        >
          <Text style={styles.photoBtnText}>
            {photoBusy ? '⏳ Yükleniyor…' : photoUrl ? '📷 Fotoğrafı Değiştir' : '📷 Fotoğraf Yükle'}
          </Text>
        </PressableFX>
        {photoUrl ? (
          <PressableFX style={[styles.photoBtn, { backgroundColor: C.surfaceLight }]} onPress={removePhoto}>
            <Text style={styles.photoBtnMuted}>Kaldır</Text>
          </PressableFX>
        ) : (
          <PressableFX
            style={[styles.photoBtn, { backgroundColor: C.surfaceLight }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.photoBtnMuted}>Profili Düzenle</Text>
          </PressableFX>
        )}
      </View>

      {/* ---------- EŞYALAR SEKMESİ ---------- */}
      {tab === 'items' && (
        <>
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
                  <PressableFX
                    style={[styles.itemBtn, styles.btnBuy, !affordable && styles.btnDisabled]}
                    disabled={!affordable}
                    onPress={() => {
                      buyItem(item.id);
                      notifyBuy(item.name);
                    }}
                  >
                    <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                      🪙 {item.price}
                    </Text>
                  </PressableFX>
                  <Text style={styles.ownedCount}>{count} adetin var</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              💡 İpucu: Tamamladığın alışkanlıklar da altın kazandırır — dükkanda hemen
              yeni avatar, çerçeve ve temalar açabilirsin!
            </Text>
          </View>
        </>
      )}

      {/* ---------- AVATARLAR SEKMESİ ---------- */}
      {tab === 'avatars' && (
        <>
          <Text style={styles.sectionTitle}>Profil Avatarları</Text>
          <View style={styles.grid}>
            {SHOP_ITEMS.map((item) => {
              const isOwned = ownedAvatars.includes(item.id);
              const isSelected = currentAvatar === item.id;
              const affordable = gold >= item.price;
              return (
                <View style={styles.itemCard} key={item.id}>
                  <memoizedAvatarCircle
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
                    <PressableFX
                      style={[styles.itemBtn, styles.btnOwned]}
                      onPress={() => selectAvatar(item.id)}
                    >
                      <Text style={styles.btnOwnedText}>Seç</Text>
                    </PressableFX>
                  ) : (
                    <PressableFX
                      style={[styles.itemBtn, styles.btnBuy, !affordable && styles.btnDisabled]}
                      disabled={!affordable}
                      onPress={() => {
                        buyAvatar(item.id);
                        notifyBuy(item.name);
                      }}
                    >
                      <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                        🪙 {item.price}
                      </Text>
                    </PressableFX>
                  )}
                  {isOwned && !isSelected && <OwnedBadge />}
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ---------- ÇERÇEVELER SEKMESİ ---------- */}
      {tab === 'frames' && (
        <>
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
                    <memoizedAvatarCircle
                      avatarId={currentAvatar}
                      frameId={frame.id}
                      size={64}
                      ringColor={isSelected ? C.gold : C.border}
                    />
                  ) : (
                    <FrameDecor ring={frame.emoji} size={64}>
                      <View style={styles.frameAvatar}>
                        <Text style={styles.frameAvatarEmoji}>{currentItem?.emoji || '😀'}</Text>
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
                    <PressableFX
                      style={[styles.itemBtn, styles.btnOwned]}
                      onPress={() => selectFrame(frame.id)}
                    >
                      <Text style={styles.btnOwnedText}>Seç</Text>
                    </PressableFX>
                  ) : (
                    <PressableFX
                      style={[styles.itemBtn, styles.btnBuy, !affordable && styles.btnDisabled]}
                      disabled={!affordable}
                      onPress={() => {
                        buyFrame(frame.id);
                        notifyBuy(frame.name);
                      }}
                    >
                      <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
                        {frame.price > 0 ? `🪙 ${frame.price}` : '👑 VIP'}
                      </Text>
                    </PressableFX>
                  )}
                  {isOwned && !isSelected && <OwnedBadge />}
                </View>
              );
            })}
          </View>
          {!vipActive && (
            <View style={styles.vipHint}>
              <Text style={styles.vipHintText}>
                👑 Aurora çerçeveler Season Pass'te seni bekliyor — VIP olarak hepsini
                açabilirsin!
              </Text>
            </View>
          )}
        </>
      )}

      {/* ---------- TEMALAR SEKMESİ ---------- */}
      {tab === 'themes' && (
        <>
          <Text style={styles.sectionTitle}>Temalar</Text>

          {/* Canlı önizleme paneli: karttaki renk örneğine dokununca güncellenir */}
          {activeTheme && (
            <ThemePreview
              C={C}
              styles={styles}
              theme={activeTheme}
              isSelected={currentThemeId === activeTheme.id}
              isOwned={ownedThemes.includes(activeTheme.id)}
              affordable={gold >= activeTheme.price}
              gold={gold}
              onSelect={() => selectTheme(activeTheme.id)}
              onBuy={() => {
                buyTheme(activeTheme.id);
                notifyBuy(activeTheme.name);
              }}
            />
          )}

          <View style={styles.grid}>
            {THEMES.map((theme) => {
              const isOwned = ownedThemes.includes(theme.id);
              const isSelected = currentThemeId === theme.id;
              const active = previewThemeId === theme.id;
              return (
                <View
                  key={theme.id}
                  style={[
                    styles.itemCard,
                    active && { borderColor: C.primary, borderWidth: 2 },
                  ]}
                >
                  <PressableFX
                    style={[styles.themePreview, { backgroundColor: theme.colors.background }]}
                    haptic
                    onPress={() => setPreviewThemeId(theme.id)}
                  >
                    <View
                      style={[styles.themeSwatch, { backgroundColor: theme.colors.surface }]}
                    >
                      <View style={[styles.themeDot, { backgroundColor: theme.colors.primary }]} />
                      <View style={[styles.themeDot, { backgroundColor: theme.colors.accent }]} />
                    </View>
                    <Text style={styles.themePattern}>{theme.pattern || theme.emoji}</Text>
                  </PressableFX>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {theme.emoji} {theme.name}
                  </Text>
                  <Text style={styles.previewHint}>{active ? '👁 önizleniyor' : 'dokun → önizle'}</Text>
                  {isSelected ? (
                    <View style={[styles.itemBtn, styles.btnSelected]}>
                      <Text style={styles.btnSelectedText}>✓ Seçili</Text>
                    </View>
                  ) : isOwned ? (
                    <PressableFX
                      style={[styles.itemBtn, styles.btnOwned]}
                      onPress={() => selectTheme(theme.id)}
                    >
                      <Text style={styles.btnOwnedText}>Uygula</Text>
                    </PressableFX>
                  ) : (
                    <PressableFX
                      style={[styles.itemBtn, styles.btnBuy, !(gold >= theme.price) && styles.btnDisabled]}
                      disabled={!(gold >= theme.price)}
                      onPress={() => {
                        buyTheme(theme.id);
                        notifyBuy(theme.name);
                      }}
                    >
                      <Text
                        style={[
                          styles.btnBuyText,
                          !(gold >= theme.price) && styles.btnDisabledText,
                        ]}
                      >
                        🪙 {theme.price}
                      </Text>
                    </PressableFX>
                  )}
                  {isOwned && !isSelected && <OwnedBadge />}
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Küçük "sahip" rozeti: kartın sağ üst köşesine yerleştirilir.
function OwnedBadge() {
  const { colors: C } = useTheme();
  return (
    <View style={[stylesConf.ownedBadge, { backgroundColor: C.primary }]}>
      <Text style={stylesConf.ownedBadgeText}>✓</Text>
    </View>
  );
}

// Canlı tema önizleme paneli: seçilen temanın renkleriyle mini bir
// "ana ekran" mock'u çizer; uygula/satın al işlemleri de buradan yapılır.
function ThemePreview({ C, styles, theme, isSelected, isOwned, affordable, onSelect, onBuy }) {
  const t = { ...C, ...theme.colors };
  return (
    <View
      style={[
        styles.previewPanel,
        { backgroundColor: t.background, borderColor: t.primary + '55' },
      ]}
    >
      <View style={[styles.previewTop, { backgroundColor: t.surface }]}>
        <View style={styles.previewTopText}>
          <Text style={[styles.previewTitle, { color: t.text }]}>
            {theme.emoji} {theme.name}
          </Text>
          <Text style={[styles.previewSub, { color: t.textMuted }]}>Canlı önizleme</Text>
        </View>
        <View style={[styles.previewAvatar, { backgroundColor: t.surfaceLight, borderColor: t.primary }]}>
          <Text style={styles.previewAvatarEmoji}>😀</Text>
        </View>
      </View>
      <View style={[styles.previewRow, { backgroundColor: t.surfaceLight }]}>
        <View style={[styles.previewDot, { backgroundColor: t.primary }]} />
        <Text style={[styles.previewRowText, { color: t.text }]}>Alışkanlık adı</Text>
        <View style={[styles.previewCheck, { backgroundColor: t.accent }]}>
          <Text style={styles.previewCheckText}>✓</Text>
        </View>
      </View>
      <View style={[styles.previewBtn, { backgroundColor: t.primary }]}>
        <Text style={[styles.previewBtnText, { color: t.onPrimary }]}>Tamamla +XP</Text>
      </View>
      <View style={styles.previewActions}>
        {isSelected ? (
          <View style={[styles.previewAction, styles.btnSelected]}>
            <Text style={styles.btnSelectedText}>✓ Şu an kullanımda</Text>
          </View>
        ) : isOwned ? (
          <PressableFX style={[styles.previewAction, styles.btnOwned]} onPress={onSelect}>
            <Text style={styles.btnOwnedText}>Bu temayı uygula</Text>
          </PressableFX>
        ) : (
          <PressableFX
            style={[styles.previewAction, styles.btnBuy, !affordable && styles.btnDisabled]}
            disabled={!affordable}
            onPress={onBuy}
          >
            <Text style={[styles.btnBuyText, !affordable && styles.btnDisabledText]}>
              🪙 {theme.price} ile satın al
            </Text>
          </PressableFX>
        )}
      </View>
    </View>
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
    tabBar: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    tabChip: {
      borderRadius: 14,
      backgroundColor: C.surface,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: C.border,
    },
    tabChipText: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    tabChipTextActive: {
      color: C.onPrimary,
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
    previewHint: {
      color: C.textMuted,
      fontSize: 10,
      fontWeight: '600',
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
    previewPanel: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    previewTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 12,
      padding: 12,
    },
    previewTopText: {
      gap: 2,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    previewSub: {
      fontSize: 11,
    },
    previewAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewAvatarEmoji: {
      fontSize: 20,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    previewDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    previewRowText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    previewCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCheckText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
    previewBtn: {
      borderRadius: 12,
      alignItems: 'center',
      paddingVertical: 11,
    },
    previewBtnText: {
      fontSize: 13,
      fontWeight: '800',
    },
    previewActions: {
      marginTop: 2,
    },
    previewAction: {
      width: '100%',
      borderRadius: 11,
      paddingVertical: 10,
      alignItems: 'center',
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

// OwnedBadge stil tanımı (useTheme ile renk kullandığı için ayrı sabit).
const stylesConf = StyleSheet.create({
  ownedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});