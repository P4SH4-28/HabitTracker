import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createNavigationContainerRef,
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider, useData } from './src/context/DataContext';
import { MenuProvider } from './src/context/MenuContext';
import { levelFromTotalXp } from './src/logic';
import { initErrorReporter, setErrorHandler } from './src/services/errorReporter';
import { initNotifications } from './src/services/notifications';
import { drainWidgetTasks, clearWidgetTasks } from './src/services/widgetService';
import AppMenu from './src/components/AppMenu';
import ErrorBoundary, { FatalErrorView } from './src/components/ErrorBoundary';
import AchievementToast from './src/components/AchievementToast';
import BackgroundPattern from './src/components/BackgroundPattern';
import LevelUpModal from './src/components/LevelUpModal';
import Onboarding from './src/components/Onboarding';
import TopBar from './src/components/TopBar';
import AuthScreen from './src/screens/AuthScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import AdminScreen from './src/screens/AdminScreen';
import HomeScreen from './src/screens/HomeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import LeagueScreen from './src/screens/LeagueScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import QuestBoardScreen from './src/screens/QuestBoardScreen';
import SeasonPassScreen from './src/screens/SeasonPassScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShopScreen from './src/screens/ShopScreen';
import SocialScreen from './src/screens/SocialScreen';
import TeamScreen from './src/screens/TeamScreen';
import { resolveTheme, ThemeProvider, useTheme } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Global hata yakalayıcı: her şeyden ÖNCE kurulur (modül yükleme anında).
// Yakalanan hatalar ekranda gösterilir (FatalErrorView) ve AsyncStorage'a yazılır.
initErrorReporter();

const TAB_ICONS = {
  Home: 'home',
  Shop: 'storefront',
  Progress: 'stats-chart',
  Leaderboard: 'trophy',
  Social: 'people',
};

const TAB_TITLES = {
  Home: 'Bugün',
  Shop: 'Dükkan',
  Progress: 'Gelişim',
  Leaderboard: 'Liderlik',
  Social: 'Sosyal',
};

const STACK_TITLES = {
  QuestBoard: 'Günün Görevleri',
  SeasonPass: 'Season Pass',
  Inventory: 'Envanter',
  Achievements: 'Başarımlar',
  League: 'Haftalık Ligler',
  Team: 'Takımım',
  Profile: 'Profilim',
  Settings: 'Ayarlar',
  Admin: 'Yönetici Paneli',
};

// Ortak başlık çubuğu: sekmelerde hamburger (menü), alt ekranlarda geri oku.
function AppHeader({ navigation, route }) {
  const canGoBack = navigation.canGoBack();
  const title = route?.name === 'Main' ? '' : route?.name ? (TAB_TITLES[route.name] || STACK_TITLES[route.name] || '') : '';
  return (
    <TopBar
      title={title}
      onBack={canGoBack ? () => navigation.goBack() : undefined}
    />
  );
}

function TabNavigator() {
  const { data, leaderboardMinLevel } = useData();
  const { user: authUser } = useAuth();
  const { colors } = useTheme();
  const leaderboardLocked = levelFromTotalXp(data.stats.totalXp).level < leaderboardMinLevel;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        header: (props) => <AppHeader {...props} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          // Liderlik kilitliyken sekme ikonu kilit olur (kilit ekranı da var).
          if (route.name === 'Leaderboard' && leaderboardLocked) {
            return (
              <Ionicons
                name={focused ? 'lock-closed' : 'lock-closed-outline'}
                size={size}
                color={color}
              />
            );
          }
          return (
            <Ionicons
              name={
                focused
                  ? TAB_ICONS[route.name]
                  : (`${TAB_ICONS[route.name]}-outline`)
              }
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Bugün' }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{ tabBarLabel: 'Dükkan' }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ tabBarLabel: 'Gelişim' }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarLabel: 'Liderlik' }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{ tabBarLabel: 'Sosyal' }}
      />
    </Tab.Navigator>
  );
}

// Kök yığın: sekmeler + menüden açılan alt ekranlar.
// Menü öğeleri: Günün Görevleri, Season Pass, Ayarlar, Yönetici Paneli.
function RootNavigator() {
  const { user: authUser } = useAuth();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: (props) => <AppHeader {...props} />,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="QuestBoard" component={QuestBoardScreen} />
      <Stack.Screen name="SeasonPass" component={SeasonPassScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="League" component={LeagueScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      {authUser?.isAdmin ? <Stack.Screen name="Admin" component={AdminScreen} /> : null}
    </Stack.Navigator>
  );
}

// Widget tıklamalarından gelen derin bağlantıları işler:
//   myapp://pomodoro/start → pomodoro'yu anında başlat
//   myapp://duel/create    → düello kurma ekranına git
function useDeepLink(onPomodoroStart, onDuelCreate) {
  useEffect(() => {
    const handle = (url) => {
      if (!url) return;
      const p = url.split('?')[0];
      if (p.includes('pomodoro/start')) onPomodoroStart();
      else if (p.includes('duel/create')) onDuelCreate();
    };
    // Uygulama kapalıyken tıklanan widget linki (ilk açılış).
    Linking.getInitialURL().then(handle).catch(() => {});
    // Uygulama açıkken gelen linkler.
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [onPomodoroStart, onDuelCreate]);
}

const navigationRef = createNavigationContainerRef();

function Root() {
  const { data, loading, server, startPomodoro, claimQuest } = useData();
  const { user: authUser, status: authStatus } = useAuth();
  // Bildirim handler'ı: ön plandayken gelen bildirimler ekran üstünden
  // gösterilir (initNotifications modül yüklendiğinde kurulur, güvenlidir).
  useEffect(() => {
    initNotifications();
  }, []);
  // Widget kuyruğundaki görevleri (TASK_DONE) normal akışla tamamla:
  // uygulama açılır açılmaz bekleyen görevler sunucu doğrulamasıyla ödüllendirilir.
  // (Widget görünümü DataContext'in kendi refresh'i ile güncellenir.)
  useEffect(() => {
    if (authStatus !== 'in' || loading) return;
    let cancelled = false;
    (async () => {
      const pending = await drainWidgetTasks();
      if (cancelled || pending.length === 0) return;
      for (const id of pending) {
        if (cancelled) break;
        await claimQuest(id);
      }
      await clearWidgetTasks(pending);
    })();
    return () => {
      cancelled = true;
    };
    // claimQuest ref'i sabit olduğu için yalnızca oturum/yükleme değişince çalışır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, loading]);

  // Widget derin bağlantıları: pomodoro'yu başlat / düello ekranına git.
  const handlePomodoroStart = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main', { screen: 'Home' });
    }
    startPomodoro();
  }, [startPomodoro]);
  const handleDuelCreate = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main', { screen: 'Social' });
    }
  }, []);
  useDeepLink(handlePomodoroStart, handleDuelCreate);
  // Aktif temanın renkleri: tema değişince tüm ağaç yeniden çizilir.
  const colors = useMemo(() => resolveTheme(data.settings.themeId), [data.settings.themeId]);
  const navTheme = useMemo(
    () => ({
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: colors.background,
        card: colors.surface,
        primary: colors.primary,
        text: colors.text,
        border: colors.border,
      },
    }),
    [colors]
  );

  if (loading) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Hesap yoksa veya giriş yapılmadıysa önce kayıt/giriş ekranı.
  if (authStatus !== 'in') {
    return (
      <ThemeProvider value={{ colors }}>
        <AuthScreen />
      </ThemeProvider>
    );
  }

  // Hesap yasaklandıysa uygulama yalnızca yasak ekranını gösterir
  // (sunucu zaten kazanç senkronunu durdurdu — bu ekran bilgilendirme).
  if (server.banned) {
    return (
      <ThemeProvider value={{ colors }}>
        <View style={[styles.root, styles.banCenter, { backgroundColor: colors.background }]}>
          <Text style={{ fontSize: 56 }}>⛔</Text>
          <Text style={[styles.banTitle, { color: colors.text }]}>Hesabın yasaklandı</Text>
          {server.banReason ? (
            <Text style={[styles.banReason, { color: colors.textMuted }]}>Gerekçe: {server.banReason}</Text>
          ) : null}
          <Text style={[styles.banHint, { color: colors.textMuted }]}>
            Kurallara aykırı kullanım nedeniyle yönetici tarafından durduruldun.
          </Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={{ colors }}>
      <MenuProvider>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          {/* Tema deseni: ekranlar saydam olduğu için aradan görünür. */}
          <BackgroundPattern />
          {/* Navigasyon ağacı: sekmeler + menü ekranları burada çalışır. */}
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <StatusBar style="light" />
            <RootNavigator />
            {/* Sol menü (drawer): Günün Görevleri / Season Pass / Ayarlar / Yönetici */}
            <AppMenu />
          </NavigationContainer>
          {/* Kök seviye kaplamalar: her sekmenin ÜZERİNDE görünürler.
              Toast: başarım/pomodoro bildirimleri. Modal: seviye atlama kutlaması. */}
          <AchievementToast />
          <LevelUpModal />
          {/* İlk açılış rehberi: yalnızca ilk girişte, admin hesabına gösterilmez. */}
          {!authUser?.isAdmin ? <Onboarding /> : null}
        </View>
      </MenuProvider>
    </ThemeProvider>
  );
}

export default function App() {
  // Yakalanan hatalar bu state ile ekran üstünde gösterilir (sessiz çökme yok).
  const [fatal, setFatal] = useState(null);
  useEffect(() => {
    setErrorHandler(setFatal);
    return () => setErrorHandler(null);
  }, []);

  return (
    <SafeAreaProvider>
      {/* Render hataları (ekran/geçiş sırasında) burada yakalanır. */}
      <ErrorBoundary>
        <AuthProvider>
          <DataProvider>
            <Root />
          </DataProvider>
        </AuthProvider>
        {/* Render dışı hatalar (zamanlayıcı, senkron vb.) bu overlay'le görünür. */}
        {fatal ? <FatalErrorView error={fatal} onRetry={() => setFatal(null)} /> : null}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  banCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  banTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  banReason: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  banHint: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
