// ============================================================
// ProfileScreen — Profil bilgileri (Instagram tarzı)
// Büyük fotoğraf/avatar, isim, seviye/XP, bio ve istatistikler.
// Fotoğraf: galeriden seçilir → Supabase Storage'a yüklenir → URL
// profil kaydına yazılır. Bio yerel + sunucuya senkron edilir.
// ============================================================
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AnimatedCounter from '../components/AnimatedCounter';
import AvatarCircle from '../components/AvatarCircle';
import PressableFX from '../components/PressableFX';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ACHIEVEMENTS } from '../data/achievements';
import { levelFromTotalXp, bestStreak } from '../logic';
import { pickProfilePhoto, removeProfilePhoto, uploadProfilePhoto } from '../services/avatarService';
import { useTheme } from '../theme';

export default function ProfileScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, today, updateBio, setProfilePhoto } = useData();
  const { user: authUser } = useAuth();
  const navigation = useNavigation();
  const { stats, habits, settings } = data;

  const username = settings.username || authUser?.name || 'kullanici';
  const photoUrl = settings.photoUrl || null;
  const levelInfo = levelFromTotalXp(stats.totalXp);
  const streak = bestStreak(habits, today);
  const xpPct = Math.min(100, Math.round((levelInfo.curXp / levelInfo.nextThreshold) * 100));
  const doneToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const unlockedCount = (data.achievements || []).length;

  // ---------- Bio ----------
  const [bioDraft, setBioDraft] = useState(settings.bio || '');
  const [editingBio, setEditingBio] = useState(false);

  const onSaveBio = () => {
    updateBio(bioDraft.trim());
    setEditingBio(false);
  };

  // ---------- Fotoğraf ----------
  const [photoBusy, setPhotoBusy] = useState(false);

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
    <ScrollView style={styles.container}>
      {/* Profil fotoğrafı + yükleme rozeti */}
      <View style={styles.photoSection}>
        <Pressable onPress={pickAndUpload} disabled={photoBusy}>
          <AvatarCircle
            avatarId={settings.avatarId}
            frameId={settings.frameId}
            photo={photoUrl}
            size={120}
          />
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{photoBusy ? '⏳' : '📷'}</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.name}>{authUser?.name || 'Misafir'}</Text>
      <Text style={styles.levels}>
        {levelInfo.level} Seviye · {stats.totalXp} XP
      </Text>
      <Text style={styles.username}>@{username}</Text>

      {/* Bio */}
      <View style={styles.bioCard}>
        {editingBio ? (
          <>
            <TextInput
              style={styles.bioInput}
              value={bioDraft}
              onChangeText={setBioDraft}
              placeholder="Kendinden bahset…"
              placeholderTextColor={C.textMuted}
              maxLength={200}
              multiline
            />
            <Pressable style={[styles.bioSaveBtn, { backgroundColor: C.primary }]} onPress={onSaveBio}>
              <Text style={styles.bioSaveText}>Kaydet</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.bioBox} onPress={() => setEditingBio(true)}>
            <Text style={styles.bioText} numberOfLines={4}>
              {settings.bio || 'Bio ekle ✏️'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* İstatistikler */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <AnimatedCounter value={streak} style={styles.statValue} />
          <Text style={styles.statLabel}>🔥 Seri</Text>
        </View>
        <View style={styles.statCard}>
          <AnimatedCounter value={stats.totalCompletions || 0} style={styles.statValue} />
          <Text style={styles.statLabel}>✅ Tamamlama</Text>
        </View>
        <View style={styles.statCard}>
          <AnimatedCounter value={stats.totalXp} style={styles.statValue} />
          <Text style={styles.statLabel}>⚡ XP</Text>
        </View>
        <View style={styles.statCard}>
          <AnimatedCounter value={stats.gold || 0} style={styles.statValue} />
          <Text style={styles.statLabel}>🪙 Altın</Text>
        </View>
      </View>

      {/* İstatistik özeti kartı */}
      <View style={styles.summaryCard}>
        <View style={styles.xpRow}>
          <View style={styles.xpTexts}>
            <Text style={styles.xpLabel}>
              Seviye {levelInfo.level} → {levelInfo.level + 1}
            </Text>
            <Text style={styles.xpSub}>
              {levelInfo.curXp}/{levelInfo.nextThreshold} XP
            </Text>
          </View>
          <Text style={styles.xpValue}>%{xpPct}</Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryEmoji}>📅</Text>
            <Text style={styles.summaryCellValue}>{habits.length}</Text>
            <Text style={styles.summaryCellLabel}>Aktif alışkanlık</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryEmoji}>🎯</Text>
            <Text style={styles.summaryCellValue}>
              {doneToday}/{habits.length || 0}
            </Text>
            <Text style={styles.summaryCellLabel}>Bugün tamamlanan</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryEmoji}>🍅</Text>
            <Text style={styles.summaryCellValue}>{stats.pomodoroCount || 0}</Text>
            <Text style={styles.summaryCellLabel}>Odak seansı</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryEmoji}>🏆</Text>
            <Text style={styles.summaryCellValue}>
              {unlockedCount}/{ACHIEVEMENTS.length}
            </Text>
            <Text style={styles.summaryCellLabel}>Başarım</Text>
          </View>
        </View>

        <PressableFX
          style={[styles.achBtn, { borderColor: C.primary + '55' }]}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Text style={styles.achBtnText}>🏆 Tüm başarımları gör →</Text>
        </PressableFX>
      </View>

      {/* Eylemler */}
      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionBtn, { backgroundColor: C.primary }]} onPress={pickAndUpload}>
          <Text style={styles.actionText}>
            {photoBusy ? '⏳ Yükleniyor…' : photoUrl ? '📷 Fotoğrafı Değiştir' : '📷 Fotoğraf Yükle'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: C.surfaceLight }]}
          onPress={() => navigation.navigate('Shop')}
        >
          <Text style={styles.actionText}>💍 Çerçeve</Text>
        </Pressable>
      </View>
      {photoUrl && (
        <Pressable style={styles.removeBtn} onPress={removePhoto}>
          <Text style={styles.removeText}>Fotoğrafı Kaldır</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
      padding: 20,
    },
    photoSection: {
      alignItems: 'center',
      marginTop: 8,
    },
    photoBadge: {
      position: 'absolute',
      right: -2,
      bottom: 0,
      backgroundColor: C.primary,
      borderRadius: 14,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBadgeText: {
      fontSize: 14,
    },
    name: {
      color: C.text,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      marginTop: 12,
    },
    levels: {
      color: C.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 2,
    },
    username: {
      color: C.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 2,
      opacity: 0.8,
    },
    bioCard: {
      marginTop: 16,
    },
    bioBox: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      minHeight: 60,
      justifyContent: 'center',
    },
    bioText: {
      color: C.text,
      fontSize: 14,
      lineHeight: 20,
    },
    bioInput: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      color: C.text,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    bioSaveBtn: {
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    bioSaveText: {
      color: C.onPrimary,
      fontWeight: '700',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    summaryCard: {
      marginTop: 12,
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
    },
    xpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    xpTexts: {
      gap: 2,
    },
    xpLabel: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
    xpSub: {
      color: C.textMuted,
      fontSize: 12,
    },
    xpValue: {
      color: C.xp,
      fontSize: 18,
      fontWeight: '800',
    },
    xpTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
      marginTop: 10,
    },
    xpFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: C.xp,
    },
    summaryGrid: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 10,
    },
    summaryCell: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      paddingVertical: 12,
      gap: 2,
    },
    summaryEmoji: {
      fontSize: 16,
    },
    summaryCellValue: {
      color: C.text,
      fontSize: 16,
      fontWeight: '800',
    },
    summaryCellLabel: {
      color: C.textMuted,
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
    },
    achBtn: {
      marginTop: 14,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      paddingVertical: 10,
    },
    achBtnPressed: {
      opacity: 0.7,
    },
    achBtnText: {
      color: C.text,
      fontSize: 13,
      fontWeight: '700',
    },
    statCard: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: C.text,
    },
    statLabel: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
    },
    actionText: {
      color: C.text,
      fontWeight: '700',
    },
    removeBtn: {
      marginTop: 12,
      alignItems: 'center',
      paddingVertical: 10,
    },
    removeText: {
      color: C.danger,
      fontWeight: '600',
    },
  });
}
