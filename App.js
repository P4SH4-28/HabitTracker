import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider, useData } from './src/context/DataContext';
import { levelFromTotalXp } from './src/logic';
import AchievementToast from './src/components/AchievementToast';
import BackgroundPattern from './src/components/BackgroundPattern';
import LevelUpModal from './src/components/LevelUpModal';
import AuthScreen from './src/screens/AuthScreen';
import AdminScreen from './src/screens/AdminScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import HomeScreen from './src/screens/HomeScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import QuestBoardScreen from './src/screens/QuestBoardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShopScreen from './src/screens/ShopScreen';
import { resolveTheme, ThemeProvider, useTheme } from './src/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Quest: 'flag',
  Shop: 'storefront',
  Progress: 'stats-chart',
  Leaderboard: 'trophy',
  Friends: 'people',
  Settings: 'settings',
  Admin: 'shield-checkmark',
};

function TabNavigator() {
  const { data, leaderboardMinLevel } = useData();
  const { user: authUser } = useAuth();
  const { colors } = useTheme();
  const leaderboardLocked = levelFromTotalXp(data.stats.totalXp).level < leaderboardMinLevel;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
        name="Quest"
        component={QuestBoardScreen}
        options={{ tabBarLabel: 'Görevler' }}
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
        name="Friends"
        component={FriendsScreen}
        options={{ tabBarLabel: 'Arkadaşlar' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Ayarlar' }}
      />
      {authUser?.isAdmin ? (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{ tabBarLabel: 'Yönetici' }}
        />
      ) : null}
    </Tab.Navigator>
  );
}

function Root() {
  const { data, loading, server } = useData();
  const { status: authStatus } = useAuth();
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
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Tema deseni: ekranlar saydam olduğu için aradan görünür. */}
        <BackgroundPattern />
        {/* Navigasyon ağacı: sekmeler + tüm ekranlar burada çalışır. */}
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <TabNavigator />
        </NavigationContainer>
        {/* Kök seviye kaplamalar: her sekmenin ÜZERİNDE görünürler.
            Toast: başarım/pomodoro bildirimleri. Modal: seviye atlama kutlaması. */}
        <AchievementToast />
        <LevelUpModal />
      </View>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <Root />
        </DataProvider>
      </AuthProvider>
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





