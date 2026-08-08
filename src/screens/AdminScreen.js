// ============================================================
// AdminScreen — "Yönetici Paneli" sekmesi (yalnızca admin hesabı)
// Kullanıcı ara → profil detayı gör → ban/unban, XP/altın ceza-ödül,
// tema/avatar/çerçeve hediye et, şüpheli bayrağını kaldır.
// Tüm işlemler admin-action Edge Function'ı üzerinden yürür ve
// denetim günlüğüne yazılır (Katman 5).
// ============================================================
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getShopItem, SHOP_ITEMS, FRAMES } from '../data/shop';
import { THEMES } from '../theme';
import { adminAction } from '../services/adminService';
import { useTheme } from '../theme';

// Hediye kategorileri (sıralı sekme).
const GRANT_TABS = [
  { key: 'theme', label: 'Tema', items: () => THEMES.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji })) },
  { key: 'avatar', label: 'Avatar', items: () => SHOP_ITEMS.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji })) },
  { key: 'frame', label: 'Çerçeve', items: () => FRAMES.map((f) => ({ id: f.id, name: f.name, emoji: f.emoji })) },
];

export default function AdminScreen() {
  const { user: authUser } = useAuth();
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null); // seçili kullanıcı detayı
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null); // { ok, text }
  const [xpInput, setXpInput] = useState('');
  const [goldInput, setGoldInput] = useState('');
  const [banReason, setBanReason] = useState('');
  const [grantTab, setGrantTab] = useState('theme');
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const actor = authUser?.name || 'P4SH4';

  const notify = (ok, text) => setMessage({ ok, text });

  // Sonuç listesini tazele (admin panele arama).
  const doSearch = async () => {
    const q = query.trim();
    if (!q) return notify(false, 'Arama için bir isim yaz');
    setSearching(true);
    setMessage(null);
    const r = await adminAction('search_users', actor, { q });
    setSearching(false);
    if (!r.ok) return notify(false, r.error);
    setResults(r.data.users || []);
    if ((r.data.users || []).length === 0) notify(false, 'Sonuç bulunamadı');
  };

  // Kullanıcı detayını çek + seç.
  const selectUser = async (username) => {
    setBusy('loading');
    setMessage(null);
    setSelected(null);
    const r = await adminAction('get_user', actor, { target: username });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    setSelected(r.data.user);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const r = await adminAction('get_user', actor, { target: selected.username });
    if (r.ok) setSelected(r.data.user);
  };

  const doBan = async () => {
    if (!selected) return;
    setBusy('ban');
    const r = await adminAction('ban', actor, { target: selected.username, reason: banReason.trim() });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    setBanReason('');
    notify(true, `${selected.username} yasaklandı`);
    await refreshSelected();
  };

  const doUnban = async () => {
    if (!selected) return;
    setBusy('unban');
    const r = await adminAction('unban', actor, { target: selected.username });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    notify(true, `${selected.username} yasağı kaldırıldı`);
    await refreshSelected();
  };

  // Ödül (+) veya ceza (-) uygular.
  const doAdjust = async (sign) => {
    if (!selected) return;
    const xp = Number(xpInput);
    const gold = Number(goldInput);
    if (!Number.isFinite(xp) || !Number.isFinite(gold) || (xp === 0 && gold === 0)) {
      return notify(false, 'Geçerli XP/altın değeri gir');
    }
    setBusy('adjust');
    const r = await adminAction('adjust', actor, {
      target: selected.username,
      xp: sign * xp,
      coins: sign * gold,
    });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    setXpInput('');
    setGoldInput('');
    notify(true, sign > 0 ? 'Ödül verildi' : 'Ceza kesildi');
    await refreshSelected();
  };

  const doGrant = async (itemType, itemId) => {
    if (!selected) return;
    setBusy('grant');
    const r = await adminAction('grant', actor, { target: selected.username, itemType, itemId });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    notify(true, 'Hediye gönderildi (kullanıcı sync sonrası kullanabilir)');
    await refreshSelected();
  };

  const doRevoke = async (itemType, itemId) => {
    if (!selected) return;
    setBusy('revoke');
    const r = await adminAction('revoke', actor, { target: selected.username, itemType, itemId });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    notify(true, 'Hediye geri alındı');
    await refreshSelected();
  };

  const doUnflag = async () => {
    if (!selected) return;
    setBusy('unflag');
    const r = await adminAction('unflag', actor, { target: selected.username });
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    notify(true, 'Şüpheli bayrağı kaldırıldı');
    await refreshSelected();
  };

  const loadLogs = async () => {
    setBusy('logs');
    const r = await adminAction('logs', actor);
    setBusy('');
    if (!r.ok) return notify(false, r.error);
    setLogs(r.data.logs || []);
    setShowLogs(true);
  };

  // Seçili kullanıcının hediye envanteri (id kümesi).
  const grantedSet = useMemo(() => {
    const set = new Set();
    (selected?.granted_items || []).forEach((g) => {
      if (g?.type && g?.id) set.add(`${g.type}:${g.id}`);
    });
    return set;
  }, [selected]);

  const tabDef = GRANT_TABS.find((t) => t.key === grantTab) || GRANT_TABS[0];
  const tabItems = tabDef.items();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>🛡️ Yönetici Paneli</Text>
        <Text style={styles.subtitle}>
          Tüm işlemler sunucuda denetlenir ve kayda geçer. Dikkatli kullan!
        </Text>

        {/* ---------- Arama ---------- */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Kullanıcı adı ara…"
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            onSubmitEditing={doSearch}
          />
          <Pressable style={[styles.primaryButton, searching && { opacity: 0.6 }]} onPress={doSearch} disabled={searching}>
            {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Ara</Text>}
          </Pressable>
        </View>

        {/* ---------- Arama sonuçları ---------- */}
        {results.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sonuçlar ({results.length})</Text>
            {results.map((u) => (
              <Pressable
                key={u.username}
                style={[styles.resultRow, u.username === selected?.username && styles.resultRowActive]}
                onPress={() => selectUser(u.username)}
              >
                <Text style={styles.resultName}>{u.username}</Text>
                <Text style={styles.resultMeta}>
                  {u.xp} XP • 🪙 {u.coins}
                  {u.banned ? ' • ⛔ BANLI' : ''}
                  {u.flagged ? ' • ⚠️' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ---------- İşlem geçmişi ---------- */}
        <Pressable style={styles.linkRow} onPress={loadLogs}>
          <Text style={styles.linkText}>
            {showLogs ? '📜 Denetim günlüğü (son 30 işlem)' : '📜 Denetim günlüğünü getir'}
          </Text>
        </Pressable>
        {showLogs && (
          <View style={styles.card}>
            {logs.length === 0 ? (
              <Text style={styles.muted}>Henüz işlem yok</Text>
            ) : (
              logs.map((l) => (
                <View key={l.id} style={styles.logRow}>
                  <Text style={styles.logText}>
                    {l.created_at?.slice(0, 16).replace('T', ' ')} • <Text style={styles.logAction}>{l.action}</Text>
                    {l.target ? ` → ${l.target}` : ''}
                  </Text>
                  {l.detail ? <Text style={styles.logDetail}>{l.detail}</Text> : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* ---------- Seçili kullanıcı ---------- */}
        {selected ? (
          <>
            <View style={styles.card}>
              <View style={styles.userHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{selected.username}</Text>
                  <Text style={styles.userMeta}>
                    {selected.xp} XP • 🪙 {selected.coins}
                    {selected.xp7d ? ` • 7 gün: +${selected.xp7d} XP` : ''}
                  </Text>
                </View>
                <View style={styles.userChips}>
                  {selected.banned ? (
                    <View style={[styles.chip, { backgroundColor: C.danger }]}>
                      <Text style={styles.chipText}>⛔ BANLI</Text>
                    </View>
                  ) : (
                    <View style={[styles.chip, { backgroundColor: '#2A3340' }]}>
                      <Text style={styles.chipText}>Aktif</Text>
                    </View>
                  )}
                  {selected.flagged && !selected.banned ? (
                    <View style={[styles.chip, { backgroundColor: C.xp }]}>
                      <Text style={styles.chipText}>⚠️ ŞÜPHELİ</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {selected.ban_reason ? (
                <Text style={styles.banReason}>Gerekçe: {selected.ban_reason}</Text>
              ) : null}
              {selected.flagged_reason && !selected.banned ? (
                <Text style={styles.banReason}>Bayrak nedeni: {selected.flagged_reason}</Text>
              ) : null}
            </View>

            {busy === 'loading' ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
            ) : null}

            {/* ---------- Yasaklama ---------- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yasaklama</Text>
              {!selected.banned ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Yasak gerekçesi (opsiyonel)"
                    placeholderTextColor={C.textMuted}
                    value={banReason}
                    onChangeText={setBanReason}
                  />
                  <Pressable style={[styles.dangerButton, busy === 'ban' && { opacity: 0.6 }]} onPress={doBan} disabled={busy !== ''}>
                    <Text style={styles.dangerText}>⛔ Kullanıcıyı Yasakla</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.muted}>Bu kullanıcı yasaklı — senkronu ve liderliği kapalı.</Text>
                  <Pressable style={[styles.primaryButton, busy === 'unban' && { opacity: 0.6 }]} onPress={doUnban} disabled={busy !== ''}>
                    <Text style={styles.primaryButtonText}>✅ Yasağı Kaldır</Text>
                  </Pressable>
                </>
              )}
              {selected.flagged ? (
                <Pressable style={[styles.secondaryButton, busy === 'unflag' && { opacity: 0.6 }]} onPress={doUnflag} disabled={busy !== ''}>
                  <Text style={styles.secondaryText}>🧹 Şüpheli Bayrağını Kaldır</Text>
                </Pressable>
              ) : null}
            </View>

            {/* ---------- Ödül / Ceza ---------- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ödül & Ceza (XP / altın)</Text>
              <View style={styles.adjustRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="XP"
                  placeholderTextColor={C.textMuted}
                  value={xpInput}
                  onChangeText={setXpInput}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Altın"
                  placeholderTextColor={C.textMuted}
                  value={goldInput}
                  onChangeText={setGoldInput}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.adjustRow}>
                <Pressable
                  style={[styles.giveButton, busy === 'adjust' && { opacity: 0.6 }]}
                  onPress={() => doAdjust(1)}
                  disabled={busy !== ''}
                >
                  <Text style={styles.giveButtonText}>🎁 Ödül Ver</Text>
                </Pressable>
                <Pressable
                  style={[styles.takeButton, busy === 'adjust' && { opacity: 0.6 }]}
                  onPress={() => doAdjust(-1)}
                  disabled={busy !== ''}
                >
                  <Text style={styles.takeButtonText}>⚖️ Ceza Kes</Text>
                </Pressable>
              </View>
            </View>

            {/* ---------- Hediye ---------- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Hediye Et</Text>
              <View style={styles.tabRow}>
                {GRANT_TABS.map((t) => (
                  <Pressable
                    key={t.key}
                    style={[styles.tab, grantTab === t.key && styles.tabActive]}
                    onPress={() => setGrantTab(t.key)}
                  >
                    <Text style={[styles.tabText, grantTab === t.key && styles.tabTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.itemGrid}>
                {tabItems.map((item) => {
                  const granted = grantedSet.has(`${grantTab}:${item.id}`);
                  return (
                    <View key={item.id} style={styles.itemCell}>
                      <Text style={styles.itemEmoji}>{item.emoji}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      {granted ? (
                        <Pressable
                          style={[styles.revokeBtn, busy === 'revoke' && { opacity: 0.6 }]}
                          onPress={() => doRevoke(grantTab, item.id)}
                          disabled={busy !== ''}
                        >
                          <Text style={styles.revokeText}>Geri Al</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[styles.grantBtn, busy === 'grant' && { opacity: 0.6 }]}
                          onPress={() => doGrant(grantTab, item.id)}
                          disabled={busy !== ''}
                        >
                          <Text style={styles.grantText}>Ver</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {/* ---------- Durum mesajı ---------- */}
        {message ? (
          <Text style={[styles.message, { color: message.ok ? C.accent : C.danger }]}>{message.text}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (C) =>
  StyleSheet.create({
    title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: C.textMuted, marginBottom: 16 },
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    input: {
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: C.text,
      fontSize: 14,
    },
    primaryButton: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: { color: C.onPrimary, fontWeight: '700', fontSize: 14 },
    secondaryButton: {
      backgroundColor: C.surfaceLight,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    secondaryText: { color: C.text, fontWeight: '600', fontSize: 14 },
    dangerButton: {
      backgroundColor: 'rgba(240,67,110,0.15)',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    dangerText: { color: C.danger, fontWeight: '700', fontSize: 14 },
    card: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 10 },
    muted: { fontSize: 13, color: C.textMuted, marginBottom: 8 },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    resultRowActive: { backgroundColor: 'rgba(124,92,255,0.12)', borderRadius: 8, paddingHorizontal: 8 },
    resultName: { fontSize: 15, fontWeight: '700', color: C.text },
    resultMeta: { fontSize: 12, color: C.textMuted },
    linkRow: { marginBottom: 12 },
    linkText: { color: C.primary, fontWeight: '600', fontSize: 13 },
    logRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
    logText: { fontSize: 12, color: C.textMuted },
    logAction: { fontWeight: '700', color: C.text },
    logDetail: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userName: { fontSize: 18, fontWeight: '800', color: C.text },
    userMeta: { fontSize: 13, color: C.textMuted, marginTop: 2 },
    userChips: { flexDirection: 'row', gap: 6 },
    chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    chipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    banReason: { fontSize: 12, color: C.xp, marginTop: 8 },
    adjustRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    giveButton: { flex: 1, backgroundColor: 'rgba(34,211,165,0.15)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    giveButtonText: { color: C.accent, fontWeight: '700', fontSize: 14 },
    takeButton: { flex: 1, backgroundColor: 'rgba(240,67,110,0.15)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    takeButtonText: { color: C.danger, fontWeight: '700', fontSize: 14 },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tab: {
      flex: 1,
      backgroundColor: C.surfaceLight,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    tabActive: { backgroundColor: C.primary },
    tabText: { color: C.textMuted, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: C.onPrimary },
    itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    itemCell: {
      width: '30.5%',
      backgroundColor: C.surfaceLight,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
    },
    itemEmoji: { fontSize: 22, marginBottom: 4 },
    itemName: { fontSize: 11, color: C.textMuted, marginBottom: 6 },
    grantBtn: { backgroundColor: C.primary, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 5 },
    grantText: { color: C.onPrimary, fontSize: 12, fontWeight: '700' },
    revokeBtn: { backgroundColor: 'rgba(240,67,110,0.2)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
    revokeText: { color: C.danger, fontSize: 12, fontWeight: '700' },
    message: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  });
