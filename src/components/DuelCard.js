// ============================================================
// DuelCard — arkadaş düellosu kartı (7 günlük XP yarışı)
// Durumlar:
// - pending (gelen davet): Kabul / Red butonları
// - pending (giden davet): bekleniyor bilgisi
// - active: canlı skor çubuğu + kalan süre (+ süre dolduysa "Bitir")
// Kazanan, bitiş anında düello başlangıcından bu yana en çok XP
// kazanan taraftır; ödülü sunucu verir (duel-action).
// ============================================================
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

// Kalan süreyi "3g 4s" / "1s 12dk" biçiminde gösterir.
function formatRemaining(endsAt) {
  const ms = Date.parse(endsAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'bitti';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${mins}dk`;
  return `${mins}dk`;
}

export default function DuelCard({ duel, onAccept, onDecline, onFinish }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const remaining = formatRemaining(duel.endsAt);
  const finished = remaining === 'bitti';

  if (duel.status === 'pending' && !duel.isChallenger) {
    // Gelen davet: kabul / red.
    return (
      <View style={[styles.card, { borderColor: C.accent }]}>
        <Text style={styles.emoji}>⚔️</Text>
        <View style={styles.body}>
          <Text style={styles.title}>{duel.opponent} seni düelloya davet etti!</Text>
          <Text style={styles.desc}>
            7 günlük XP yarışı — kazanan +100 XP ve +50 🪙 kazanır.
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.acceptBtn} onPress={() => onAccept(duel.id)}>
              <Text style={styles.acceptText}>Kabul Et</Text>
            </Pressable>
            <Pressable style={styles.declineBtn} onPress={() => onDecline(duel.id)}>
              <Text style={styles.declineText}>Reddet</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Giden davet (bekleniyor) veya aktif düello.
  const myGain = Math.max(0, duel.myXp - duel.startXpMe);
  const theirGain = Math.max(0, duel.opponentXp - duel.startXpThem);
  const total = myGain + theirGain;
  const myPct = total > 0 ? (myGain / total) * 100 : 50;

  return (
    <View style={[styles.card, { borderColor: C.border }]}>
      <Text style={styles.emoji}>⚔️</Text>
      <View style={styles.body}>
        <Text style={styles.title}>
          {duel.status === 'pending'
            ? `${duel.opponent}'e düello daveti gönderildi`
            : `Düello: ${duel.opponent}`}
        </Text>
        <Text style={styles.desc}>
          {duel.status === 'pending' ? 'Kabul edilmesi bekleniyor…' : `Kalan süre: ${remaining}`}
        </Text>
        {duel.status === 'active' && (
          <>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>Sen: +{myGain} XP</Text>
              <Text style={styles.scoreText}>{duel.opponent}: +{theirGain} XP</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${myPct}%`, backgroundColor: C.primary }]} />
            </View>
            {finished ? (
              <Pressable style={styles.acceptBtn} onPress={() => onFinish(duel.id)}>
                <Text style={styles.acceptText}>Sonucu Gör 🏆</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      gap: 12,
      alignItems: 'center',
    },
    emoji: {
      fontSize: 28,
    },
    body: {
      flex: 1,
      gap: 6,
    },
    title: {
      color: C.text,
      fontSize: 14,
      fontWeight: '800',
    },
    desc: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    acceptBtn: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    acceptText: {
      color: C.onPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    declineBtn: {
      backgroundColor: C.surfaceLight,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    declineText: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    scoreText: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    barTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.surfaceLight,
      overflow: 'hidden',
    },
    barFill: {
      height: 8,
      borderRadius: 4,
    },
  });
}
