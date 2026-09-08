// ============================================================
// PomodoroTimer — Bugün sekmesindeki odak sayacı kartı (premium)
// 25 dakikalık geri sayım: Başlat / Duraklat / Devam / Sıfırla.
// Süre bitince DataContext'e haber verilir; o da XP ödülü verir
// (settings.pomodoroXp) ve kullanıcıya bildirim gösterir.
//
// Neden "Date.now()" tabanlı? Cihazdaki setTimeout/interval arka planda
// durduğu için ona güvenemeyiz. Bitiş anını (endAt) saklıyoruz; kalan
// süre her saniye Date.now() ile hesaplanıyor. Uygulama kapansa bile
// oturum DataContext'te saklanır ve süre dolduğunda ödül verilir.
//
// Tasarım: accent (emerald) IconTile amblem, canlı gradient ilerleme
// çubuğu, XP ödülü pill'i, Linear/Vercel tarzı yumuşak köşeler.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useData } from '../context/DataContext';
import { formatDuration, POMODORO_DURATION_MS } from '../logic';
import { useTheme } from '../theme';
import GradientButton from './GradientButton';
import { IconTile, Pill, SoftButton } from './ui';

export default function PomodoroTimer() {
  const {
    data,
    startPomodoro,
    pausePomodoro,
    resumePomodoro,
    resetPomodoro,
    completePomodoro,
  } = useData();
  const { colors: C, radius, glow } = useTheme();
  const styles = useMemo(() => makeStyles(C, radius), [C, radius]);
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
  const running = pomodoro.state === 'running';

  return (
    <View style={[styles.card, glow(C.primary, { opacity: 0.14, radius: 24, offset: 5 })]}>
      <View style={styles.header}>
        <IconTile icon="timer" emoji="🍅" variant="accent" size={46} />
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Odak Zamanı</Text>
          <View style={styles.metaRow}>
            <Text style={styles.subtitle}>25 dk seans</Text>
            <Pill icon="⚡" size="sm" bg={C.gold + '1A'} color={C.gold}>
              +{xpReward} XP
            </Pill>
          </View>
        </View>
      </View>

      <Text style={styles.timer}>{formatDuration(remainingMs)}</Text>

      {/* İlerleme çubuğu: koşarken canlı gradyan, durduğunda düz */}
      <View style={styles.track}>
        {running ? (
          <LinearGradient
            colors={[C.accent, C.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${progress * 100}%` }]}
          />
        ) : (
          <View
            style={[
              styles.fill,
              { width: `${progress * 100}%`, backgroundColor: C.surfaceLight },
            ]}
          />
        )}
      </View>

      <View style={styles.buttons}>
        {pomodoro.state === 'idle' && (
          <GradientButton
            label="Başlat"
            icon="▶"
            onPress={startPomodoro}
            style={styles.btnFlex}
            glowColor={C.accent}
          />
        )}
        {pomodoro.state === 'running' && (
          <>
            <SoftButton
              label="Duraklat"
              icon="⏸"
              onPress={pausePomodoro}
              style={styles.btnFlex}
            />
            <SoftButton icon="↺" variant="ghost" onPress={resetPomodoro} style={styles.btnGhost} />
          </>
        )}
        {pomodoro.state === 'paused' && (
          <>
            <GradientButton
              label="Devam"
              icon="▶"
              onPress={resumePomodoro}
              style={styles.btnFlex}
              glowColor={C.accent}
            />
            <SoftButton icon="↺" variant="ghost" onPress={resetPomodoro} style={styles.btnGhost} />
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(C, radius) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerInfo: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subtitle: {
      color: C.textMuted,
      fontSize: 12,
    },
    timer: {
      color: C.text,
      fontSize: 46,
      fontWeight: '800',
      textAlign: 'center',
      marginVertical: 8,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: C.background,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    buttons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    btnFlex: {
      flex: 1,
    },
    btnGhost: {
      flexShrink: 0,
    },
  });
}