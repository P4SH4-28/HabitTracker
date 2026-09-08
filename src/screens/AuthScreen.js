// ============================================================
// AuthScreen — Hesap girişi / kaydı (isim + şifre)
// Ek akışlar:
// - Kayıt sonrası kurtarma anahtarı tek sefer gösterilir (kaydedilmeli).
// - "Şifremi unuttum": isim + kurtarma anahtarıyla yeni şifre belirlenir.
//
// Premium tasarım: BrandMark amblemi, focus'lu input kutusu (ikon + glow),
// gradient CTA (GradientButton), soft bağlantılar, glass recovery modalı.
// ============================================================
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import BackgroundPattern from '../components/BackgroundPattern';
import { useTheme } from '../theme';
import BrandMark from '../components/ui/BrandMark';
import GradientButton from '../components/GradientButton';
import SoftButton from '../components/ui/SoftButton';
import { Icon, IconTile } from '../components/ui';

// Focus'lu, ikonlu premium input kutusu.
const fieldStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});

function Field({ icon, focused, style, ...rest }) {
  const { colors: C, radius, glow } = useTheme();
  return (
    <View
      style={[
        fieldStyles.wrap,
        {
          backgroundColor: C.surfaceLight,
          borderColor: focused ? C.primary : C.border,
          borderRadius: radius.control,
        },
        focused ? glow(C.primary, { opacity: 0.16, radius: 14, offset: 0, elevation: 0 }) : null,
        style,
      ]}
    >
      <Icon name={icon} size={16} color={focused ? C.primary : C.textMuted} />
      <TextInput
        placeholderTextColor={C.textMuted}
        style={[fieldStyles.input, { color: C.text }]}
        {...rest}
      />
    </View>
  );
}

// Kayıt sonrası gösterilen kurtarma anahtarı ekranı (tek sefer, glass).
function RecoveryKeyModal({ recoveryKey, onDone }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => recoveryStyles(C), [C]);
  return (
    <View style={styles.overlay}>
      <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.card, styles.recoveryCard]}>
        <IconTile name="key" variant="violet" size={54} />
        <Text style={styles.recoveryTitle}>Kurtarma anahtarın!</Text>
        <View style={styles.keyPill}>
          <Text style={styles.recoveryKeyText}>{recoveryKey}</Text>
        </View>
        <Text style={styles.recoveryWarn}>
          Bu anahtarı BİR YERE YAZ. Şifreni unutursan veya cihazını kaybedersen hesabına ancak
          bu anahtarla yeniden girersin. Anahtar kaybolursa hesap kurtarılamaz.
        </Text>
        <GradientButton label="Anladım, kaydettim" onPress={onDone} style={styles.recoveryCta} />
      </View>
    </View>
  );
}

function recoveryStyles(C) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      zIndex: 10,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 20,
    },
    recoveryCard: {
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      gap: 14,
      padding: 24,
    },
    recoveryTitle: {
      color: C.text,
      fontSize: 20,
      fontWeight: '800',
    },
    keyPill: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    recoveryKeyText: {
      color: C.primary,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: 3,
    },
    recoveryWarn: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 19,
      textAlign: 'center',
    },
    recoveryCta: {
      marginTop: 4,
      alignSelf: 'stretch',
    },
  });
}

export default function AuthScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { status, register, confirmRegister, login, resetPassword } = useAuth();
  const [mode, setMode] = useState(null);
  const [view, setView] = useState('auth');
  const signup = mode === 'login' ? false : status === 'signup';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [password3, setPassword3] = useState('');
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
    if (signup && result.recoveryKey) setRecoveryKey(result.recoveryKey);
  };

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

  const subtitle =
    view === 'recover'
      ? 'Kurtarma anahtarlı şifre yenileme'
      : signup
        ? 'Hesabını oluştur, alışkanlıklar seni bekliyor'
        : 'Tekrar hoş geldin!';

  const primaryLabel = view === 'recover' ? 'Şifreyi Sıfırla' : signup ? 'Kayıt Ol' : 'Giriş Yap';
  const focusOff = () => setFocus(null);

  return (
    <View style={styles.container}>
      <BackgroundPattern />
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BrandMark subtitle={subtitle} />

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

          <Field
            icon="person"
            focused={focus === 'name'}
            onFocus={() => setFocus('name')}
            onBlur={focusOff}
            placeholder="İsim"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {view === 'recover' ? (
            <>
              <Field
                icon="key"
                focused={focus === 'key'}
                onFocus={() => setFocus('key')}
                onBlur={focusOff}
                placeholder="Kurtarma anahtarı (ör. X7K3-Q9MF)"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Field
                icon="lock-closed"
                focused={focus === 'pw2'}
                onFocus={() => setFocus('pw2')}
                onBlur={focusOff}
                placeholder="Yeni şifre"
                value={password2}
                onChangeText={setPassword2}
                secureTextEntry
              />
              <Field
                icon="lock-closed"
                focused={focus === 'pw3'}
                onFocus={() => setFocus('pw3')}
                onBlur={focusOff}
                placeholder="Yeni şifre (tekrar)"
                value={password3}
                onChangeText={setPassword3}
                secureTextEntry
              />
            </>
          ) : (
            <>
              <Field
                icon="lock-closed"
                focused={focus === 'pw'}
                onFocus={() => setFocus('pw')}
                onBlur={focusOff}
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {signup && (
                <Field
                  icon="lock-closed"
                  focused={focus === 'pw2'}
                  onFocus={() => setFocus('pw2')}
                  onBlur={focusOff}
                  placeholder="Şifre (tekrar)"
                  value={password2}
                  onChangeText={setPassword2}
                  secureTextEntry
                />
              )}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
            label={busy ? `${primaryLabel}…` : primaryLabel}
            onPress={view === 'recover' ? submitRecover : submit}
            disabled={busy}
            style={styles.cta}
            glowColor={C.primary}
          />

          {view === 'recover' ? (
            <View style={styles.linksBox}>
              <SoftButton
                label="← Giriş ekranına dön"
                variant="subtle"
                size="sm"
                onPress={() => {
                  setView('auth');
                  setError('');
                }}
              />
            </View>
          ) : (
            <>
              {!signup && (
                <View style={styles.linksBox}>
                  <SoftButton
                    label="Şifremi unuttum"
                    variant="subtle"
                    size="sm"
                    onPress={() => {
                      setView('recover');
                      setError('');
                      setPassword('');
                      setPassword2('');
                      setPassword3('');
                    }}
                  />
                </View>
              )}
              <Text style={styles.hint}>
                {signup
                  ? 'Bu cihazda yalnızca bir hesap olabilir.'
                  : 'Şifreni unuttuysan kurtarma anahtarınla sıfırlayabilirsin.'}
              </Text>
              <View style={styles.linksBox}>
                <SoftButton
                  label={signup ? 'Hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}
                  variant="subtle"
                  size="sm"
                  onPress={() => setMode(signup ? 'login' : 'signup')}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

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
    error: {
      color: C.danger,
      fontSize: 13,
      fontWeight: '600',
    },
    cta: {
      marginTop: 6,
      alignSelf: 'stretch',
    },
    hint: {
      color: C.textMuted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: 'center',
    },
    linksBox: {
      alignItems: 'center',
      paddingTop: 2,
    },
  });
}