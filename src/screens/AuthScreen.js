// ============================================================
// AuthScreen — Hesap girişi / kaydı (isim + şifre)
// Ek akışlar:
// - Kayıt sonrası kurtarma anahtarı tek sefer gösterilir (kaydedilmeli).
// - "Şifremi unuttum": isim + kurtarma anahtarıyla yeni şifre belirlenir.
// ============================================================
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import BackgroundPattern from '../components/BackgroundPattern';
import { useTheme } from '../theme';

// Kayıt sonrası gösterilen kurtarma anahtarı ekranı (tek sefer).
function RecoveryKeyModal({ recoveryKey, onDone }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.overlay}>
      <View style={[styles.card, styles.recoveryCard]}>
        <Text style={styles.recoveryEmoji}>🔑</Text>
        <Text style={styles.recoveryTitle}>Kurtarma anahtarın!</Text>
        <Text style={styles.recoveryKeyText}>{recoveryKey}</Text>
        <Text style={styles.recoveryWarn}>
          Bu anahtarı BİR YERE YAZ. Şifreni unutursan veya cihazını kaybedersen hesabına ancak
          bu anahtarla yeniden girersin. Anahtar kaybolursa hesap kurtarılamaz.
        </Text>
        <Pressable style={styles.button} onPress={onDone}>
          <Text style={styles.buttonText}>Anladım, kaydettim</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { status, register, confirmRegister, login, resetPassword } = useAuth();
  // "mode": kullanıcı kayıt ↔ giriş ekranı arasında geçiş yapabilir.
  // null = cihazdaki duruma göre (hesap yoksa kayıt, varsa giriş).
  const [mode, setMode] = useState(null);
  // "view": 'auth' (normal form) | 'recover' (şifre kurtarma formu).
  const [view, setView] = useState('auth');
  const signup = mode === 'login' ? false : status === 'signup';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Kayıt sonrası gösterilecek kurtarma anahtarı (null = gösterilmiyor).
  const [recoveryKey, setRecoveryKey] = useState(null);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('İsim girmelisin');
    if (password.length < 4) return setError('Şifre en az 4 karakter olmalı');
    if (signup && password !== password2) return setError('Şifreler eşleşmiyor');
    setBusy(true);
    const result = signup ? await register(name, password) : await login(name, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Kayıt: önce kurtarma anahtarını göster, sonra oturum açılır.
    if (signup && result.recoveryKey) setRecoveryKey(result.recoveryKey);
  };

  // "Şifremi unuttum" formu: isim + anahtar + yeni şifre (+ tekrar).
  // Alanlar sırasıyla name / password / password2 / password3'te değil:
  // kurtarma formunda "password" anahtar, "password2" yeni şifre,
  // "password3" yeni şifre tekrarıdır.
  const [password3, setPassword3] = useState('');

  const submitRecover = async () => {
    setError('');
    if (!name.trim()) return setError('İsim girmelisin');
    if (password2.length < 4) return setError('Yeni şifre en az 4 karakter olmalı');
    if (password2 !== password3) return setError('Yeni şifreler eşleşmiyor');
    setBusy(true);
    const result = await resetPassword(name, password, password2);
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern />
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🎯</Text>
          <Text style={styles.logoTitle}>Habit Tracker</Text>
          <Text style={styles.logoSub}>
            {view === 'recover'
              ? 'Kurtarma anahtarınla şifreni yenile'
              : signup
                ? 'Hesabını oluştur, alışkanlıkların seni bekliyor'
                : 'Tekrar hoş geldin!'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>
            {view === 'recover' ? 'Şifre Sıfırlama' : signup ? 'Kayıt Ol' : 'Giriş Yap'}
          </Text>
          <Text style={styles.formDesc}>
            {view === 'recover'
              ? 'İsim + kurtarma anahtarı gir, yeni şifreni belirle.'
              : signup
                ? 'İsim ve şifrenle yeni hesap açarsın.'
                : 'İsim ve şifrenle devam edersin.'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="İsim"
            placeholderTextColor={C.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {view === 'recover' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Kurtarma anahtarı (ör. X7K3-Q9MF)"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Yeni şifre"
                placeholderTextColor={C.textMuted}
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Yeni şifre (tekrar)"
                placeholderTextColor={C.textMuted}
                value={password3}
                onChangeText={setPassword3}
                secureTextEntry
              />
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {signup && (
                <TextInput
                  style={styles.input}
                  placeholder="Şifre (tekrar)"
                  placeholderTextColor={C.textMuted}
                  value={password2}
                  onChangeText={setPassword2}
                  secureTextEntry
                />
              )}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {view === 'recover' ? (
            <Pressable
              style={[styles.button, busy && styles.buttonBusy]}
              onPress={submitRecover}
              disabled={busy}
            >
              <Text style={styles.buttonText}>Şifreyi Sıfırla</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.button, busy && styles.buttonBusy]}
              onPress={submit}
              disabled={busy}
            >
              <Text style={styles.buttonText}>{signup ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
            </Pressable>
          )}

          {view === 'recover' ? (
            <Pressable
              style={styles.switchRow}
              onPress={() => {
                setView('auth');
                setError('');
              }}
              hitSlop={8}
            >
              <Text style={styles.switchText}>← Giriş ekranına dön</Text>
            </Pressable>
          ) : (
            <>
              {!signup && (
                <Pressable
                  style={styles.switchRow}
                  onPress={() => {
                    setView('recover');
                    setError('');
                    setPassword('');
                    setPassword2('');
                    setPassword3('');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.forgotText}>Şifremi unuttum</Text>
                </Pressable>
              )}
              <Text style={styles.hint}>
                {signup
                  ? 'Bu cihazda yalnızca bir hesap olabilir.'
                  : 'Şifreni unuttuysan kurtarma anahtarınla sıfırlayabilirsin.'}
              </Text>
              <Pressable
                style={styles.switchRow}
                onPress={() => setMode(signup ? 'login' : 'signup')}
                hitSlop={8}
              >
                <Text style={styles.switchText}>
                  {signup ? 'Hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Kayıt sonrası kurtarma anahtarı ekranı (tek sefer). */}
      {recoveryKey ? (
        <RecoveryKeyModal
          recoveryKey={recoveryKey}
          onDone={() => {
            setRecoveryKey(null);
            confirmRegister();
          }}
        />
      ) : null}
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    wrap: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      gap: 24,
    },
    logoBox: {
      alignItems: 'center',
      gap: 6,
    },
    logoEmoji: {
      fontSize: 56,
    },
    logoTitle: {
      color: C.text,
      fontSize: 28,
      fontWeight: '900',
    },
    logoSub: {
      color: C.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 20,
      gap: 12,
    },
    formTitle: {
      color: C.text,
      fontSize: 20,
      fontWeight: '800',
    },
    formDesc: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
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
    button: {
      height: 50,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    buttonBusy: {
      opacity: 0.6,
    },
    buttonText: {
      color: C.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    hint: {
      color: C.textMuted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
    },
    switchRow: {
      alignItems: 'center',
      paddingTop: 2,
    },
    switchText: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    forgotText: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 10,
    },
    recoveryCard: {
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      gap: 14,
      padding: 24,
    },
    recoveryEmoji: {
      fontSize: 48,
    },
    recoveryTitle: {
      color: C.text,
      fontSize: 20,
      fontWeight: '800',
    },
    recoveryKeyText: {
      color: C.primary,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: 3,
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
      overflow: 'hidden',
    },
    recoveryWarn: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
    },
  });
}
