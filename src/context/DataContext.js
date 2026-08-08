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
  DAILY_GOLD_CAP,
  DAILY_XP_CAP,
  dateKey,
  dayPenalty,
  levelFromTotalXp,
  MAX_ACTIVE_HABITS,
  POMODORO_DURATION_MS,
  todayKey,
} from '../logic';
import { loadServerClock, serverNow } from '../services/serverClock';
import { evaluateAchievements } from '../data/achievements';
import {
  bumpDay,
  canClaimQuest,
  getQuest,
  QUEST_CATALOG,
  QUEST_DIFFICULTIES,
} from '../data/quests';
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
import { getLeaderboardData } from '../services/leaderboardService';
import { getServerProfile, updateProfileData } from '../services/profileService';

// Ana depolama anahtarı. Veriye "version" alanı ekliyoruz; ileride
// veri yapısı değişirse eski verileri migrasyonla dönüştürebileceğiz.
const STORAGE_KEY = '@habit_tracker_v2';
const BACKUP_KEY = '@habit_tracker_v2_backup';
const USER_BACKUP_KEY = '@habit_tracker_v2_user_backup';
const SERVER_CACHE_KEY = '@habit_tracker_v2_server_cache';
const DATA_VERSION = 7;

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
    day: { key: null, completions: 0, pomodoro: 0, goldEarned: 0 },
  },
  settings: { xpPerHabit: 25, pomodoroXp: 50, avatarId: 'av_fox', themeId: 'dark', devOffset: 0, frameId: null, penaltyEnabled: true, reminderHour: null },
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
  // Görev panosu durumu: { [görevId]: { ts, value } }
  // ts = son ödül alım zamanı (bekleme süresi bundan hesaplanır),
  // value = otomatik görevlerde alım anındaki günlük sayaç (ilerlemeyi sıfırlar).
  questClaims: {},
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
  const { user: authUser, status: authStatus } = useAuth();
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
    banned: false,
    banReason: null,
  });

  // Seviye atlama olayı: { level, ts } — kutlama modalı bu değeri görünce açar.
  const [levelUpEvent, setLevelUpEvent] = useState(null);
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
  // Ayrı anahtarda saklanır; sunucu önbelleğinden bağımsızdır.
  const SYNC_ANCHOR_KEY = '@habit_tracker_v2_sync_anchor';
  const syncAnchorRef = useRef({ initialized: false, lastSyncedXp: 0, lastSyncedGold: 0 });
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SYNC_ANCHOR_KEY);
        if (raw) {
          const a = JSON.parse(raw);
          if (a && typeof a.lastSyncedXp === 'number' && typeof a.lastSyncedGold === 'number') {
            syncAnchorRef.current = {
              initialized: true,
              lastSyncedXp: a.lastSyncedXp,
              lastSyncedGold: a.lastSyncedGold,
            };
          }
        }
      } catch (e) {
        console.warn('Senkron köprüsü okunamadı:', e);
      }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SERVER_CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (c && Array.isArray(c.leaderboard)) {
            serverCacheRef.current = c;
            setServer((s) => ({
              ...s,
              leaderboard: c.leaderboard,
              friends: Array.isArray(c.friends) ? c.friends : [],
              requests: Array.isArray(c.requests) ? c.requests : [],
              lastSync: c.savedAt || null,
            }));
            setData((d) => ({
              ...d,
              players: c.leaderboard,
              friends: Array.isArray(c.friends) ? c.friends : d.friends,
            }));
          }
        }
      } catch (e) {
        console.warn('Sunucu önbelleği okunamadı:', e);
      }
    })();
  }, []);

  // ---------- Yükleme: uygulama açılışında kayıtlı veriyi geri yükle ----------
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            // Bozuk (corrupt) veri: silmek yerine yedek anahtara kopyala.
            // Böylece üzerine yazmadan önce eski veriyi kurtarma şansımız kalır.
            await AsyncStorage.setItem(BACKUP_KEY, raw);
            console.warn(
              'Kayıtlı veri okunamadı, yedeğe alındı. Sıfırdan başlanacak.'
            );
            setLoading(false);
            return;
          }
          setData({
            habits: Array.isArray(parsed.habits) ? parsed.habits : [],
            // Eski kayıtlarda pomodoroCount/gold yoktur; varsayılanla birleştir.
            stats: {
              totalXp: parsed.stats?.totalXp || 0,
              pomodoroCount: parsed.stats?.pomodoroCount || 0,
              gold: parsed.stats?.gold || 0,
              day: parsed.stats?.day || INITIAL_STATE.stats.day,
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
            // Eski görev sistemi (v5) alanları yüklenmez; görev panosu temiz başlar.
            questClaims:
              parsed.questClaims &&
              typeof parsed.questClaims === 'object' &&
              !Array.isArray(parsed.questClaims)
                ? Object.fromEntries(
                    Object.entries(parsed.questClaims).filter(([id]) =>
                      QUEST_CATALOG.some((q) => q.id === id)
                    )
                  )
                : {},
            pomodoro: { ...INITIAL_STATE.pomodoro, ...(parsed.pomodoro || {}) },
          });
        }
      } catch (e) {
        // Depolama erişimi tamamen başarısızsa bile uygulama boş veriyle açılır.
        console.warn('Veri yüklenirken hata oluştu:', e);
      }
      setLoading(false);
    })();
  }, []);

  // ---------- Kaydetme: veri her değiştiğinde AsyncStorage'a yaz ----------
  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DATA_VERSION, ...data }))
      .catch((e) => console.warn('Veri kaydedilirken hata oluştu:', e));
  }, [data, loading]);

  // ---------- Gün takibi: gece yarısı geçişini algıla ----------
  useEffect(() => {
    // Tarih gerçekten değiştiyse state'i güncelle (aksi halde aynı bırak).
    // Test paneli gün kaydırdıysa (devOffset) o fark da hesaba katılır.
    const syncToday = () =>
      setToday((prev) => {
        const t = todayKey(settingsRef.current.devOffset || 0);
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
      const t = todayKey(data.settings.devOffset || 0);
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
  // "Yedekle": verinin anlık kopyasını ayrı anahtara yazar.
  // "Geri Yükle": o kopyayı geri getirir. Son yedek zamanı "backupTs" tutulur.
  const [backupTs, setBackupTs] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_BACKUP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.ts) setBackupTs(parsed.ts);
        }
      } catch (e) {
        console.warn('Yedek bilgisi okunamadı:', e);
      }
    })();
  }, []);

  const backupData = useCallback(async () => {
    const payload = { ts: Date.now(), data };
    await AsyncStorage.setItem(USER_BACKUP_KEY, JSON.stringify(payload)).catch(
      (e) => console.warn('Yedekleme yazılamadı:', e)
    );
    setBackupTs(payload.ts);
    return { ok: true };
  }, [data]);

  const restoreData = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(USER_BACKUP_KEY);
      if (!raw) return { ok: false, error: 'Yedek bulunamadı' };
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return { ok: false, error: 'Yedek bozuk' };
      const saved = parsed.data;
      setData({
        ...INITIAL_STATE,
        ...saved,
        stats: { ...INITIAL_STATE.stats, ...(saved.stats || {}) },
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
    if (data.pomodoro.endAt - Date.now() <= 0) completePomodoro();
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
          : { key: today, completions: 0, pomodoro: 0, goldEarned: 0, xpEarned: 0 };
      let totalXp = d.stats.totalXp;
      let totalGold = d.stats.gold || 0;
      // Günlük görev sayaçlarına işlenecek değişim (tamamla/geri al).
      let dayDelta = { completions: 0, goldEarned: 0, xpEarned: 0 };
      const habits = d.habits.map((h) => {
        if (h.id !== id) return h;
        const done = h.completedDates.includes(today);
        if (done) {
          // Geri al: kazanılan XP/altın iade edilir, tavan geri açılır.
          totalXp = Math.max(0, totalXp - xp);
          totalGold = Math.max(0, totalGold - gold);
          dayDelta = { completions: -1, goldEarned: -gold, xpEarned: -xp };
        } else {
          // ANTI-FARM (Katman 1): günlük tavan doluysa ödül verilmez,
          // tamamlama yine de sayılır (seri + görev ilerlemesi korunur).
          const xpGain = Math.min(xp, Math.max(0, DAILY_XP_CAP - dayBase.xpEarned));
          const goldGain = Math.min(gold, Math.max(0, DAILY_GOLD_CAP - dayBase.goldEarned));
          totalXp += xpGain;
          totalGold += goldGain;
          dayDelta = { completions: 1, goldEarned: goldGain, xpEarned: xpGain };
        }
        return {
          ...h,
          completedDates: done
            ? h.completedDates.filter((x) => x !== today)
            : [...h.completedDates, today],
        };
      });
      // Görev sayaçlarını güncelle (gün değiştiyse otomatik sıfırlanır).
      const stats = bumpDay(
        { ...d.stats, totalXp, gold: totalGold },
        today,
        dayDelta
      );
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
      anchor.initialized = true;
    }
    // Taze cihaz koruması: yerel toplamlar 0'ken (yeni kurulum / geri
    // yükleme sonrası) negatif delta GÖNDERME — sunucudaki mevcut XP ve
    // altın silinmesin. Aksi halde temiz kurulum aynı kullanıcı adıyla
    // girince tüm birikim sıfırlanırdı (admin ödülleri dahil).
    const freshDevice = snap.stats.totalXp === 0 && anchor.lastSyncedXp > 0;
    const freshDeviceGold = snap.stats.gold === 0 && anchor.lastSyncedGold > 0;
    const r = await updateProfileData(name, {
      deltaXp: freshDevice ? 0 : snap.stats.totalXp - anchor.lastSyncedXp,
      deltaGold: freshDeviceGold ? 0 : snap.stats.gold - anchor.lastSyncedGold,
      totalXp: snap.stats.totalXp, // geçiş dönemi fallback'i için
      totalGold: snap.stats.gold, // geçiş dönemi fallback'i için
      claimedDay: offsetToday(),
    });
    if (!r.ok) return { ok: false, warn: r.warn, error: r.error };
    const d = r.data || {};
    anchor.lastSyncedXp = typeof d.serverXp === 'number' ? d.serverXp : anchor.lastSyncedXp;
    anchor.lastSyncedGold = typeof d.serverGold === 'number' ? d.serverGold : anchor.lastSyncedGold;
    AsyncStorage.setItem(
      SYNC_ANCHOR_KEY,
      JSON.stringify({ lastSyncedXp: anchor.lastSyncedXp, lastSyncedGold: anchor.lastSyncedGold })
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
    const [lb, fr, rq] = await Promise.all([
      getLeaderboardData(name),
      getFriends(name),
      getFriendRequests(name),
    ]);
    if (!lb.ok) return false;
    const board = (lb.leaderboard || []).map(profileToPlayer);
    let friends = fr.ok ? (fr.friends || []).map(profileToPlayer) : [];
    let requests = rq.ok ? (rq.requests || []) : [];
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
      lastSync: savedAt,
    };
    setServer((s) => ({ ...s, ...patch, connected: true }));
    await AsyncStorage.setItem(SERVER_CACHE_KEY, JSON.stringify({ ...patch, savedAt })).catch(
      () => {}
    );
    if (gotMeta) setData((d) => ({ ...d, players: board, friends: friendsMapped }));
    return true;
  }, []);

  const runSync = useCallback(async () => {
    if (pushRef.current) return;
    pushRef.current = true;
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
    } catch (e) {
      setServer((s) => ({ ...s, connected: false }));
    } finally {
      pushRef.current = false;
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

  // ---------- Pomodoro eylemleri ----------
  // Oturum "timestamp" tabanlı çalışır: bitiş anı (endAt) saklanır, kalan süre
  // her an Date.now() farkıyla hesaplanır. Böylece arka plana geçilse veya
  // uygulama kapatılsa bile sayaç doğru kalır.

  // Boştaysa sayacı başlatır (duraklatılmıştan devam etme ayrı fonksiyonda).
  const startPomodoro = useCallback(() => {
    setData((d) => {
      if (d.pomodoro.state === 'running') return d;
      const base = d.pomodoro.remainingMs || POMODORO_DURATION_MS;
      return {
        ...d,
        pomodoro: {
          state: 'running',
          endAt: Date.now() + base,
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
          remainingMs: Math.max(0, d.pomodoro.endAt - Date.now()),
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
          endAt: Date.now() + d.pomodoro.remainingMs,
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
  const completePomodoro = useCallback(() => {
    setData((d) => {
      if (d.pomodoro.state !== 'running' || d.pomodoro.endAt - Date.now() > 0) {
        return d;
      }
      const xp = d.settings.pomodoroXp || 50;
      const gold = GOLD_RATES.pomodoro;
      const today = offsetToday();
      // ANTI-FARM (Katman 1): günlük XP/altın tavanı pomodoro için de geçerli.
      const dayBase =
        d.stats.day && d.stats.day.key === today
          ? d.stats.day
          : { key: today, completions: 0, pomodoro: 0, goldEarned: 0, xpEarned: 0 };
      const xpGain = Math.min(xp, Math.max(0, DAILY_XP_CAP - dayBase.xpEarned));
      const goldGain = Math.min(gold, Math.max(0, DAILY_GOLD_CAP - dayBase.goldEarned));
      // Görev sayaçları: odak +1, altın +15 (gün değiştiyse sıfırlanır).
      const stats = bumpDay(
        {
          ...d.stats,
          totalXp: d.stats.totalXp + xpGain,
          pomodoroCount: (d.stats.pomodoroCount || 0) + 1,
          gold: (d.stats.gold || 0) + goldGain,
        },
        today,
        { pomodoro: 1, goldEarned: goldGain, xpEarned: xpGain }
      );
      return {
        ...d,
        stats,
        pomodoro: { state: 'idle', endAt: 0, remainingMs: POMODORO_DURATION_MS },
      };
    });
    setToasts((prev) => [
      ...prev,
      {
        key: `pomo_${Date.now()}`,
        icon: '🍅',
        title: `Odak seansı tamamlandı! +${settingsRef.current.pomodoroXp || 50} XP`,
        color: COLORS.accent,
      },
    ]);
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
  // "ownedFrames"a eklenir.
  const buyFrame = useCallback((id) => {
    setData((d) => {
      const frame = getFrame(id);
      if (!frame || d.ownedFrames.includes(id)) return d;
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

  // ---------- Görev panosu eylemleri ----------

  // Görev ödülünü alır. Kurallar (bkz. quests.js):
  // - Bekleme süresi dolmuş olmalı (zorluğa göre 30dk-2saat).
  // - Otomatik görevlerde hedef tamamlanmış olmalı (günlük sayaçlarla ölçülür).
  // - Otomatik görevler XP + altın, manuel görevler YALNIZCA altın verir
  //   (manuel görevler liderlik tablosunu kirletmesin diye XP vermez).
  // Ödül alınınca görevin beklemesi başlar; otomatik görevlerde ilerleme
  // anlık görüntüyle (value) sıfırlanır, sayaç ilerledikçe yeniden dolar.
  const claimQuest = useCallback(
    (questId) => {
      const quest = getQuest(questId);
      if (!quest || !canClaimQuest(quest, data.stats.day, data.questClaims || {}, serverNow())) {
        return;
      }
      const diff = QUEST_DIFFICULTIES[quest.difficulty];
      const xpGain = quest.type === 'auto' ? diff.xp : 0;
      setData((d) => {
        const q = getQuest(questId);
        const claims = d.questClaims || {};
        if (!q || !canClaimQuest(q, d.stats.day, claims, serverNow())) return d;
        const today = offsetToday();
        // ANTI-FARM (Katman 1): görev ödülleri de günlük tavanlara tabidir.
        const dayBase =
          d.stats.day && d.stats.day.key === today
            ? d.stats.day
            : { key: today, completions: 0, pomodoro: 0, goldEarned: 0, xpEarned: 0 };
        const cappedXp = Math.min(xpGain, Math.max(0, DAILY_XP_CAP - dayBase.xpEarned));
        const cappedGold = Math.min(diff.gold, Math.max(0, DAILY_GOLD_CAP - dayBase.goldEarned));
        const metricValue = q.type === 'auto' ? (d.stats.day?.[q.metric] ?? 0) : 0;
        return {
          ...d,
          // Bekleme zaman damgası sunucu saatine göre yazılır (saat oynatma koruması).
          questClaims: { ...claims, [questId]: { ts: serverNow(), value: metricValue } },
          // XP seviye atlama efektini tetikler; altın günlük sayaca işlenir.
          stats: bumpDay(
            {
              ...d.stats,
              totalXp: d.stats.totalXp + cappedXp,
              gold: (d.stats.gold || 0) + cappedGold,
            },
            today,
            { goldEarned: cappedGold, xpEarned: cappedXp }
          ),
        };
      });
      setToasts((prev) => [
        ...prev,
        {
          key: `quest_${questId}_${Date.now()}`,
          icon: quest.emoji,
          title: `${quest.title} tamamlandı! ${xpGain ? `+${xpGain} XP ` : ''}+${diff.gold} 🪙`,
          color: COLORS.accent,
        },
      ]);
    },
    [data.stats.day, data.questClaims]
  );

  // Tüm veriyi (ana + yedek) temizler ve başlangıç durumuna döner.
  const resetAll = useCallback(async () => {
    settingsRef.current = INITIAL_STATE.settings;
    setData(INITIAL_STATE);
    await AsyncStorage.multiRemove([STORAGE_KEY, BACKUP_KEY]).catch((e) =>
      console.warn('Sıfırlama sırasında hata:', e)
    );
  }, []);

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
      refreshServer,
      requestFriend,
      acceptRequest,
      declineRequest,
      removeFriend,
      setPenaltyEnabled,
      setReminderHour,
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
      setPenaltyEnabled,
      setReminderHour,
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
