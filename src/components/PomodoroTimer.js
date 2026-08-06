// ============================================================
// PomodoroTimer — Bugün sekmesindeki odak sayacı kartı
// 25 dakikalık geri sayım: Başlat / Duraklat / Sıfırla.
// Süre bitince DataContext'e haber verilir; o da XP ödülü verir
// (settings.pomodoroXp) ve kullanıcıya bildirim gösterir.
//
// Neden "Date.now()" tabanlı? Cihazdaki setTimeout/interval arka planda
// durduğu için ona güvenemeyiz. Bitiş anını (endAt) saklıyoruz; kalan
// süre her saniye Date.now() ile hesaplanıyor. Uygulama kapansa bile
// oturum DataContext'te saklanır ve süre dolduğunda ödül verilir.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useData } from '../context/DataContext';
import { formatDuration, POMODORO_DURATION_MS } from '../logic';
import { useTheme } from '../theme';

export default function PomodoroTimer() {
  const {
    data,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    resetPomodoro,
    completePomodoro,
  } = useData();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const pomodoro = data.pomodoro;
  const xpReward = data.settings.pomodoroXp || 50;

  // Saniyede bir yenilenen "şimdi" zamanı — kalan süre bununla hesaplanır.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Çalışıyorsa kalan süre endAt - now; değilse saklanan remainingMs.
  const remainingMs =
    pomodoro.state === 'running'
      ? Math.max(0, pomodoro.endAt - now)
      : pomodoro.remainingMs;

  // Süre 0'a düştüğünde ödülü YALNIZCA bir kez tetikle (ref ile korur).
  const completedRef = useRef(false);
  useEffect(() => {
    if (pomodoro.state !== 'running') {
      completedRef.current = false;
      return;
    }
    if (remainingMs <= 0 && !completedRef.current) {
      completedRef.current = true;
      completePomodoro();
    }
  }, [remainingMs, pomodoro.state, completePomodoro]);

  const progress = Math.max(0, Math.min(1, remainingMs / POMODORO_DURATION_MS));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🍅 Odak Zamanı</Text>
        <Text style={styles.subtitle}>25 dakikalık seans • +{xpReward} XP</Text>
      </View>

      <Text style={styles.timer}>{formatDuration(remainingMs)}</Text>

      {/* İlerleme çubuğu: kalan sürenin oranını gösterir. */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: pomodoro.state === 'running' ? C.primary : C.surface },
          ]}
        />
      </View>

      <View style={styles.buttons}>
        {pomodoro.state === 'idle' && (
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={startPomodoro}>
            <Text style={styles.btnPrimaryText}>▶ Başlat</Text>
          </Pressable>
        )}
        {pomodoro.state === 'running' && (
          <>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={pausePomodoro}>
              <Text style={styles.btnSecondaryText}>⏸ Duraklat</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={resetPomodoro}>
              <Text style={styles.btnGhostText}>↺</Text>
            </Pressable>
          </>
        )}
        {pomodoro.state === 'paused' && (
          <>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={resumePomodoro}>
              <Text style={styles.btnPrimaryText}>▶ Devam</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={resetPomodoro}>
              <Text style={styles.btnGhostText}>↺</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    subtitle: {
      color: C.textMuted,
      fontSize: 12,
    },
    timer: {
      color: C.text,
      fontSize: 44,
      fontWeight: '800',
      textAlign: 'center',
      marginVertical: 6,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.background,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 4,
    },
    buttons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    btn: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimary: {
      backgroundColor: C.primary,
      flex: 1,
    },
    btnPrimaryText: {
      color: C.onPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    btnSecondary: {
      backgroundColor: C.primary + '22',
      flex: 1,
    },
    btnSecondaryText: {
      color: C.primary,
      fontWeight: '700',
      fontSize: 15,
    },
    btnGhost: {
      backgroundColor: C.background,
      paddingHorizontal: 18,
    },
    btnGhostText: {
      color: C.textMuted,
      fontSize: 18,
    },
  });
}
