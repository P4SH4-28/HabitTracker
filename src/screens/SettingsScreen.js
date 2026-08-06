// ============================================================
// SettingsScreen — "Ayarlar" sekmesi
// Bölümler: Profil (hesap + çıkış), Oyunlaştırma (XP + ceza),
// Bildirimler (hatırlatma saati), Görünüm, Veri (yedek/sıfırla), Hakkında.
// ============================================================
import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import AvatarCircle from '../components/AvatarCircle';
import { confirmDialog } from '../components/HabitCard';
import Sheet from '../components/Sheet';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getShopItem } from '../data/shop';
import { getTheme, useTheme } from '../theme';

function Section({ title, children }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SettingRow({ label, description, right }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description ? <Text style={styles.settingDesc}>{description}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Küçük giriş sayfası: başlık + metin alanı(ları) + hata + buton.
function EditSheet({ visible, title, fields, buttonLabel, onSubmit, onClose }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [values, setValues] = useState(fields.map(() => ''));
  const [error, setError] = useState('');

  const reset = () => {
    setValues(fields.map(() => ''));
    setError('');
  };

  const submit = async () => {
    const result = await onSubmit(values);
    if (result && !result.ok) {
      setError(result.error || 'İşlem başarısız');
      return;
    }
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title={title}
    >
      {fields.map((f, i) => (
        <TextInput
          key={f}
          style={styles.input}
          placeholder={f}
          placeholderTextColor={C.textMuted}
          value={values[i]}
          onChangeText={(t) => setValues((prev) => prev.map((v, j) => (j === i ? t : v)))}
          secureTextEntry={f.toLowerCase().includes('şifre')}
          autoCapitalize="none"
        />
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primaryButton} onPress={submit}>
        <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
      </Pressable>
    </Sheet>
  );
}

export default function SettingsScreen() {
  const {
    data,
    setPenaltyEnabled,
    setReminderHour,
    backupData,
    restoreData,
    backupTs,
    resetAll,
    server,
    refreshServer,
  } = useData();
  const { user: authUser, logout, changeName, changePassword, deleteAccount } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const penaltyEnabled = data.settings.penaltyEnabled !== false;
  const reminderHour = data.settings.reminderHour;
  const currentTheme = getTheme(data.settings.themeId || 'dark');
  const currentAvatar = getShopItem(data.settings.avatarId || 'av_fox');

  const [editSheet, setEditSheet] = useState(null); // 'name' | 'password'
  const [busy, setBusy] = useState('');

  const handleBackup = async () => {
    setBusy('backup');
    await backupData();
    setBusy('');
  };

  const handleRestore = () => {
    confirmDialog(
      'Yedeği geri yükle',
      'Mevcut verinin yerine yedekteki veri gelecek. Emin misin?',
      async () => {
        setBusy('restore');
        const result = await restoreData();
        setBusy('');
        if (!result.ok) confirmDialog('Hata', result.error || 'Geri yüklenemedi', () => {});
      }
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Ayarlar</Text>
      <Text style={styles.screenSub}>Hesabını ve deneyimini kişiselleştir</Text>

      {/* Profil */}
      <Section title="Profil">
        <View style={styles.profileCard}>
          <AvatarCircle
            avatarId={data.settings.avatarId}
            frameId={data.settings.frameId}
            size={72}
            ringColor={C.gold}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{authUser?.name || 'Kullanıcı'}</Text>
            <Text style={styles.profileSub}>{currentAvatar?.name || 'Avatar'} — hesap adın liderlikte görünür</Text>
          </View>
        </View>
        <SettingRow
          label="İsim değiştir"
          description="Liderlik tablosunda görünen adını güncelle"
          right={
            <Pressable style={styles.primaryChip} onPress={() => setEditSheet('name')}>
              <Text style={styles.primaryChipText}>Değiştir</Text>
            </Pressable>
          }
        />
        <SettingRow
          label="Şifre değiştir"
          description="Yeni şifre belirlemek için eski şifreni doğrula"
          right={
            <Pressable style={styles.primaryChip} onPress={() => setEditSheet('password')}>
              <Text style={styles.primaryChipText}>Değiştir</Text>
            </Pressable>
          }
        />
        <SettingRow
          label="Çıkış yap"
          description="Bir dahaki açılışta isim ve şifre istenir"
          right={
            <Pressable
              style={styles.dangerButton}
              onPress={() =>
                confirmDialog('Çıkış yap', 'Hesabından çıkış yapılsın mı?', () => logout())
              }
            >
              <Text style={styles.dangerText}>Çıkış</Text>
            </Pressable>
          }
        />
      </Section>

      {/* Oyun Kuralları */}
      <Section title="Oyun Kuralları">
        <SettingRow
          label="Eksik görev cezası"
          description={
            penaltyEnabled
              ? 'Gün sonunda tamamlanmayan her görev için 15 🪙 kesilir (0 altına inmez)'
              : 'Gün sonunda eksik görevler için altın kesilmez'
          }
          right={
            <Switch
              value={penaltyEnabled}
              onValueChange={setPenaltyEnabled}
              trackColor={{ true: C.primary, false: C.surfaceLight }}
              thumbColor={penaltyEnabled ? C.onPrimary : C.textMuted}
            />
          }
        />
      </Section>

      {/* Bildirimler */}
      <Section title="Bildirimler">
        <SettingRow
          label="Günlük hatırlatma"
          description={
            reminderHour == null
              ? 'Kapalı — açmak için bir saat seç'
              : `Her gün ${String(reminderHour).padStart(2, '0')}:00'de uygulama açıkken hatırlatır`
          }
          right={
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepperButton}
                onPress={() =>
                  setReminderHour(reminderHour == null ? 20 : (reminderHour + 23) % 24)
                }
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>
                {reminderHour == null ? '—' : reminderHour}
              </Text>
              <Pressable
                style={styles.stepperButton}
                onPress={() =>
                  setReminderHour(reminderHour == null ? 20 : (reminderHour + 1) % 24)
                }
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
          }
        />
        <SettingRow
          label="Kapalıyken de hatırlatsın"
          description="Gerçek OS bildirimi için ayrı bir paket gerekir; şimdilik yalnızca uygulama açıkken çalışır"
        />
      </Section>

      {/* Görünüm */}
      <Section title="Görünüm">
        <SettingRow
          label="Aktif tema"
          description={`${currentTheme.name} — yeni temalar Dükkan'da satılır`}
          right={<Text style={styles.themeEmoji}>{currentTheme.emoji}</Text>}
        />
      </Section>

      {/* Sunucu */}
      <Section title="Sunucu">
        <SettingRow
          label="Bağlantı durumu"
          description={
            server.connected
              ? server.lastSync
                ? `Bağlı — son senkron: ${new Date(server.lastSync).toLocaleString('tr-TR')}`
                : 'Bağlı'
              : 'Çevrimdışı — arkadaşlık ve liderlik özellikleri önbellekten çalışır'
          }
          right={
            <View style={styles.serverStatusRow}>
              <View
                style={[
                  styles.serverDot,
                  { backgroundColor: server.connected ? C.accent : C.danger },
                ]}
              />
              <Pressable
                style={[styles.primaryChip, busy === 'server' && styles.chipBusy]}
                onPress={async () => {
                  setBusy('server');
                  await refreshServer();
                  setBusy('');
                }}
                disabled={busy !== ''}
              >
                <Text style={styles.primaryChipText}>
                  {busy === 'server' ? '...' : 'Senkronla'}
                </Text>
              </Pressable>
            </View>
          }
        />
        <SettingRow
          label="Nasıl çalışır?"
          description="Profilin, XP'n ve arkadaşlıkların bulut sunucusunda saklanır; cihaz değiştirsen bile aynı isimle devam edebilirsin."
        />
      </Section>

      {/* Yönetici — yalnızca admin hesabıyla görünür */}
      {authUser?.isAdmin ? (
        <Section title="🛡️ Yönetici">
          <SettingRow
            label="Kayıtlı kullanıcı hesabı"
            description="Silinirse cihazda yeni bir hesap açılabilir (admin oturumu sürer)"
            right={
              <Pressable
                style={styles.dangerButton}
                onPress={() =>
                  confirmDialog(
                    'Kullanıcı hesabını sil',
                    'Kayıtlı kullanıcı hesabı silinsin mi?',
                    () => deleteAccount()
                  )
                }
              >
                <Text style={styles.dangerText}>Sil</Text>
              </Pressable>
            }
          />
        </Section>
      ) : null}

      {/* Veri */}
      <Section title="Veri">
        <SettingRow
          label="Yedekle"
          description={
            backupTs
              ? `Son yedek: ${new Date(backupTs).toLocaleString('tr-TR')}`
              : 'Verinin anlık kopyasını cihazına kaydet'
          }
          right={
            <Pressable
              style={[styles.primaryChip, busy === 'backup' && styles.chipBusy]}
              onPress={handleBackup}
              disabled={busy !== ''}
            >
              <Text style={styles.primaryChipText}>
                {busy === 'backup' ? '...' : 'Yedekle'}
              </Text>
            </Pressable>
          }
        />
        <SettingRow
          label="Yedeği geri yükle"
          description="Kaydedilen son yedeği getirir (mevcut veri değişir)"
          right={
            <Pressable
              style={[styles.primaryChip, busy === 'restore' && styles.chipBusy]}
              onPress={handleRestore}
              disabled={busy !== '' || !backupTs}
            >
              <Text style={styles.primaryChipText}>
                {busy === 'restore' ? '...' : 'Geri Yükle'}
              </Text>
            </Pressable>
          }
        />
        <SettingRow
          label="Tüm verileri sıfırla"
          description="Alışkanlıklar, XP, seviye ve arkadaşlar kalıcı olarak silinir"
          right={
            <Pressable
              style={styles.dangerButton}
              onPress={() =>
                confirmDialog('Verileri sıfırla', 'Tüm verilerin silinecek. Emin misin?', () =>
                  resetAll()
                )
              }
            >
              <Text style={styles.dangerText}>Sıfırla</Text>
            </Pressable>
          }
        />
      </Section>

      {/* Hakkında */}
      <Section title="Hakkında">
        <SettingRow label="Uygulama" description="Habit Tracker — Oyunlaştırılmış Alışkanlık Takibi" />
        <SettingRow label="Sürüm" description="1.1.0" />
        <SettingRow
          label="Teknoloji"
          description="React Native + Expo SDK 57, veriler cihazında saklanır"
        />
      </Section>

      {/* İsim / şifre değiştirme sayfaları */}
      <EditSheet
        visible={editSheet === 'name'}
        title="İsim Değiştir"
        fields={['Yeni isim']}
        buttonLabel="Kaydet"
        onClose={() => setEditSheet(null)}
        onSubmit={([name]) => changeName(name)}
      />
      <EditSheet
        visible={editSheet === 'password'}
        title="Şifre Değiştir"
        fields={['Eski şifre', 'Yeni şifre']}
        buttonLabel="Şifreyi Güncelle"
        onClose={() => setEditSheet(null)}
        onSubmit={([oldPass, newPass]) => changePassword(oldPass, newPass)}
      />
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: 20,
      gap: 18,
      paddingBottom: 60,
    },
    screenTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: '800',
    },
    screenSub: {
      color: C.textMuted,
      fontSize: 13,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.gold + '44',
      padding: 16,
    },
    profileInfo: {
      flex: 1,
      gap: 3,
    },
    profileName: {
      color: C.text,
      fontSize: 18,
      fontWeight: '800',
    },
    profileSub: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      gap: 12,
    },
    settingText: {
      flex: 1,
      gap: 3,
    },
    settingLabel: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
    },
    settingDesc: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stepperButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperText: {
      color: C.primary,
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 24,
    },
    stepperValue: {
      color: C.text,
      fontSize: 16,
      fontWeight: '800',
      minWidth: 30,
      textAlign: 'center',
    },
    primaryChip: {
      backgroundColor: C.primary + '22',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipBusy: {
      opacity: 0.5,
    },
    primaryChipText: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    dangerButton: {
      backgroundColor: C.danger + '22',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    serverStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    serverDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    dangerText: {
      color: C.danger,
      fontSize: 13,
      fontWeight: '800',
    },
    themeEmoji: {
      fontSize: 22,
    },
    input: {
      height: 50,
      borderRadius: 14,
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 16,
      color: C.text,
      fontSize: 15,
    },
    error: {
      color: C.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    primaryButton: {
      height: 50,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: C.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
