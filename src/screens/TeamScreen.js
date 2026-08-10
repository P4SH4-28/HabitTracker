// ============================================================
// TeamScreen — "Takımım" ekranı (sol menüden açılır)
// Kulüp sisteminin ana ekranı: takım kurabilir, açık takımlara
// katılabilir veya kendi takımının üyelerini görebilirsin.
// Üyeler haftalık XP'ye (xp7d) göre sıralanır; takımın ortak
// haftalık hedefi (1000 XP) ilerleme çubuğuyla gösterilir.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import AvatarCircle from '../components/AvatarCircle';
import {
  createTeam,
  getTeamFor,
  getTeamMembers,
  getTeams,
  joinTeam,
  leaveTeam,
} from '../services/teamService';

const TEAM_EMOJIS = ['🏳️', '🦁', '🐺', '🦅', '🐉', '🦈', '🚀', '🎯', '👑'];
const WEEKLY_GOAL_XP = 1000;

function confirmDialog(title, message, okLabel, onOk) {
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: okLabel, style: 'destructive', onPress: onOk },
  ]);
}

export default function TeamScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuth();
  const myName = user?.name || '';

  const [loading, setLoading] = useState(true);
  const [myTeam, setMyTeam] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [openTeams, setOpenTeams] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(TEAM_EMOJIS[0]);

  const refresh = useCallback(async () => {
    const t = await getTeamFor(myName);
    if (!t.ok) {
      setLoading(false);
      return;
    }
    setMyTeam(t.team);
    setMyRole(t.role);
    if (t.team) {
      const m = await getTeamMembers(t.team.id);
      setMembers(m.ok ? m.members : []);
    } else {
      setMembers([]);
      const list = await getTeams();
      setOpenTeams(list.ok ? list.teams : []);
    }
    setLoading(false);
  }, [myName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const weeklyXp = members.reduce((s, m) => s + (m.xp7d || 0), 0);
  const goalPct = Math.min(1, weeklyXp / WEEKLY_GOAL_XP);
  const goalDone = weeklyXp >= WEEKLY_GOAL_XP;

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const r = await createTeam(newName, newEmoji, myName);
      if (!r.ok) {
        Alert.alert('Kurulamadı', r.error || 'Takım kurulamadı.');
      } else {
        setNewName('');
        setNewEmoji(TEAM_EMOJIS[0]);
        await refresh();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (team) => {
    confirmDialog(
      `"${team.name}" takımına katıl`,
      `${team.emoji} ${team.name} — ${team.memberCount} üye. Katılmak istediğine emin misin?`,
      'Katıl',
      async () => {
        const r = await joinTeam(team.id, myName);
        if (!r.ok) {
          Alert.alert('Katılınamadı', r.error || 'Katılım başarısız.');
          return;
        }
        await refresh();
      }
    );
  };

  const handleLeave = () => {
    const isLeader = myRole === 'leader';
    confirmDialog(
      isLeader ? 'Takımı dağıt' : 'Takımdan ayrıl',
      isLeader
        ? 'Lider olduğun için ayrılınca takım tamamen silinir (üyeler de düşer). Emin misin?'
        : 'Takımdan ayrılmak istediğine emin misin?',
      isLeader ? 'Dağıt' : 'Ayrıl',
      async () => {
        const r = await leaveTeam(myTeam.id, myName, myRole);
        if (!r.ok) {
          Alert.alert('Ayrılınamadı', r.error || 'İşlem başarısız.');
          return;
        }
        await refresh();
      }
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Takım bilgileri yükleniyor…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {myTeam ? (
        <>
          {/* Takım kartı */}
          <View style={styles.teamCard}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamEmoji}>{myTeam.emoji}</Text>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{myTeam.name}</Text>
                <Text style={styles.teamMeta}>
                  Lider: {myTeam.leader} • {members.length} üye
                </Text>
              </View>
              <Pressable style={styles.leaveBtn} onPress={handleLeave}>
                <Text style={styles.leaveBtnText}>
                  {myRole === 'leader' ? 'Dağıt' : 'Ayrıl'}
                </Text>
              </Pressable>
            </View>

            {/* Haftalık ortak hedef */}
            <View style={styles.goalCard}>
              <View style={styles.goalTop}>
                <Text style={styles.goalTitle}>
                  {goalDone ? '🎉 Haftalık hedef tamam!' : '🎯 Haftalık ortak hedef'}
                </Text>
                <Text style={styles.goalXp}>
                  {weeklyXp}/{WEEKLY_GOAL_XP} XP
                </Text>
              </View>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: `${Math.round(goalPct * 100)}%` }]} />
              </View>
              <Text style={styles.goalHint}>
                Takımın toplam haftalık XP'si — her üyenin bu haftaki kazancı sayılır.
              </Text>
            </View>
          </View>

          {/* Üye listesi */}
          <Text style={styles.sectionTitle}>Üyeler</Text>
          <View style={styles.membersCard}>
            {members.map((m) => (
              <View key={m.username} style={styles.memberRow}>
                <AvatarCircle
                  avatarId={m.avatarId || 'av_fox'}
                  emoji={m.avatarId ? undefined : m.emoji}
                  frameId={m.frameId}
                  photo={m.photoUrl || null}
                  size={36}
                />
                <Text style={[styles.memberName, m.role === 'leader' && styles.memberLeader]}>
                  {m.username}
                  {m.role === 'leader' ? ' 👑' : ''}
                  {m.username === myName ? ' (sen)' : ''}
                </Text>
                <View style={styles.memberStats}>
                  <Text style={styles.memberXp7d}>{m.xp7d || 0} XP/7g</Text>
                  <Text style={styles.memberStreak}>🔥 {m.streak || 0}</Text>
                </View>
              </View>
            ))}
            {members.length === 0 ? (
              <Text style={styles.emptyText}>Üye bilgileri yüklenemedi.</Text>
            ) : null}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              💡 Takımın birlikte 1000 XP toplarsa hedef tamamlanır — arkadaşlarını
              takıma davet etmek için onlara takım adını söylemen yeterli.
            </Text>
          </View>
        </>
      ) : (
        <>
          {/* Takım kur */}
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>Yeni takım kur</Text>
            <TextInput
              style={styles.input}
              placeholder="Takım adı (2-30 karakter)"
              placeholderTextColor={C.textMuted}
              value={newName}
              onChangeText={setNewName}
              maxLength={30}
            />
            <View style={styles.emojiRow}>
              {TEAM_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.emojiPick, newEmoji === e && styles.emojiPickActive]}
                  onPress={() => setNewEmoji(e)}
                >
                  <Text style={styles.emojiPickText}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.createBtn, (!newName.trim() || creating) && styles.btnDisabled]}
              disabled={!newName.trim() || creating}
              onPress={handleCreate}
            >
              <Text style={styles.createBtnText}>Takım Kur</Text>
            </Pressable>
          </View>

          {/* Açık takımlar */}
          <Text style={styles.sectionTitle}>Açık takımlara katıl</Text>
          <View style={styles.openCard}>
            {openTeams.map((t) => (
              <View key={t.id} style={styles.openRow}>
                <Text style={styles.openEmoji}>{t.emoji}</Text>
                <View style={styles.openInfo}>
                  <Text style={styles.openName}>{t.name}</Text>
                  <Text style={styles.openMeta}>
                    Lider: {t.leader} • {t.memberCount} üye
                  </Text>
                </View>
                <Pressable style={styles.joinBtn} onPress={() => handleJoin(t)}>
                  <Text style={styles.joinBtnText}>Katıl</Text>
                </Pressable>
              </View>
            ))}
            {openTeams.length === 0 ? (
              <Text style={styles.emptyText}>
                Henüz açık takım yok — ilk takımı sen kur!
              </Text>
            ) : null}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              💡 Takım kurduğunda lider olursun; ayrılınca takım silinir. Herkes
              en fazla bir takımda olabilir ve takımın ortak haftalık hedefi
              üyelerin XP'sinden hesaplanır.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: C.textMuted,
      fontSize: 14,
    },
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 60,
    },
    teamCard: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.primary + '66',
      padding: 16,
      gap: 14,
    },
    teamHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    teamEmoji: {
      fontSize: 36,
    },
    teamInfo: {
      flex: 1,
      gap: 2,
    },
    teamName: {
      color: C.text,
      fontSize: 17,
      fontWeight: '800',
    },
    teamMeta: {
      color: C.textMuted,
      fontSize: 12,
    },
    leaveBtn: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: C.danger + '22',
    },
    leaveBtnText: {
      color: C.danger,
      fontSize: 12,
      fontWeight: '800',
    },
    goalCard: {
      backgroundColor: C.surfaceLight,
      borderRadius: 14,
      padding: 12,
      gap: 8,
    },
    goalTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    goalTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '800',
    },
    goalXp: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    goalTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: C.surface,
      overflow: 'hidden',
    },
    goalFill: {
      height: '100%',
      borderRadius: 5,
      backgroundColor: C.primary,
    },
    goalHint: {
      color: C.textMuted,
      fontSize: 11,
      lineHeight: 16,
    },
    sectionTitle: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    membersCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 6,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      paddingHorizontal: 10,
    },
    memberEmoji: {
      fontSize: 18,
    },
    memberName: {
      flex: 1,
      color: C.text,
      fontSize: 13,
      fontWeight: '600',
    },
    memberLeader: {
      fontWeight: '800',
      color: C.gold,
    },
    memberStats: {
      alignItems: 'flex-end',
    },
    memberXp7d: {
      color: C.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    memberStreak: {
      color: C.textMuted,
      fontSize: 11,
    },
    createCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      gap: 12,
    },
    createTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    input: {
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: C.text,
      fontSize: 14,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    emojiPick: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    emojiPickActive: {
      borderColor: C.primary,
      backgroundColor: C.primary + '22',
    },
    emojiPickText: {
      fontSize: 20,
    },
    createBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    createBtnText: {
      color: C.onPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    btnDisabled: {
      opacity: 0.4,
    },
    openCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 6,
    },
    openRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    openEmoji: {
      fontSize: 22,
    },
    openInfo: {
      flex: 1,
      gap: 1,
    },
    openName: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
    },
    openMeta: {
      color: C.textMuted,
      fontSize: 11,
    },
    joinBtn: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: C.primary,
    },
    joinBtnText: {
      color: C.onPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    emptyText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
      padding: 12,
    },
    noteBox: {
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
    },
    noteText: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
