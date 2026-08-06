// ============================================================
// AuthScreen — Hesap girişi / kaydı (isim + şifre)
// Uygulama açılışında gösterilir:
// - Hesap yoksa (status "signup"): kayıt formu
// - Hesap varsa (status "login"): giriş formu
// Başarılı kayıt/giriş sonrası App.js ana sekmeleri gösterir.
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

export default function AuthScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { status, register, login } = useAuth();
  // "mode": kullanıcı kayıt ↔ giriş ekranı arasında geçiş yapabilir.
  // null = cihazdaki duruma göre (hesap yoksa kayıt, varsa giriş).
  const [mode, setMode] = useState(null);
  const signup = mode === 'login' ? false : status === 'signup';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('İsim girmelisin');
    if (password.length < 4) return setError('Şifre en az 4 karakter olmalı');
    if (signup && password !== password2) return setError('Şifreler eşleşmiyor');
    setBusy(true);
    const result = signup
      ? await register(name, password)
      : await login(name, password);
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
            {signup ? 'Hesabını oluştur, alışkanlıkların seni bekliyor' : 'Tekrar hoş geldin!'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>{signup ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
          <Text style={styles.formDesc}>
            {signup
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

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, busy && styles.buttonBusy]}
            onPress={submit}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{signup ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
          </Pressable>

          <Text style={styles.hint}>
            {signup
              ? 'Bu cihazda yalnızca bir hesap olabilir.'
              : 'Şifreni unuttuysan verileri sıfırlaman gerekir.'}
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
        </View>
      </KeyboardAvoidingView>
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
  });
}
