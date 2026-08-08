// ============================================================
// AuthContext — Basit hesap sistemi (isim + şifre)
// Hesap bilgileri AsyncStorage'da ayrı bir anahtarda saklanır:
// { name, passHash }. Şifre hashPassword ile özetlenir (düz metin değil).
// Uygulama verileri hesaba bağlı DEĞİLDİR; bu yalnızca bir giriş kapısıdır.
// status: "signup" (hesap yok → kayıt) | "login" (hesap var → giriş) | "in"
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { hashPassword } from '../logic';

const AUTH_KEY = '@habit_tracker_auth';
// "Beni hatırla" oturumu: son giriş yapılan hesap (admin dahil) burada
// saklanır; uygulama açılışında doğrudan oturum açılmış gibi başlar.
const SESSION_KEY = '@habit_tracker_session';

// Oturumu kaydeder (asla çökmez; hata yutulur).
function saveSession(user) {
  if (!user) return;
  AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user)).catch((e) =>
    console.warn('Oturum kaydedilemedi:', e)
  );
}

// Yönetici hesabı: isim + şifre sabittir, kayıtlı kullanıcıdan bağımsızdır.
// Bu hesapla giriş yapıldığında kullanıcıya "isAdmin: true" bayrağı verilir;
// Ayarlar'da yalnızca admin'e görünen bölüm bu bayrağa bakar.
const ADMIN_NAME = 'P4SH4';
const ADMIN_PASS_HASH = hashPassword('20100830');

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // status: yükleme tamamlanınca "signup" veya "login" olur.
  const [status, setStatus] = useState('signup');
  const [user, setUser] = useState(null);

  // Açılışta kayıtlı oturumu oku: "beni hatırla" varsa doğrudan içeri
  // girilir; yoksa kayıtlı hesap giriş ekranını, hesap yoksa kayıt ekranını açar.
  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem(SESSION_KEY);
        if (session) {
          const parsed = JSON.parse(session);
          if (parsed && typeof parsed.name === 'string' && parsed.name) {
            setUser(parsed);
            setStatus('in');
            return;
          }
        }
      } catch (e) {
        console.warn('Oturum okunamadı:', e);
      }
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.name === 'string' && parsed.passHash) {
            setUser(parsed);
            setStatus('login');
            return;
          }
        }
      } catch (e) {
        console.warn('Hesap bilgisi okunamadı:', e);
      }
      setStatus('signup');
    })();
  }, []);

  // Yeni hesap oluşturur. Başarılıysa doğrudan giriş yapar.
  const register = useCallback(async (name, password) => {
    const n = (name || '').trim();
    if (n.length < 2) return { ok: false, error: 'İsim en az 2 karakter olmalı' };
    if (n === ADMIN_NAME) return { ok: false, error: 'Bu isim ayrılmış, farklı bir isim seç' };
    if ((password || '').length < 4) return { ok: false, error: 'Şifre en az 4 karakter olmalı' };
    try {
      const existing = await AsyncStorage.getItem(AUTH_KEY);
      if (existing) return { ok: false, error: 'Bu cihazda zaten bir hesap var' };
      const newUser = { name: n, passHash: hashPassword(password) };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
      saveSession(newUser);
      setUser(newUser);
      setStatus('in');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Kayıt sırasında hata oluştu' };
    }
  }, []);

  // Mevcut hesapla giriş yapar (isim + şifre doğrulanır).
  // Yönetici ismi/şifresi doğru girilirse kayıtlı hesaptan bağımsız giriş yapılır.
  const login = useCallback(async (name, password) => {
    const n = (name || '').trim();
    const hash = hashPassword(password || '');
    if (n === ADMIN_NAME && hash === ADMIN_PASS_HASH) {
      saveSession({ name: n, passHash: hash, isAdmin: true });
      setUser({ name: n, passHash: hash, isAdmin: true });
      setStatus('in');
      return { ok: true, admin: true };
    }
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (!raw) return { ok: false, error: 'Kayıtlı hesap bulunamadı' };
      const parsed = JSON.parse(raw);
      const ok = parsed.name === n && parsed.passHash === hash;
      if (!ok) return { ok: false, error: 'İsim veya şifre hatalı' };
      saveSession(parsed);
      setUser(parsed);
      setStatus('in');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Giriş sırasında hata oluştu' };
    }
  }, []);

  // Çıkış yapar; hesap kaydı kalır, bir dahaki sefere giriş ekranı açılır.
  const logout = useCallback(async () => {
    setUser(null);
    setStatus('login');
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.warn('Oturum silinemedi:', e);
    }
  }, []);

  // Kullanıcı adını değiştirir.
  const changeName = useCallback(async (newName) => {
    const n = (newName || '').trim();
    if (n.length < 2) return { ok: false, error: 'İsim en az 2 karakter olmalı' };
    if (n === ADMIN_NAME) return { ok: false, error: 'Bu isim ayrılmış, farklı bir isim seç' };
    if (user?.isAdmin) return { ok: false, error: 'Yönetici adı değiştirilemez' };
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, name: n };
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('İsim kaydedilemedi:', e)
      );
      saveSession(next);
      return next;
    });
    return { ok: true };
  }, []);

  // Şifreyi değiştirir (eski şifre doğrulanır).
  const changePassword = useCallback(async (oldPass, newPass) => {
    if (user?.isAdmin) return { ok: false, error: 'Yönetici şifresi değiştirilemez' };
    const np = newPass || '';
    if (np.length < 4) return { ok: false, error: 'Yeni şifre en az 4 karakter olmalı' };
    if (hashPassword(oldPass || '') !== user?.passHash) {
      return { ok: false, error: 'Eski şifre hatalı' };
    }
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, passHash: hashPassword(np) };
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(next)).catch((e) =>
        console.warn('Şifre kaydedilemedi:', e)
      );
      saveSession(next);
      return next;
    });
    return { ok: true };
  }, [user]);

  // Kayıtlı kullanıcı hesabını siler (admin yönetimi).
  // Admin silme yaparsa oturumu sürer; normal kullanıcı ise kayıt ekranına döner.
  const deleteAccount = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      await AsyncStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.warn('Hesap silinemedi:', e);
    }
    if (!user?.isAdmin) {
      setUser(null);
      setStatus('signup');
    }
    return { ok: true };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ status, user, register, login, logout, changeName, changePassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
