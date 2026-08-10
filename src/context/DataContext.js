// ============================================================
// DataContext — Uygulamanın TEK veri kaynağı (single source of truth)
// Tüm state (alışkanlıklar, XP, ayarlar, arkadaşlar) burada tutulur,
// her değişiklik AsyncStorage'a kaydedilir ve uygulama açılışında geri yüklenir.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  applyXpWithBank,
  calcStreak,
  DAILY_GOLD_CAP,
  DAILY_XP_CAP,
  dateKey,
  dayPenalty,
  emptyDayCounter,
  levelFromTotalXp,
  MAX_ACTIVE_HABITS,
  POMODORO_DURATION_MS,
  streakBonusFor,
  todayKey,
} from '../logic';
import { isClockFresh, isClockTampered, loadServerClock, serverNow } from '../services/serverClock';
import { evaluateAchievements } from '../data/achievements';
import {
  bumpDay,
  canClaimQuest,
  DAILY_QUESTS,
  getQuest,
  questClaimedToday,
  questProgress,
  questReward,
  QUEST_DIFFICULTIES,
  VIP_DURATION_MS,
  VIP_PRICE_GOLD,
  VIP_QUESTS,
} from '../data/quests';
import { getPassLevel, PASS_MAX_LEVEL, passRewardClaimed } from '../data/seasonPass';
import {
  FREE_AVATARS,
  FREE_FRAMES,
  getFrame,
  getShopItem,
  GOLD_RATES,
} from '../data/shop';
import { COLORS, getTheme } from '../theme';
import { useAuth } from './AuthContext';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend as supabaseRemoveFriend,
  sendFriendRequest,
} from '../services/friendService';
import {
  acceptDuel as acceptDuelReq,
  challengeFriend,
  declineDuel as declineDuelReq,
  finishDuel as finishDuelReq,
  getMyDuels,
} from '../services/duelService';
import { getLeaderboardData } from '../services/leaderboardService';
import { claimQuestServer, getServerProfile, updateProfileData } from '../services/profileService';
import { purchaseVip } from '../services/vipService';

// Depolama anahtarları HESABA ÖZELDİR: her hesabın verisi kendi anahtarında
// saklanır; hesap değişince veri de değişir. "name" önce güvenli hale getirilir
// (AsyncStorage anahtarı sadece harf/rakam/alt çizgi içermelidir).
// Eski ortak anahtar (@habit_tracker_v2) ilk açılışta aktif hesaba taşınır.
const LEGACY_STORAGE_KEY = '@habit_tracker_v2';
const LAST_ACCOUNT_KEY = '@habit_tracker_v2_last_account';
const DATA_VERSION = 7;

function sanitizeName(name) {
  const s = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'varsayilan';
}
function storageKeyFor(name) {
  return `${LEGACY_STORAGE_KEY}_${sanitizeName(name)}`;
}
function backupKeyFor(name) {
  return `${LEGACY_STORAGE_KEY}_backup_${sanitizeName(name)}`;
}
function userBackupKeyFor(name) {
  return `${LEGACY_STORAGE_KEY}_user_backup_${sanitizeName(name)}`;
}
function serverCacheKeyFor(name) {
  return `${LEGACY_STORAGE_KEY}_server_cache_${sanitizeName(name)}`;
}
function syncAnchorKeyFor(name) {
  return `${LEGACY_STORAGE_KEY}_sync_anchor_${sanitizeName(name)}`;
}

// Gün içinde tamamlanmayan her görev için kesilen altın miktarı.
const PENALTY_COINS = 15;

// Veri bozulursa bu değerle yeni bir başlangıç yapılır.
const INITIAL_STATE = {
  habits: [],
  stats: {
    totalXp: 0,
    pomodoroCount: 0,
    gold: 0,
    // Günlük görev sayaçları: gün anahtarı değişince sıfırlanır (bkz. quests.js).
    day: { key: null, completions: 0, pomodoro: 0, goldEarned: 0, bankReleased: 0 },
    // Seri ödülü: alışkanlık başına en son ödüllenen seri eşiği (farm koruması).
    streakAwards: {},
    // XP KUMBARASI: günlük tavanı aşan XP burada birikir, günde 500'e kadar geri verilir.
    xpBank: 0,
  },
    settings: { xpPerHabit: 25, pomodoroXp: 50, avatarId: 'av_fox', themeId: 'dark', devOffset: 0, frameId: null, penaltyEnabled: true, reminderHour: null, osNotify: false, vipUntil: 0 },
  friends: [],
  players: [],
  // Açılmış başarımların id listesi (AsyncStorage'a otomatik kaydedilir).
  achievements: [],
  // Dükkan'dan satın alınan avatar id'leri (ücretsizler baştan verilir).
  ownedAvatars: FREE_AVATARS,
  // Dükkan'dan satın alınan tema id'leri (Gece + Siyah Beyaz baştan açıktır).
  ownedThemes: ['dark', 'mono'],
  // Dükkan'dan satın alınan avatar çerçevesi id'leri (ücretsizler baştan verilir).
  ownedFrames: FREE_FRAMES,
  // Season Pass'ten açılan rozetler (profilde sergilenir).
  ownedBadges: [],
  // Görev panosu durumu: { [görevId]: { day, ts, value } }
  // day = ödülün alındığı gün anahtarı (günde bir kez alınır),
  // ts = son ödül alım zamanı, value = alım anındaki günlük sayaç.
  questClaims: {},
  // Season Pass ödül kutusu alımları: { "3_free": true, "5_vip": true }
  passClaims: {},
  // Pomodoro oturumu. state: idle (boşta) | running (çalışıyor) | paused (duraklatıldı).
  // "endAt" süre bitiş anıdır; böylece uygulama kapansa bile süre doğru işler.
  pomodoro: { state: 'idle', endAt: 0, remainingMs: POMODORO_DURATION_MS },
};

// Liderlik tablosunun açılma seviyesi ve o seviye için gereken kümülatif XP.
const LEADERBOARD_MIN_LEVEL = 5;
const LEADERBOARD_MIN_XP = 1000; // 100·5·4/2 = seviye 5 için toplam XP

// Supabase profil satırı → uygulamanın arkadaş/liderlik satırına dönüştürür.
// lastActive ISO tarih olarak gelir; karşılaştırmalar için "YYYY-MM-DD" yapılır.
function profileToPlayer(p) {
  return {
    id: p.id,
    name: p.username || p.name,
    emoji: p.emoji || '😀',
    streak: p.streak || 0,
    totalXp: p.xp ?? p.totalXp ?? 0,
    lastActive: p.lastActive ? dateKey(new Date(p.lastActive)) : null,
    avatarId: p.avatarId || null,
    frameId: p.frameId || null,
    // Katman 4: şüpheli kullanıcı bayrağı + 7 günlük XP trendi.
    flagged: !!p.flagged,
    flaggedReason: p.flaggedReason || p.flagged_reason || null,
    xp7d: p.xp7d || 0,
  };
}

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  // "Bugün" tarihi state olarak tutulur. Gece yarısı geçince (veya uygulama
  // arka plandan dönünce) güncellenir; tüm ekranlar otomatik yeni güne geçer.
  const [today, setToday] = useState(() => todayKey(INITIAL_STATE.settings.devOffset));
  // settingsRef: state güncellemesinden hemen sonra bile güncel ayarlara
  // erişmek için aynalar (async state'i beklemek zorunda kalmayız).
  const settingsRef = useRef(INITIAL_STATE.settings);
  // dataRef: senkron motoru en güncel veriyle çalışsın diye ayna.
  const dataRef = useRef(INITIAL_STATE);
  const { user: authUser, status: authStatus, ready: authReady } = useAuth();
  // authRef: memo'lu callback'ler bayat isim tutmasın diye ayna.
  const authRef = useRef(authUser);
  useEffect(() => {
    authRef.current = authUser;
  }, [authUser]);

  // Sunucu durumu: bağlantı + en son senkron + liderlik/arkadaş/istek verisi.
  // banned/banReason: hesap yasaklandıysa uygulama yasak ekranı gösterir.
  const [server, setServer] = useState({
    connected: false,
    syncing: false,
    lastSync: null,
    leaderboard: [],
    friends: [],
    requests: [],
    duels: [],
    banned: false,
    banReason: null,
  });

  // Seviye atlama olayı: { level, ts } — kutlama modalı bu değeri görünce açar.
  const [levelUpEvent, setLevelUpEvent] = useState(null);
  // Senkronizasyon bekliyor bayrağı: yerel veri değişti ama sunucuya henüz
  // aktarılmadı. Başarılı senkron bu bayrağı temizler; ekranlardaki
  // "Senkronizasyon Bekliyor" göstergesi bu değeri okur (tıklayınca manuel
  // senkron tetiklenir).
  const [pendingSync, setPendingSync] = useState(false);
  // Ekranın üstünden kayan bildirim kuyruğu (başarım + pomodoro ödülü).
  // Her öğe: { key, icon, title, color }.
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    settingsRef.current = data.settings;
    dataRef.current = data;
  }, [data]);

  // ---------- Sunucu önbelleği: açılışta son senkronu geri yükle ----------
  // Önbellek ayrıca serverCacheRef'e yazılır ki veri yükleme effect'i de
  // onu kullanabilsin (iki async etkinlik sırası garanti edilemez).
  const serverCacheRef = useRef(null);
  // Sunucu saati referansını yükle (uygulama açılışı — Katman 2).
  useEffect(() => {
    loadServerClock();
  }, []);
  // Delta senkron köprüsü (Katman 3): sunucunun onayladığı son toplamlar.
  // Bir sonraki sync'in deltası BUNLARDAN hesaplanır; mutlak değer değil
  // yalnızca fark sunucuya gönderilir (saat/veri oynatma koruması).
  // Hesaba özel anahtarda saklanır; sunucu önbelleğinden bağımsızdır.
  const syncAnchorRef = useRef({
    initialized: false,
    lastSyncedXp: 0,
    lastSyncedGold: 0,
    lastSyncedBank: 0,
  });

  // ---------- Hesap çözümleme ----------
  // Veri, önbellek ve senkron köprüsü AKTİF HESABA özeldir. Aktif hesap:
  // oturum açıkken authUser adıdır; oturum yoksa son bilinen hesaptır
  // (giriş ekranı o hesabın verisini önizler). authReady olmadan yüklenmez.
  const [activeAccount, setActiveAccount] = useState(null);
  const lastAccountRef = useRef(null);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LAST_ACCOUNT_KEY);
        if (raw) lastAccountRef.current = raw;
      } catch (e) {
        // Okunamadı: son hesap bilinmiyor demektir.
      }
      let next = 'varsayilan';
      if (authUser?.name) {
        next = authUser.name;
        // Hesap değiştirme sonrası giriş ekranı da o hesabı önizlesin.
        AsyncStorage.setItem(LAST_ACCOUNT_KEY, authUser.name).catch(() => {});
      } else if (authStatus === 'login') {
        next = lastAccountRef.current || 'varsayilan';
      }
      if (!cancelled) setActiveAccount(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, authUser?.name, authStatus]);

  // ---------- Yükleme: aktif hesabın verisi + önbellek + köprü + yedek ----------
  // Hesap değişince (çıkış → başka hesapla giriş) veri yeniden yüklenir.
  // Eski ortak anahtar (@habit_tracker_v2) yalnızca İLK hesaba taşınır (bir kez).
  useEffect(() => {
    if (!authReady || !activeAccount) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setData(INITIAL_STATE);
      setBackupTs(null);
      serverCacheRef.current = null;
      setServer((s) => ({
        ...s,
        connected: false,
        leaderboard: [],
        friends: [],
        requests: [],
        duels: [],
        banned: false,
        banReason: null,
      }));
      const dataKey = storageKeyFor(activeAccount);
      const cacheKey = serverCacheKeyFor(activeAccount);
      const anchorKey = syncAnchorKeyFor(activeAccount);
      const backupKey = userBackupKeyFor(activeAccount);
      try {
        // Senkron köprüsü: bu hesabın son onaylı toplamları.
        try {
          const raw = await AsyncStorage.getItem(anchorKey);
          if (raw) {
            const a = JSON.parse(raw);
            if (a && typeof a.lastSyncedXp === 'number' && typeof a.lastSyncedGold === 'number') {
              syncAnchorRef.current = {
                initialized: true,
                lastSyncedXp: a.lastSyncedXp,
                lastSyncedGold: a.lastSyncedGold,
                lastSyncedBank: a.lastSyncedBank || 0,
              };
            }
          }
        } catch (e) {
          console.warn('Senkron köprüsü okunamadı:', e);
        }
        // Sunucu önbelleği: liderlik/arkadaş/istek görüntüsü.
        try {
          const raw = await AsyncStorage.getItem(cacheKey);
          if (raw) {
            const c = JSON.parse(raw);
            if (c && Array.isArray(c.leaderboard)) {
              serverCacheRef.current = c;
              if (!cancelled) {
                setServer((s) => ({
                  ...s,
                  leaderboard: c.leaderboard,
                  friends: Array.isArray(c.friends) ? c.friends : [],
                  requests: Array.isArray(c.requests) ? c.requests : [],
                  lastSync: c.savedAt || null,
                }));
              }
            }
          }
        } catch (e) {
          console.warn('Sunucu önbelleği okunamadı:', e);
        }
        // Kullanıcı yedeği zamanı ("Son yedek" bilgisi).
        try {
          const raw = await AsyncStorage.getItem(backupKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.ts) setBackupTs(parsed.ts);
          }
        } catch (e) {
          console.warn('Yedek bilgisi okunamadı:', e);
        }
        // Kullanıcı verisi (anahtar hesaba özel).
        let raw = await AsyncStorage.getItem(dataKey);
        // İlk açılış taşıması: eski ortak anahtar varsa aktif hesaba taşı.
        if (!raw) {
          const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacyRaw) {
            await AsyncStorage.setItem(dataKey, legacyRaw).catch(() => {});
            await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
            raw = legacyRaw;
          }
        }
        if (raw) {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            // Bozuk (corrupt) veri: silmek yerine yedek anahtara kopyala.
            await AsyncStorage.setItem(backupKey, raw);
            console.warn('Kayıtlı veri okunamadı, yedeğe alındı. Sıfırdan başlanacak.');
            if (!cancelled) setLoading(false);
            return;
          }
          if (!cancelled) {
            setData({
              habits: Array.isArray(parsed.habits) ? parsed.habits : [],
              // Eski kayıtlarda pomodoroCount/gold yoktur; varsayılanla birleştir.
              stats: {
                totalXp: parsed.stats?.totalXp || 0,
                pomodoroCount: parsed.stats?.pomodoroCount || 0,
                gold: parsed.stats?.gold || 0,
                day: parsed.stats?.day || INITIAL_STATE.stats.day,
                streakAwards: parsed.stats?.streakAwards || {},
                xpBank: parsed.stats?.xpBank || 0,
              },
              settings: { ...INITIAL_STATE.settings, ...(parsed.settings || {}) },
              friends: serverCacheRef.current
                ? serverCacheRef.current.friends || []
                : Array.isArray(parsed.friends)
                  ? parsed.friends
                  : [],
              players: serverCacheRef.current
                ? serverCacheRef.current.leaderboard
                : Array.isArray(parsed.players)
                  ? parsed.players
                  : [],
              achievements: Array.isArray(parsed.achievements)
                ? parsed.achievements
                : [],
              ownedAvatars: Array.isArray(parsed.ownedAvatars)
                ? parsed.ownedAvatars
                : INITIAL_STATE.ownedAvatars,
              ownedThemes: Array.isArray(parsed.ownedThemes)
                ? parsed.ownedThemes
                : INITIAL_STATE.ownedThemes,
              ownedFrames: Array.isArray(parsed.ownedFrames)
                ? parsed.ownedFrames
                : INITIAL_STATE.ownedFrames,
              ownedBadges: Array.isArray(parsed.ownedBadges)
                ? parsed.ownedBadges
                : [],
              // Yeni nesil görev sistemi: yalnızca bilinen görev id'leri yüklenir
              // (eski 60 görevlik katalog kayıtları atılır).
              questClaims:
                parsed.questClaims &&
                typeof parsed.questClaims === 'object' &&
                !Array.isArray(parsed.questClaims)
                  ? Object.fromEntries(
                      Object.entries(parsed.questClaims).filter(([id]) =>
                        [...DAILY_QUESTS, ...VIP_QUESTS].some((q) => q.id === id)
                      )
                    )
                  : {},
              passClaims:
                parsed.passClaims &&
                typeof parsed.passClaims === 'object' &&
                !Array.isArray(parsed.passClaims)
                  ? parsed.passClaims
                  : {},
              pomodoro: { ...INITIAL_STATE.pomodoro, ...(parsed.pomodoro || {}) },
            });
          }
        }
      } catch (e) {
        // Depolama erişimi tamamen başarısızsa bile uygulama boş veriyle açılır.
        console.warn('Veri yüklenirken hata oluştu:', e);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeAccount, authReady]);

  // ---------- Kaydetme: veri her değiştiğinde aktif hesaba yaz ----------
  useEffect(() => {
    if (loading || !activeAccount) return;
    AsyncStorage.setItem(
      storageKeyFor(activeAccount),
      JSON.stringify({ version: DATA_VERSION, ...data })
    ).catch((e) => console.warn('Veri kaydedilirken hata oluştu:', e));
  }, [data, loading, activeAccount]);

  // ---------- Senkronizasyon bekliyor takibi ----------
  // Yerel veri her değiştiğinde (oturum açıkken) "bekliyor" bayrağı
  // kaldırılır yalnızca başarılı senkronda. Böylece kullanıcı çevrimdışı
  // işlem yaptığında göstergede "Senkronizasyon Bekliyor" görünür.
  useEffect(() => {
    if (!loading && authStatus === 'in' && activeAccount) {
      setPendingSync(true);
    }
  }, [data, loading, authStatus, activeAccount]);

  // ---------- Gün takibi: gece yarısı geçişini algıla ----------
  useEffect(() => {
    // Tarih gerçekten değiştiyse state'i güncelle (aksi halde aynı bırak).
    // Test paneli gün kaydırdıysa (devOffset) o fark da hesaba katılır.
    // Gün SUNUCU saatinden hesaplanır: cihaz saati ileri alınınca gün
    // atlamaz, ödül pencereleri saat oynatmayla açılamaz.
    const syncToday = () =>
      setToday((prev) => {
        const t = todayKey(settingsRef.current.devOffset || 0, serverNow());
        return t === prev ? prev : t;
      });
    // Dakikada bir kontrol: uygulama açıkken gece yarısı geçerse ekran
    // otomatik yeni güne geçer (seriler ve "bugün" durumu sıfırlanır).
    const interval = setInterval(syncToday, 60000);
    // Uygulama arka plandan öne döndüğünde de hemen kontrol et.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncToday();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  // Gün kayması (devOffset) değişince "bugün"ü hemen senkronla.
  useEffect(() => {
    setToday((prev) => {
      const t = todayKey(data.settings.devOffset || 0, serverNow());
      return t === prev ? prev : t;
    });
  }, [data.settings.devOffset]);

  // ---------- Yardımcılar (test günü kaymasını hesaba katar) ----------

  // Eksik görev cezası: "forDay" gününde tamamlanmayan her görev için
  // PENALTY_COINS altın kesilir (bakiye 0'ın altına inmez). Ayarlardan
  // kapatılabilir (settings.penaltyEnabled).
  const applyPenaltyFor = useCallback(
    (forDay) => {
      if (!forDay || !data.settings.penaltyEnabled) return;
      const p = dayPenalty(data.habits, forDay, PENALTY_COINS);
      if (p.count === 0) return;
      setData((d) => ({
        ...d,
        stats: { ...d.stats, gold: Math.max(0, (d.stats.gold || 0) - p.deducted) },
      }));
      setToasts((prev) => [
        ...prev,
        {
          key: `penalty_${forDay}_${Date.now()}`,
          icon: '📉',
          title: `${p.count} görev tamamlanmadı: -${p.deducted} 🪙 kesildi`,
          color: COLORS.danger,
        },
      ]);
    },
    [data.habits, data.settings.penaltyEnabled]
  );

  // Gün state'i değiştiğinde (gece yarısı, uygulama öne dönünce) ÖNCEKİ
  // günün eksik görevleri için ceza uygulanır. Açık uygulamada gece yarısı
  // geçtiğinde ve gün kayması olduğunda otomatik çalışır.
  const prevDayRef = useRef(today);
  useEffect(() => {
    if (loading || prevDayRef.current === today) {
      if (!loading) prevDayRef.current = today;
      return;
    }
    const prevDay = prevDayRef.current;
    prevDayRef.current = today;
    if (prevDay) applyPenaltyFor(prevDay);
  }, [today, loading, applyPenaltyFor]);

  // Uygulama kapalıyken günler geçtiyse: yükleme bitince son aktif günün
  // eksikleri için bir kez ceza uygulanır (her kayıp gün için değil).
  const appliedLoadPenaltyRef = useRef(false);
  useEffect(() => {
    if (loading || appliedLoadPenaltyRef.current) return;
    appliedLoadPenaltyRef.current = true;
    const day = data.stats.day;
    if (day && day.key && day.key !== today) applyPenaltyFor(day.key);
  }, [loading, data.stats.day, today, applyPenaltyFor]);

  // Günlük hatırlatma: ayarlanan saat geldiğinde ekran üstünden uyarı
  // gösterilir (uygulama açıkken; gerçek OS bildirimi için ayrı paket gerekir).
  const lastReminderRef = useRef(null);
  useEffect(() => {
    const hour = data.settings.reminderHour;
    if (hour == null) return;
    const check = () => {
      const now = new Date();
      if (now.getHours() !== hour) return;
      const key = `${dateKey(now)}:${hour}`;
      if (lastReminderRef.current === key) return;
      lastReminderRef.current = key;
      setToasts((prev) => [
        ...prev,
        {
          key: `reminder_${key}_${Date.now()}`,
          icon: '⏰',
          title: 'Hatırlatma: bugünkü alışkanlıklarını tamamladın mı?',
          color: COLORS.xp,
        },
      ]);
    };
    const id = setInterval(check, 30000);
    check();
    return () => clearInterval(id);
  }, [data.settings.reminderHour]);

  // ---------- Yedekleme (kullanıcı isteğiyle) ----------
  // "Yedekle": verinin anlık kopyasını hesaba özel ayrı anahtara yazar.
  // "Geri Yükle": o kopyayı geri getirir. Son yedek zamanı "backupTs" tutulur
  // (yükleme effect'i bu anahtarı açılışta okur).
  const [backupTs, setBackupTs] = useState(null);

  const backupData = useCallback(async () => {
    const payload = { ts: Date.now(), data };
    const key = userBackupKeyFor(authRef.current?.name || activeAccount || 'varsayilan');
    await AsyncStorage.setItem(key, JSON.stringify(payload)).catch(
      (e) => console.warn('Yedekleme yazılamadı:', e)
    );
    setBackupTs(payload.ts);
    return { ok: true };
  }, [data, activeAccount]);

  const restoreData = useCallback(async () => {
    try {
      const key = userBackupKeyFor(authRef.current?.name || activeAccount || 'varsayilan');
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return { ok: false, error: 'Yedek bulunamadı' };
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return { ok: false, error: 'Yedek bozuk' };
      const saved = parsed.data;
      setData({
        ...INITIAL_STATE,
        ...saved,
        stats: { ...INITIAL_STATE.stats, ...(saved.stats || {}), streakAwards: saved.stats?.streakAwards || {} },
        settings: { ...INITIAL_STATE.settings, ...(saved.settings || {}) },
        pomodoro: { ...INITIAL_STATE.pomodoro, ...(saved.pomodoro || {}) },
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Geri yükleme sırasında hata oluştu' };
    }
  }, []);

  // Test panelinin gün kaydırma değeriyle hesaplanan "bugün" anahtarı.
  // ZAMAN FARM'I KORUMASI: ekonomi kararı SUNUCU saatine dayanır
  // (serverClock). Cihaz saati ileri alınsa bile "bugün" sunucuya göre
  // hesaplanır; böylece aynı gün tekrarı çifte ödül vermez. Gün kayması
  // (devOffset) yalnızca test/panel amaçlıdır ve sunucu saatine eklenir.
  const offsetToday = useCallback(
    () => todayKey(settingsRef.current.devOffset || 0, serverNow()),
    []
  );

  // ---------- Seviye atlama takibi ----------
  // XP arttığında seviye yükseldiyse "levelUpEvent" oluştur; kök seviyede
  // render edilen LevelUpModal bunu algılayıp kutlama ekranını gösterir.
  // Not: prevLevelRef ile yalnızca ARTAN seviyeyi yakalarız (düşüşte yok).
  const prevLevelRef = useRef(null);
  useEffect(() => {
    const lvl = levelFromTotalXp(data.stats.totalXp).level;
    const prev = prevLevelRef.current;
    prevLevelRef.current = lvl;
    if (prev !== null && lvl > prev) {
      setLevelUpEvent({ level: lvl, ts: Date.now() });
    }
  }, [data.stats.totalXp]);

  // ---------- Başarım kontrolü ----------
  // Veri veya "bugün" her değiştiğinde şartları yeniden değerlendirir.
  // Yeni açılan başarımlar hem listeye eklenir (AsyncStorage'a kaydedilir)
  // hem de ekranın üstünde kısa bir bildirim (toast) ile duyurulur.
  useEffect(() => {
    if (loading) return;
    const newly = evaluateAchievements(data, today);
    if (newly.length === 0) return;
    const rewardSum = newly.reduce((s, a) => s + (a.reward || 0), 0);
    setData((d) => ({
      ...d,
      achievements: [
        ...d.achievements,
        ...newly.map((a) => a.id).filter((id) => !d.achievements.includes(id)),
      ],
      // Başarımlar altın da kazandırır → dükkanda avatar/tema satın alınır.
      stats: bumpDay(
        { ...d.stats, gold: (d.stats.gold || 0) + rewardSum },
        today,
        { goldEarned: rewardSum }
      ),
    }));
    setToasts((prev) => [
      ...prev,
      ...newly.map((a) => ({
        key: `ach_${a.id}_${Date.now()}`,
        icon: a.icon,
        title: `${a.title} başarımını açtın! +${a.reward || 0} 🪙`,
        color: COLORS.gold,
      })),
    ]);
  }, [data, loading, today]);

  // ---------- Pomodoro: uygulama kapalıyken süre dolduysa ödül ver ----------
  // Kullanıcı zamanlayıcıyı çalıştırıp uygulamayı kapattıysa, tekrar açtığında
  // oturum devam eder; süre dolmuşsa XP ödülü burada otomatik verilir.
  useEffect(() => {
    if (loading || data.pomodoro.state !== 'running') return;
    if (data.pomodoro.endAt - serverNow() <= 0) completePomodoro();
  }, [loading, data.pomodoro]);

  // ---------- Eylemler (actions) ----------

  // Yeni alışkanlık ekler. Emoji ve renk kullanıcının seçimidir.
  // Anti-farm (Katman 1): aktif alışkanlık sayısı MAX_ACTIVE_HABITS ile
  // sınırlıdır — sınırsız alışkanlık + toplu tamamlama = sınırsız XP/altın
  // farm'ını engeller. Limit aşılınca { ok:false } döner (modal uyarır).
  const addHabit = useCallback((name, emoji, color) => {
    if (dataRef.current.habits.length >= MAX_ACTIVE_HABITS) {
      return { ok: false, error: `En fazla ${MAX_ACTIVE_HABITS} alışkanlık oluşturabilirsin` };
    }
    const habit = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      emoji,
      color,
      createdAt: offsetToday(),
      completedDates: [],
    };
    setData((d) => ({ ...d, habits: [habit, ...d.habits] }));
    return { ok: true };
  }, []);

  // Alışkanlığı tamamlar veya (aynı gün tekrar dokunursa) tamamlamayı geri alır.
  // - Tamamla: bugünün tarihini completedDates'a ekler ve +XP verir.
  // - Geri al: tarihi çıkarır ve -XP yapar (seviye düşmez, RPG kuralı).
  // Not: updater fonksiyonunun içinde offsetToday() çağrılır, böylece gece yarısı
  // 1-2 saniyelik gecikme olsa bile dokunuş anındaki doğru gün yazılır.
  const toggleHabit = useCallback((id) => {
    setData((d) => {
      const today = offsetToday();
      const xp = d.settings.xpPerHabit;
      const gold = GOLD_RATES.habit;
      // Günlük tavan hesabı için bugünün sayaçları (gün değiştiyse sıfır).
      const dayBase =
        d.stats.day && d.stats.day.key === today
          ? d.stats.day
          : emptyDayCounter(today);
      let totalXp = d.stats.totalXp;
      let totalGold = d.stats.gold || 0;
      let xpBank = d.stats.xpBank || 0;
      // Günlük görev sayaçlarına işlenecek değişim (tamamla/geri al).
      let dayDelta = { completions: 0, goldEarned: 0, xpEarned: 0 };
      // Seri ödülü tost bildirimi (updater dışına taşınır).
      let streakToast = null;
      // Kumbara bildirimi: tavanı aşan kısım bankaya aktarılınca gösterilir.
      let bankToast = null;
      const streakAwards = { ...(d.stats.streakAwards || {}) };
      // Kumbara kuralı map dışında hesaplanır (geri alma yolunda kullanılmaz).
      const bankState = applyXpWithBank(dayBase, xpBank, xp);
      let done = false;
      const habits = d.habits.map((h) => {
        if (h.id !== id) return h;
        done = h.completedDates.includes(today);
        if (done) {
          // Geri al: kazanılan XP/altın iade edilir, tavan geri açılır.
          totalXp = Math.max(0, totalXp - xp);
          totalGold = Math.max(0, totalGold - gold);
          dayDelta = { completions: -1, goldEarned: -gold, xpEarned: -xp };
        } else {
          // ANTI-FARM (Katman 1): günlük tavan doluysa alışkanlık XP'sinin
          // tavanı aşan kısmı yanmaz — KUMBARADA birikir; ayrıca o gün
          // bankadan 500'e kadar XP "azar azar" geri verilir.
          const xpGain = bankState.freshXp + bankState.releaseXp;
          xpBank = bankState.bank;
          const goldGain = Math.min(gold, Math.max(0, DAILY_GOLD_CAP - dayBase.goldEarned));
          // SERİ ÖDÜLÜ: 3/7/14/30/60 gün eşikleri yakalanınca bonus XP+altın.
          // streakAwards alışkanlık başına en son ödüllenen eşiği tutar;
          // seri korunsa bile aynı eşik bir daha ödenmez (farm koruması).
          // Bonus günlük tavandan MUAFTIR (eşik zaten bir kez ödenir).
          const newDates = [...h.completedDates, today];
          const newStreak = calcStreak(newDates, today);
          const awarded = streakAwards[id] || 0;
          const bonus = newStreak > awarded ? streakBonusFor(newStreak) : null;
          let bonusXp = 0;
          let bonusGold = 0;
          if (bonus) {
            bonusXp = bonus.xp;
            bonusGold = bonus.gold;
            streakAwards[id] = newStreak;
            streakToast = { streak: newStreak, xp: bonusXp, gold: bonusGold };
          }
          totalXp += xpGain + bonusXp;
          totalGold += goldGain + bonusGold;
          dayDelta = {
            completions: 1,
            goldEarned: goldGain + bonusGold,
            xpEarned: 0, // kumbara kuralı stats.day'a doğrudan işlenir
          };
          if (bankState.overflow > 0) {
            bankToast = { overflow: bankState.overflow };
          }
        }
        return {
          ...h,
          completedDates: done
            ? h.completedDates.filter((x) => x !== today)
            : [...h.completedDates, today],
        };
      });
      // Seri ödülü bildirimi (updater içinde side effect yapılmaz).
      if (streakToast) {
        queueMicrotask(() => {
          setToasts((prev) => [
            ...prev,
            {
              key: `streak_${id}_${Date.now()}`,
              icon: '🔥',
              title: `${streakToast.streak} günlük seri! +${streakToast.xp} XP, +${streakToast.gold} 🪙`,
              color: COLORS.danger,
            },
          ]);
        });
      }
      // Kumbara bildirimi: tavanı aşan XP bankaya aktarıldı.
      if (bankToast) {
        queueMicrotask(() => {
          setToasts((prev) => [
            ...prev,
            {
              key: `bank_${id}_${Date.now()}`,
              icon: '💼',
              title: `Sınıra takıldı: +${bankToast.overflow} XP kumbarada birikti`,
              color: COLORS.xp,
            },
          ]);
        });
      }
      // Görev sayaçlarını güncelle (gün değiştiyse otomatik sıfırlanır).
      const stats = bumpDay(
        { ...d.stats, totalXp, gold: totalGold, streakAwards, xpBank },
        today,
        dayDelta
      );
      // Kumbara kuralının gün sayaçları (xpEarned + bankReleased) doğrudan işlenir.
      if (!done) {
        stats.day = {
          ...stats.day,
          xpEarned: bankState.day.xpEarned,
          bankReleased: bankState.day.bankReleased,
        };
      }
      return { ...d, habits, stats };
    });
  }, []);

  // Alışkanlığı kalıcı olarak siler.
  const deleteHabit = useCallback((id) => {
    setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) }));
  }, []);

  // ---------- Sunucu senkron motoru ----------
  // dataRef üzerinden çalışır (her zaman güncel veri) ve sonuçları
  // "server" state'ine + AsyncStorage önbelleğine yazar. Hatalar sessizce
  // yutulur; bağlantı kurulamazsa connected:false olarak kalır.
  const serverRef = useRef(server);
  useEffect(() => {
    serverRef.current = server;
  }, [server]);
  const seenRequestIdsRef = useRef(new Set());
  const pushRef = useRef(false);
  const syncTimerRef = useRef(null);

  // Profili sunucuya delta olarak yayınlar (Katman 3). Sunucu, kabul
  // edilen miktarı günlük tavanla kıstırıp kendi toplamlarına ekler;
  // köprü (syncAnchor) her sync sonrası SUNUCU değerleriyle güncellenir.
  const publishProfile = useCallback(async (name, snap) => {
    const anchor = syncAnchorRef.current;
    if (!anchor.initialized) {
      // İlk senkron: sunucudaki mevcut toplamları köprü olarak al (eski
      // veri kaybolmasın; yalnızca aradaki FARK tavan kontrolüne girer).
      const sp = await getServerProfile(name);
      anchor.lastSyncedXp = sp?.xp ?? 0;
      anchor.lastSyncedGold = sp?.coins ?? 0;
      anchor.lastSyncedBank = sp?.bank ?? 0;
      anchor.initialized = true;
    }
    // Taze cihaz koruması: yerel toplamlar 0'ken (yeni kurulum / geri
    // yükleme sonrası) negatif delta GÖNDERME — sunucudaki mevcut XP ve
    // altın silinmesin. Aksi halde temiz kurulum aynı kullanıcı adıyla
    // girince tüm birikim sıfırlanırdı (admin ödülleri dahil).
    const freshDevice = snap.stats.totalXp === 0 && anchor.lastSyncedXp > 0;
    const freshDeviceGold = snap.stats.gold === 0 && anchor.lastSyncedGold > 0;
    // KUMBARA delta'sı: son senkrondan bu yana kumbaranın NET değişimi
    // (taşan XP eklendi + boşaltılan XP düşüldü). Sunucu aynı kuralı
    // uygular, böylece iki taraf bakiyesi hiç ayrışmaz.
    const bankDelta = freshDevice
      ? 0
      : Math.round((snap.stats.xpBank || 0) - (anchor.lastSyncedBank || 0));
    const r = await updateProfileData(name, {
      deltaXp: freshDevice ? 0 : snap.stats.totalXp - anchor.lastSyncedXp,
      deltaGold: freshDeviceGold ? 0 : snap.stats.gold - anchor.lastSyncedGold,
      bankDelta,
      totalXp: snap.stats.totalXp, // geçiş dönemi fallback'i için
      totalGold: snap.stats.gold, // geçiş dönemi fallback'i için
      claimedDay: offsetToday(),
    });
    if (!r.ok) return { ok: false, warn: r.warn, error: r.error };
    const d = r.data || {};
    anchor.lastSyncedXp = typeof d.serverXp === 'number' ? d.serverXp : anchor.lastSyncedXp;
    anchor.lastSyncedGold = typeof d.serverGold === 'number' ? d.serverGold : anchor.lastSyncedGold;
    anchor.lastSyncedBank = typeof d.serverBank === 'number' ? d.serverBank : anchor.lastSyncedBank;
    AsyncStorage.setItem(
      syncAnchorKeyFor(name),
      JSON.stringify({
        lastSyncedXp: anchor.lastSyncedXp,
        lastSyncedGold: anchor.lastSyncedGold,
        lastSyncedBank: anchor.lastSyncedBank,
      })
    ).catch(() => {});
    return { ok: true, warn: r.warn };
  }, []);

  // Sunucudaki kendi profili oku: ban durumunu uygula + admin hediyelerini
  // yerel envantere (ownedThemes/ownedAvatars/ownedFrames) birleştir.
  const refreshServerMeta = useCallback(async (name) => {
    const sp = await getServerProfile(name);
    if (!sp) return false;
    const grants = sp.grantedItems || [];
    if (grants.length > 0) {
      setData((d) => {
        const ownedAvatars = [...d.ownedAvatars];
        const ownedThemes = [...d.ownedThemes];
        const ownedFrames = [...d.ownedFrames];
        let changed = false;
        for (const g of grants) {
          if (g?.type === 'avatar' && g?.id && !ownedAvatars.includes(g.id)) {
            ownedAvatars.push(g.id);
            changed = true;
          } else if (g?.type === 'theme' && g?.id && !ownedThemes.includes(g.id)) {
            ownedThemes.push(g.id);
            changed = true;
          } else if (g?.type === 'frame' && g?.id && !ownedFrames.includes(g.id)) {
            ownedFrames.push(g.id);
            changed = true;
          }
        }
        return changed ? { ...d, ownedAvatars, ownedThemes, ownedFrames } : d;
      });
    }
    setServer((s) => ({
      ...s,
      banned: !!sp.banned,
      banReason: sp.banReason || null,
    }));
    return true;
  }, []);

  const pullServer = useCallback(async () => {
    const name = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
    const [lb, fr, rq, dl] = await Promise.all([
      getLeaderboardData(name),
      getFriends(name),
      getFriendRequests(name),
      getMyDuels(name),
    ]);
    if (!lb.ok) return false;
    const board = (lb.leaderboard || []).map(profileToPlayer);
    let friends = fr.ok ? (fr.friends || []).map(profileToPlayer) : [];
    let requests = rq.ok ? (rq.requests || []) : [];
    let duels = dl.ok ? (dl.duels || []) : [];
    const gotMeta = fr.ok && rq.ok;
    // Yeni gelen istekler için tek seferlik bildirim (toast).
    if (requests.length > 0) {
      for (const req of requests) {
        if (!seenRequestIdsRef.current.has(req.requestId)) {
          seenRequestIdsRef.current.add(req.requestId);
          setToasts((prev) => [
            ...prev,
            {
              key: `fr_${req.requestId}_${Date.now()}`,
              icon: '🔔',
              title: `${req.name} arkadaşlık isteği gönderdi`,
              color: COLORS.accent,
            },
          ]);
        }
      }
    } else {
      // Boş liste geldiğinde eskileri unut ki tekrar gelince tekrar bildirilsin.
      seenRequestIdsRef.current.clear();
    }
    const friendsMapped = friends;
    const savedAt = Date.now();
    const patch = {
      leaderboard: board,
      friends: friendsMapped,
      requests,
      duels,
      lastSync: savedAt,
    };
    setServer((s) => ({ ...s, ...patch, connected: true }));
    await AsyncStorage.setItem(
      serverCacheKeyFor(name),
      JSON.stringify({ ...patch, savedAt })
    ).catch(() => {});
    if (gotMeta) setData((d) => ({ ...d, players: board, friends: friendsMapped }));
    return true;
  }, []);

  const runSync = useCallback(async () => {
    if (pushRef.current) return;
    pushRef.current = true;
    // "refreshing" göstergesi: çek-yenile (pull-to-refresh) bu state'i okur.
    setServer((s) => ({ ...s, syncing: true }));
    try {
      const snap = dataRef.current;
      const name = authRef.current?.name || snap.settings.name || 'Kullanıcı';
      const published = await publishProfile(name, snap);
      if (!published.ok) {
        // Yasak yanıtı: ban durumunu hemen uygula (uygulama yasak ekranı gösterir).
        if (published.error === 'banned') {
          await refreshServerMeta(name);
          setServer((s) => ({ ...s, connected: true }));
        } else {
          setServer((s) => ({ ...s, connected: false }));
        }
        return;
      }
      // Sunucu saat uyarısı: cihaz tarihi ileri alınmış görünüyorsa
      // bilgilendir (ödüller sunucu tarafında zaten kıstırıldı).
      if (published.warn === 'clock_ahead') {
        setToasts((prev) => [
          ...prev,
          {
            key: `clock_${Date.now()}`,
            icon: '🕐',
            title: 'Cihaz tarihi ileri alınmış görünüyor — cihaz saatini düzelt',
            color: COLORS.danger,
          },
        ]);
      }
      await refreshServerMeta(name);
      await pullServer();
      setServer((s) => ({ ...s, connected: true }));
      // Yerel veri sunucuya aktarıldı → "bekliyor" bayrağı temizlenir.
      // Senkron sırasında veri değiştiyse (referans farkı) beklemeye devam eder.
      if (dataRef.current === snap) setPendingSync(false);
    } catch (e) {
      setServer((s) => ({ ...s, connected: false }));
    } finally {
      pushRef.current = false;
      setServer((s) => ({ ...s, syncing: false }));
    }
  }, [publishProfile, pullServer, refreshServerMeta]);

  // Arkadaşlığı kaldırır (Supabase'de iki yönlü, kullanıcı adıyla).
  const removeFriend = useCallback(
    async (name) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await supabaseRemoveFriend(me, name);
      if (r.ok) {
        await pullServer();
        return { ok: true };
      }
      return { ok: false, error: r.error || 'Kaldırılamadı' };
    },
    [pullServer]
  );

  // Giriş yapıldığında veya isim değiştiğinde senkronla.
  useEffect(() => {
    if (authStatus === 'in') {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(runSync, 500);
    }
    return () => clearTimeout(syncTimerRef.current);
  }, [authStatus, runSync]);

  // Uygulama ön plana döndüğünde tazele.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(runSync, 400);
      }
    });
    return () => sub.remove();
  }, [runSync]);

  // Periyodik tazeleme (60 sn) — arkadaşların ve isteklerin güncel kalması için.
  useEffect(() => {
    const iv = setInterval(() => {
      if (authRef.current?.name) runSync();
    }, 60000);
    return () => clearInterval(iv);
  }, [runSync]);

  // Bekleyen isteği onaylar → arkadaş olunur (Supabase).
  const acceptRequest = useCallback(
    async (requestId) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await acceptFriendRequest(me, requestId);
      if (r.ok) {
        await pullServer();
        const friendName = r.friendUsername;
        if (friendName) {
          setToasts((prev) => [
            ...prev,
            {
              key: `fa_${requestId}_${Date.now()}`,
              icon: '🎉',
              title: `${friendName} ile artık arkadaşsınız`,
              color: COLORS.accent,
            },
          ]);
        }
        return { ok: true, friend: friendName ? { name: friendName } : undefined };
      }
      return { ok: false, error: r.error || 'Onaylanamadı' };
    },
    [pullServer]
  );

  // Bekleyen isteği reddeder (Supabase).
  const declineRequest = useCallback(
    async (requestId) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await declineFriendRequest(me, requestId);
      if (r.ok) {
        await pullServer();
        return { ok: true };
      }
      return { ok: false, error: r.error || 'Reddedilemedi' };
    },
    [pullServer]
  );

  // Kullanıcı adına arkadaşlık isteği gönderir (Supabase).
  // Sonuç: pending (gönderildi) | already_friends | already_pending | not_found
  const requestFriend = useCallback(async (name) => {
    const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
    const r = await sendFriendRequest(me, name);
    if (r.ok) return { ok: true, state: r.state || 'pending' };
    return { ok: false, state: r.state || 'error', error: r.error || 'İstek gönderilemedi' };
  }, []);

  // ---------- Düello eylemleri (7 günlük XP yarışı) ----------
  // Tüm kararlar "duel-action" edge function'ında (servis rolüyle) alınır;
  // burada yalnızca çağrı + sonuç listesini tazeleme yapılır.

  // Arkadaşını düelloya davet eder.
  const challengeDuel = useCallback(
    async (opponent) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await challengeFriend(me, opponent);
      if (r.ok) {
        await pullServer();
        return { ok: true };
      }
      return { ok: false, error: r.error || 'Düello başlatılamadı' };
    },
    [pullServer]
  );

  // Gelen daveti kabul eder (düello aktifleşir).
  const acceptDuel = useCallback(
    async (duelId) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await acceptDuelReq(me, duelId);
      if (r.ok) {
        await pullServer();
        return { ok: true };
      }
      return { ok: false, error: r.error || 'Düello kabul edilemedi' };
    },
    [pullServer]
  );

  // Gelen daveti reddeder.
  const declineDuel = useCallback(
    async (duelId) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await declineDuelReq(me, duelId);
      if (r.ok) {
        await pullServer();
        return { ok: true };
      }
      return { ok: false, error: r.error || 'Düello reddedilemedi' };
    },
    [pullServer]
  );

  // Bitiş saatinden sonra kazananı belirletir; sunucu ödülü verir.
  // Sonuç: { ok, winner, reward } — kazanan bensem +XP/altın tost atılır.
  const finishDuel = useCallback(
    async (duelId) => {
      const me = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
      const r = await finishDuelReq(me, duelId);
      if (!r.ok) return { ok: false, error: r.error || 'Düello bitirilemedi' };
      await pullServer();
      const d = r.data || {};
      if (d.winner && d.winner === me && d.reward) {
        setToasts((prev) => [
          ...prev,
          {
            key: `duel_win_${Date.now()}`,
            icon: '⚔️',
            title: `Düelloyu kazandın! +${d.reward.xp} XP, +${d.reward.gold} 🪙`,
            color: COLORS.gold,
          },
        ]);
      } else if (d.winner && d.winner !== me) {
        setToasts((prev) => [
          ...prev,
          {
            key: `duel_lose_${Date.now()}`,
            icon: '⚔️',
            title: `Düelloyu ${d.winner} kazandı — bir dahaki sefere!`,
            color: COLORS.danger,
          },
        ]);
      }
      return { ok: true, winner: d.winner || null, reward: d.reward || null };
    },
    [pullServer]
  );

  // Sunucudan veriyi elle tazeler (profil yayınlar + her şeyi çeker).
  const refreshServer = useCallback(async () => {
    await runSync();
  }, [runSync]);

  // Eksik görev cezasını (gün sonu -15 🪙) açıp kapatır.
  const setPenaltyEnabled = useCallback((enabled) => {
    setData((d) => ({
      ...d,
      settings: { ...d.settings, penaltyEnabled: !!enabled },
    }));
  }, []);

  // Günlük hatırlatma saatini ayarlar (0-23, null = kapalı).
  // Uygulama açıkken o saat geldiğinde ekran üstünden hatırlatma gösterilir.
  const setReminderHour = useCallback((hour) => {
    setData((d) => ({
      ...d,
      settings: {
        ...d.settings,
        reminderHour: hour == null ? null : Math.min(23, Math.max(0, hour)),
      },
    }));
  }, []);

  // OS bildirimi ("Kapalıyken de hatırlatsın") anahtarını kalıcı yapar.
  // Bildirimin planlanması/iptali SettingsScreen tarafında yapılır;
  // burada yalnızca ayar durumu kaydedilir.
  const setOsNotify = useCallback((value) => {
    setData((d) => ({
      ...d,
      settings: { ...d.settings, osNotify: !!value },
    }));
  }, []);

  // ---------- Pomodoro eylemleri ----------
  // Oturum "timestamp" tabanlı çalışır: bitiş anı (endAt) saklanır, kalan süre
  // her an SUNUCU saatine (serverNow) göre hesaplanır. Böylece arka plana
  // geçilse veya uygulama kapatılsa bile sayaç doğru kalır; cihaz saati geri
  // alınsa bile süre 25 dakikayı aşamaz (saat oynatma koruması).

  // Boştaysa sayacı başlatır (duraklatılmıştan devam etme ayrı fonksiyonda).
  const startPomodoro = useCallback(() => {
    setData((d) => {
      if (d.pomodoro.state === 'running') return d;
      const base = Math.min(POMODORO_DURATION_MS, d.pomodoro.remainingMs || POMODORO_DURATION_MS);
      return {
        ...d,
        pomodoro: {
          state: 'running',
          endAt: serverNow() + base,
          remainingMs: base,
        },
      };
    });
  }, []);

  // Kalan süreyi hesaplayıp oturumu duraklatır.
  const pausePomodoro = useCallback(() => {
    setData((d) => {
      if (d.pomodoro.state !== 'running') return d;
      return {
        ...d,
        pomodoro: {
          state: 'paused',
          endAt: 0,
          remainingMs: Math.max(0, Math.min(POMODORO_DURATION_MS, d.pomodoro.endAt - serverNow())),
        },
      };
    });
  }, []);

  // Duraklatılmış oturumu kaldığı yerden devam ettirir.
  const resumePomodoro = useCallback(() => {
    setData((d) => {
      if (d.pomodoro.state !== 'paused') return d;
      return {
        ...d,
        pomodoro: {
          state: 'running',
          endAt: serverNow() + d.pomodoro.remainingMs,
          remainingMs: d.pomodoro.remainingMs,
        },
      };
    });
  }, []);

  // Oturumu sıfırlar (tam 25 dakikaya döner).
  const resetPomodoro = useCallback(() => {
    setData((d) => ({
      ...d,
      pomodoro: { state: 'idle', endAt: 0, remainingMs: POMODORO_DURATION_MS },
    }));
  }, []);

  // Süre dolunca XP ödülü verir ve oturumu temizler. Hem bileşen sayacı hem
  // de "uygulama kapalıyken süre doldu" efekti çağırabilir; içerideki kontroller
  // (state kontrolü + süre kontrolü) çift ödül verilmesini engeller.
  // Süre kontrolü SUNUCU saatine göre yapılır (cihaz saati oynatılamaz).
  const completePomodoro = useCallback(() => {
    const snap = dataRef.current;
    if (snap.pomodoro.state !== 'running' || snap.pomodoro.endAt - serverNow() > 0) return;
    const xp = snap.settings.pomodoroXp || 50;
    const gold = GOLD_RATES.pomodoro;
    const today = offsetToday();
    // ANTI-FARM (Katman 1): pomodoro XP'si günlük tavana sayılır; tavanı
    // aşan kısım KUMBARADA birikir, ayrıca o gün bankadan 500'e kadar
    // XP "azar azar" geri verilir.
    const dayBase =
      snap.stats.day && snap.stats.day.key === today
        ? snap.stats.day
        : emptyDayCounter(today);
    const bankState = applyXpWithBank(dayBase, snap.stats.xpBank || 0, xp);
    const xpGain = bankState.freshXp + bankState.releaseXp;
    const goldGain = Math.min(gold, Math.max(0, DAILY_GOLD_CAP - dayBase.goldEarned));
    setToasts((prev) => [
      ...prev,
      {
        key: `pomo_${Date.now()}`,
        icon: '🍅',
        title:
          bankState.overflow > 0
            ? `Odak seansı tamamlandı! +${xpGain} XP (+${bankState.overflow} XP kumbarada 💼)`
            : `Odak seansı tamamlandı! +${xpGain} XP`,
        color: COLORS.accent,
      },
    ]);
    setData((d) => {
      if (d.pomodoro.state !== 'running' || d.pomodoro.endAt - serverNow() > 0) {
        return d;
      }
      const dayB =
        d.stats.day && d.stats.day.key === today
          ? d.stats.day
          : emptyDayCounter(today);
      const bank = applyXpWithBank(dayB, d.stats.xpBank || 0, xp);
      const gain = bank.freshXp + bank.releaseXp;
      const gGain = Math.min(gold, Math.max(0, DAILY_GOLD_CAP - dayB.goldEarned));
      // Görev sayaçları: odak +1, altın +15 (gün değiştiyse sıfırlanır).
      const stats = bumpDay(
        {
          ...d.stats,
          totalXp: d.stats.totalXp + gain,
          pomodoroCount: (d.stats.pomodoroCount || 0) + 1,
          gold: (d.stats.gold || 0) + gGain,
          xpBank: bank.bank,
        },
        today,
        { pomodoro: 1, goldEarned: gGain, xpEarned: 0 }
      );
      // Kumbara kuralının gün sayaçları doğrudan işlenir.
      stats.day = {
        ...stats.day,
        xpEarned: bank.day.xpEarned,
        bankReleased: bank.day.bankReleased,
      };
      return {
        ...d,
        stats,
        pomodoro: { state: 'idle', endAt: 0, remainingMs: POMODORO_DURATION_MS },
      };
    });
  }, []);

  // Kayan bildirimi kapatır (kuyruktaki ilk öğeyi gizler).
  const dismissToast = useCallback((key) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  // Seviye kutlama modasını kapatır.
  const dismissLevelUp = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  // ---------- Dükkan eylemleri ----------

  // VIP aktif mi? (satın alınan süre henüz dolmadıysa)
  // Karar SUNUCU saatine göre verilir (cihaz saati oynatılamaz).
  const isVipActive = useCallback((snap, now) => {
    const until = snap?.settings?.vipUntil || 0;
    return until > now;
  }, []);

  // Avatar satın alır: altın yeterliyse ödeme yapılır ve "ownedAvatars"a eklenir.
  // Yetersiz altın veya zaten sahip olunan ürünlerde veri değişmez.
  const buyAvatar = useCallback((id) => {
    setData((d) => {
      const item = getShopItem(id);
      if (!item || d.ownedAvatars.includes(id)) return d;
      if ((d.stats.gold || 0) < item.price) return d;
      return {
        ...d,
        ownedAvatars: [...d.ownedAvatars, id],
        stats: { ...d.stats, gold: (d.stats.gold || 0) - item.price },
      };
    });
  }, []);

  // Sahip olunan avatardan birini profil fotoğrafı olarak seçer.
  const selectAvatar = useCallback((id) => {
    setData((d) => {
      if (!d.ownedAvatars.includes(id)) return d;
      return { ...d, settings: { ...d.settings, avatarId: id } };
    });
  }, []);

  // Tema satın alır: altın yeterliyse ödeme yapılır ve "ownedThemes"a eklenir.
  const buyTheme = useCallback((id) => {
    setData((d) => {
      const theme = getTheme(id);
      if (!theme || d.ownedThemes.includes(id)) return d;
      if ((d.stats.gold || 0) < theme.price) return d;
      return {
        ...d,
        ownedThemes: [...d.ownedThemes, id],
        stats: { ...d.stats, gold: (d.stats.gold || 0) - theme.price },
      };
    });
  }, []);

  // Sahip olunan temayı seçer; renkler kökteki ThemeProvider aracılığıyla
  // tüm ekranlara yansır.
  const selectTheme = useCallback((id) => {
    setData((d) => {
      if (!d.ownedThemes.includes(id)) return d;
      return { ...d, settings: { ...d.settings, themeId: id } };
    });
  }, []);

  // Avatar çerçevesi satın alır: altın yeterliyse ödeme yapılır ve
  // "ownedFrames"a eklenir. VIP çerçeveleri (Lottie auralar) yalnızca
  // aktif VIP kullanıcılara açıktır (Season Pass ödülü + dükkan görünümü).
  const buyFrame = useCallback((id) => {
    setData((d) => {
      const frame = getFrame(id);
      if (!frame || d.ownedFrames.includes(id)) return d;
      if (frame.vip && !isVipActive(d, serverNow())) return d;
      if ((d.stats.gold || 0) < frame.price) return d;
      return {
        ...d,
        ownedFrames: [...d.ownedFrames, id],
        stats: { ...d.stats, gold: (d.stats.gold || 0) - frame.price },
      };
    });
  }, []);

  // Sahip olunan çerçeveyi seçer; avatarın etrafındaki halka değişir.
  const selectFrame = useCallback((id) => {
    setData((d) => {
      if (!d.ownedFrames.includes(id)) return d;
      return { ...d, settings: { ...d.settings, frameId: id } };
    });
  }, []);

  // ---------- Görev panosu eylemleri (yeni nesil: günde 4+4 görev) ----------

  // Görev ödülünü alır. Kurallar (bkz. quests.js):
  // - Her görev GÜNDE BİR KEZ ödül verir (gün anahtarı sunucu saati).
  // - Otomatik görevlerde hedef bugünkü sayaçlarla tamamlanmış olmalı.
  // - VIP: temel görevlerde ×1.5 çarpan, +4 ekstra VIP görev açılır.
  // KATMAN 3 doğrulamalı (hileci duvarı):
  // 1) Yerel hızlı kontrol: buton görsel olarak hazır mı?
  // 2) Sunucu senkronu: offset'i tazeler (cihaz saati oynatılmışsa düzeltir)
  //    ve ödül öncesi bağlantıyı doğrular. Bağlantı yoksa ödül VERİLMEZ.
  // 3) sync-quest Edge Function: günlük alım + VIP durumu SUNUCU saatine
  //    göre doğrulanır; onaylanan ödül MİKTARI sunucudan gelir.
  // 4) Onay gelince kumbara/altın yoluyla yerel ödül uygulanır.
  const claimingRef = useRef(false);
  const claimQuest = useCallback(
    async (questId) => {
      const quest = getQuest(questId);
      if (!quest) return;
      const snap = dataRef.current;
      const today = offsetToday();
      if (!canClaimQuest(quest, snap.stats.day, snap.questClaims || {}, today)) return;
      // Çift basma / eşzamanlı ödül koruması.
      if (claimingRef.current) return;
      claimingRef.current = true;
      try {
        // Sunucu senkronu: hem taze saat hem bağlantı kontrolü (çevrimdışıysa başarısız).
        await refreshServer();
        if (!isClockFresh() || isClockTampered()) {
          setToasts((prev) => [
            ...prev,
            {
              key: `q_clock_${Date.now()}`,
              icon: '📡',
              title: 'Görev ödülü için bağlantı gerekiyor — sunucu saati doğrulanamadı',
              color: COLORS.danger,
            },
          ]);
          return;
        }
        const name = authRef.current?.name || snap.settings.name || 'Kullanıcı';
        const res = await claimQuestServer(name, questId);
        if (!res.ok) {
          if (res.error === 'banned') {
            await refreshServerMeta(name);
            return;
          }
          const title =
            res.error === 'already_claimed_today'
              ? 'Bu görevin ödülü bugün zaten alındı — yarın tekrar dene'
              : res.error === 'vip_required'
                ? 'Bu görev yalnızca VIP kullanıcılara açık'
                : res.error === 'invalid_quest'
                  ? 'Görev bulunamadı'
                  : 'Görev ödülü sunucuda doğrulanamadı — tekrar dene';
          setToasts((prev) => [
            ...prev,
            {
              key: `q_reject_${Date.now()}`,
              icon: quest.emoji,
              title,
              color: COLORS.danger,
            },
          ]);
          return;
        }
        // Sunucu onayladı → ödül miktarı sunucudan gelir (istemci hesaplamaz).
        // Sunucu yanıtında ödül yoksa (eski fonksiyon) yerel hesaplama yapılır.
        const reward =
          res.data?.reward || questReward(quest, isVipActive(snap, serverNow()));
        const xpGain = reward.xp || 0;
        const goldGain = reward.gold || 0;
        setData((d) => {
          const q = getQuest(questId);
          const claims = d.questClaims || {};
          if (!q) return d;
          // ANTI-FARM (Katman 1): görev XP'si günlük tavana sayılır; tavanı
          // aşan kısım KUMBARADA birikir, ayrıca o gün bankadan 500'e kadar
          // XP "azar azar" geri verilir (görev ödülleri yanmaz).
          const dayBase =
            d.stats.day && d.stats.day.key === today
              ? d.stats.day
              : emptyDayCounter(today);
          const bankState = applyXpWithBank(dayBase, d.stats.xpBank || 0, xpGain);
          const cappedXp = bankState.freshXp + bankState.releaseXp;
          const cappedGold = Math.min(goldGain, Math.max(0, DAILY_GOLD_CAP - dayBase.goldEarned));
          const metricValue = d.stats.day?.key === today ? (d.stats.day?.[q.metric] ?? 0) : 0;
          const nextStats = bumpDay(
            {
              ...d.stats,
              totalXp: d.stats.totalXp + cappedXp,
              gold: (d.stats.gold || 0) + cappedGold,
              xpBank: bankState.bank,
            },
            today,
            { goldEarned: cappedGold, xpEarned: 0 }
          );
          // Kumbara kuralının gün sayaçları doğrudan işlenir.
          nextStats.day = {
            ...nextStats.day,
            xpEarned: bankState.day.xpEarned,
            bankReleased: bankState.day.bankReleased,
          };
          return {
            ...d,
            // Günlük alım kaydı: gün anahtarı sunucu saatinden gelir (saat oynatma koruması).
            questClaims: { ...claims, [questId]: { day: today, ts: serverNow(), value: metricValue } },
            // XP seviye atlama efektini tetikler; altın günlük sayaca işlenir.
            stats: nextStats,
          };
        });
        setToasts((prev) => [
          ...prev,
          {
            key: `quest_${questId}_${Date.now()}`,
            icon: quest.emoji,
            title: `${quest.title} tamamlandı! +${xpGain} XP, +${goldGain} 🪙`,
            color: COLORS.accent,
          },
        ]);
      } finally {
        claimingRef.current = false;
      }
    },
    [refreshServer, refreshServerMeta]
  );

  // ---------- VIP (Season Pass) satın alma ----------
  // Altın bakiyesi 'vip-action' Edge Function'ında SUNUCU tarafında
  // doğrulanır; onay gelince yerel altın düşülür ve süre yazılır.
  // İki taraf da aynı miktarı düştüğü için delta senkronu ayrışmaz.
  const buyVip = useCallback(async () => {
    const name = authRef.current?.name || dataRef.current?.settings.name || 'Kullanıcı';
    const r = await purchaseVip(name);
    if (!r.ok) {
      if (r.error === 'banned') {
        await refreshServerMeta(name);
        return { ok: false, error: 'banned' };
      }
      return { ok: false, error: r.error || 'Satın alınamadı' };
    }
    const vipUntil = r.data?.vipUntil;
    if (!vipUntil) return { ok: false, error: 'Sunucu yanıtı geçersiz' };
    setData((d) => ({
      ...d,
      settings: { ...d.settings, vipUntil: Date.parse(vipUntil) || d.settings.vipUntil },
      stats: { ...d.stats, gold: Math.max(0, (d.stats.gold || 0) - VIP_PRICE_GOLD) },
    }));
    setToasts((prev) => [
      ...prev,
      {
        key: `vip_${Date.now()}`,
        icon: '👑',
        title: 'VIP oldun! 30 gün boyunca ekstra görevler ve ödül çarpanı açık',
        color: COLORS.gold,
      },
    ]);
    await refreshServer();
    return { ok: true };
  }, [refreshServer, refreshServerMeta]);

  // ---------- Season Pass ödül kutusu alma ----------
  // Pass seviyesi toplam XP'den türetilir; her seviyede Free + VIP kutusu.
  // VIP kutuları yalnızca aktif VIP üyelerine açıktır (yerel kontrol;
  // ödül türleri sadece envanter/altın olduğu için sunucu onayı gerekmez).
  const claimPassReward = useCallback(
    (level, track) => {
      const lvl = getPassLevel(level);
      if (!lvl) return { ok: false, error: 'Seviye bulunamadı' };
      const reward = track === 'vip' ? lvl.vip : lvl.free;
      if (!reward) return { ok: false, error: 'Bu seviyede ödül kutusu yok' };
      const snap = dataRef.current;
      if (passRewardClaimed(snap.passClaims, level, track)) {
        return { ok: false, error: 'Ödül zaten alınmış' };
      }
      if (level > PASS_MAX_LEVEL) return { ok: false, error: 'Seviye aşıldı' };
      if (track === 'vip' && !isVipActive(snap, serverNow())) {
        return { ok: false, error: 'Bu ödül için VIP gerekli' };
      }
      let goldGain = 0;
      let ownedThemes = null;
      let ownedAvatars = null;
      let ownedFrames = null;
      let ownedBadges = null;
      const addUnique = (arr, id) => (arr.includes(id) ? arr : [...arr, id]);
      switch (reward.type) {
        case 'gold':
          goldGain = reward.amount;
          break;
        case 'theme':
          ownedThemes = addUnique(snap.ownedThemes, reward.themeId);
          break;
        case 'avatar':
          ownedAvatars = addUnique(snap.ownedAvatars, reward.avatarId);
          break;
        case 'frame':
        case 'lottieFrame':
          ownedFrames = addUnique(snap.ownedFrames, reward.frameId);
          break;
        case 'badge':
          ownedBadges = addUnique(snap.ownedBadges, reward.badgeId);
          break;
        default:
          return { ok: false, error: 'Bilinmeyen ödül' };
      }
      setData((d) => {
        const today = offsetToday();
        // Altın ödülü günlük kazanç sayacına işlenir (sunucu tavanıyla tutarlı).
        const stats = goldGain
          ? bumpDay(
              { ...d.stats, gold: (d.stats.gold || 0) + goldGain },
              today,
              { goldEarned: goldGain }
            )
          : d.stats;
        return {
          ...d,
          passClaims: { ...(d.passClaims || {}), [`${level}_${track}`]: true },
          ownedThemes: ownedThemes || d.ownedThemes,
          ownedAvatars: ownedAvatars || d.ownedAvatars,
          ownedFrames: ownedFrames || d.ownedFrames,
          ownedBadges: ownedBadges || d.ownedBadges,
          stats,
        };
      });
      const label = track === 'vip' ? 'VIP' : 'Free';
      setToasts((prev) => [
        ...prev,
        {
          key: `pass_${level}_${track}_${Date.now()}`,
          icon: '🎁',
          title: `Sezon ${level}. seviye ${label} ödülü açıldı! ${goldGain ? `+${goldGain} 🪙` : ''}`,
          color: COLORS.gold,
        },
      ]);
      return { ok: true };
    },
    []
  );

  // Tüm veriyi (ana + yedek) temizler ve başlangıç durumuna döner.
  const resetAll = useCallback(async () => {
    settingsRef.current = INITIAL_STATE.settings;
    setData(INITIAL_STATE);
    const name = authRef.current?.name || activeAccount || 'varsayilan';
    await AsyncStorage.multiRemove([
      storageKeyFor(name),
      backupKeyFor(name),
      serverCacheKeyFor(name),
      syncAnchorKeyFor(name),
      userBackupKeyFor(name),
    ]).catch((e) => console.warn('Sıfırlama sırasında hata:', e));
  }, [activeAccount]);

  // VIP durumu (salt okunur): ayarlardaki süre sunucu saatini geçmediyse aktif.
  // Ekranlar bu değerle VIP görevlerini/ödüllerini gösterir.
  const vipActive = isVipActive(data, serverNow());

  // Context değeri yalnızca ilgili değişkenler değişince yenilenir (memo).
  const value = useMemo(
    () => ({
      data,
      loading,
      today,
      addHabit,
      toggleHabit,
      deleteHabit,
      server,
      refreshing: server.syncing,
      refreshServer,
      requestFriend,
      acceptRequest,
      declineRequest,
      removeFriend,
      challengeDuel,
      acceptDuel,
      declineDuel,
      finishDuel,
      setPenaltyEnabled,
      setReminderHour,
      setOsNotify,
      backupData,
      restoreData,
      backupTs,
      resetAll,
      levelUpEvent,
      dismissLevelUp,
      toasts,
      dismissToast,
      startPomodoro,
      pausePomodoro,
      resumePomodoro,
      resetPomodoro,
      completePomodoro,
      buyAvatar,
      selectAvatar,
      buyTheme,
      selectTheme,
      buyFrame,
      selectFrame,
      claimQuest,
      buyVip,
      claimPassReward,
      vipActive,
      pendingSync,
      leaderboardMinLevel: LEADERBOARD_MIN_LEVEL,
      leaderboardMinXp: LEADERBOARD_MIN_XP,
    }),
    [
      data,
      loading,
      today,
      addHabit,
      toggleHabit,
      deleteHabit,
      server,
      refreshServer,
      requestFriend,
      acceptRequest,
      declineRequest,
      removeFriend,
      challengeDuel,
      acceptDuel,
      declineDuel,
      finishDuel,
      setPenaltyEnabled,
      setReminderHour,
      setOsNotify,
      backupData,
      restoreData,
      backupTs,
      resetAll,
      levelUpEvent,
      dismissLevelUp,
      toasts,
      dismissToast,
      startPomodoro,
      pausePomodoro,
      resumePomodoro,
      resetPomodoro,
      completePomodoro,
      buyAvatar,
      selectAvatar,
      buyTheme,
      selectTheme,
      buyFrame,
      selectFrame,
      claimQuest,
      buyVip,
      claimPassReward,
      vipActive,
      pendingSync,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// Ekranlarda veriye erişmek için: const { data, today } = useData();
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
