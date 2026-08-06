import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { searchProfiles } from '../services/api';
import { useTheme } from '../theme';
import AvatarCircle from './AvatarCircle';
import Sheet from './Sheet';

// Arkadaş ekleme akışı: sunucuda isim arar, bulunan profillere
// arkadaşlık isteği gönderir (onay → karşılıklı arkadaşlık).
export default function AddFriendModal({ visible, onClose }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, requestFriend, refreshServer } = useData();
  const { user: authUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);
  const meName = authUser?.name || '';

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setSearched(false);
      setFeedback(null);
      setBusy(null);
      return;
    }
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const r = await searchProfiles(q);
      setSearching(false);
      setSearched(true);
      setResults(r.ok ? r.data?.results || [] : []);
      if (!r.ok) setFeedback({ name: null, text: 'Arama yapılamadı (çevrimdışı mısın?)', ok: false });
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, visible]);

  const send = async (name) => {
    setBusy(name);
    setFeedback(null);
    const res = await requestFriend(name);
    setBusy(null);
    if (!res.ok) {
      setFeedback({ name, text: res.error || 'İstek gönderilemedi', ok: false });
      return;
    }
    if (res.state === 'already_friends') {
      setFeedback({ name, text: 'Zaten arkadaşsınız ✓', ok: true });
      await refreshServer();
    } else if (res.state === 'already_pending') {
      setFeedback({ name, text: 'İstek zaten beklemede ⏳', ok: true });
    } else {
      setFeedback({ name, text: 'İstek gönderildi ✓', ok: true });
    }
  };

  const isFriend = (name) => data.friends.some((f) => f.name === name);

  return (
    <Sheet visible={visible} onClose={onClose} title="Arkadaş Ekle">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TextInput
          style={styles.input}
          placeholder="İsim ara (örn. Zeynep)"
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
        />
        <Text style={styles.hint}>
          Arkadaşın uygulamaya sunucuda kayıtlı olmalı; ismiyle aranır. Onay aldıktan sonra
          ikiniz de arkadaş listesinde görünürsünüz.
        </Text>

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {searching && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.centerText}>Aranıyor...</Text>
            </View>
          )}
          {!searching &&
            results
              .filter((r) => r.name !== meName)
              .map((r) => {
                const friend = isFriend(r.name);
                return (
                  <View key={r.token} style={styles.row}>
                    <AvatarCircle
                      avatarId={r.avatarId}
                      emoji={r.avatarId ? undefined : r.emoji}
                      frameId={r.frameId}
                      size={40}
                    />
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.rowMeta}>⚡ {r.xp} XP</Text>
                    </View>
                    {friend ? (
                      <View style={[styles.tag, styles.tagDone]}>
                        <Text style={styles.tagDoneText}>Arkadaş ✓</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.sendButton, busy === r.name && styles.sendButtonDisabled]}
                        onPress={() => send(r.name)}
                        disabled={busy === r.name}
                      >
                        {busy === r.name ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.sendButtonText}>İstek Gönder</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
          {!searching && searched && results.length === 0 && (
            <View style={styles.centerBox}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.centerText}>Sonuç bulunamadı.</Text>
              <Text style={styles.centerSub}>
                İsmin tam doğru yazıldığından ve kişinin uygulamaya giriş yaptığından emin ol.
              </Text>
            </View>
          )}
        </ScrollView>

        {feedback && (
          <View style={[styles.feedbackBox, !feedback.ok && { borderColor: C.danger }]}>
            <Text style={[styles.feedbackText, !feedback.ok && { color: C.danger }]}>
              {feedback.text}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Sheet>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    input: {
      height: 50,
      borderRadius: 14,
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 16,
      color: C.text,
      fontSize: 15,
    },
    hint: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
      marginBottom: 4,
    },
    list: {
      maxHeight: 320,
      marginTop: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    rowName: {
      color: C.text,
      fontSize: 15,
      fontWeight: '700',
    },
    rowMeta: {
      color: C.textMuted,
      fontSize: 12,
    },
    sendButton: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 104,
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    tag: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagDone: {
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
    },
    tagDoneText: {
      color: C.accent,
      fontSize: 13,
      fontWeight: '800',
    },
    centerBox: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    centerText: {
      color: C.textMuted,
      fontSize: 13,
    },
    centerSub: {
      color: C.textMuted,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 16,
    },
    emptyEmoji: {
      fontSize: 30,
    },
    feedbackBox: {
      marginTop: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.accent,
      backgroundColor: C.surfaceLight,
      padding: 10,
    },
    feedbackText: {
      color: C.accent,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}
