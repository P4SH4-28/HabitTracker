// ============================================================
// InventoryScreen — "Envanter" ekranı (sol menüden açılır)
// Dükkan'dan altınla alınan eşyalar burada listelenir ve kullanılır.
// Aktif etkiler üstte gösterilir; her eşyanın adedi ve açıklaması
// yanında, "Kullan" butonuyla etkisi başlar (bkz. items.js).
// ============================================================
import { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useData } from '../context/DataContext';
import { ITEMS, XP_BOOST_USES } from '../data/items';
import { useTheme } from '../theme';

// Onay kutusu: mobilde Alert, web'de confirm.
function confirmDialog(title, message, onOk) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onOk();
  } else {
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kullan', onPress: onOk },
    ]);
  }
}

export default function InventoryScreen() {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { data, useItem, today } = useData();
  const gold = data.stats.gold || 0;
  const inv = data.inventory || {};
  const fx = data.activeEffects || { streakFreeze: null, penaltyShield: null, xpBoost: { usesLeft: 0 } };

  // Aktif etki durum metni (kartlarda gösterilir).
  const effectText = (id) => {
    if (id === 'streak_freeze') {
      return fx.streakFreeze === today ? 'Aktif — bugün serilerin korunuyor' : null;
    }
    if (id === 'penalty_shield') {
      return fx.penaltyShield === today ? 'Aktif — bu gece ceza kesilmeyecek' : null;
    }
    if (id === 'xp_boost') {
      const left = fx.xpBoost?.usesLeft || 0;
      return left > 0 ? `Aktif — ${left} tamamlamada 2x XP` : null;
    }
    return null;
  };

  const handleUse = (item) => {
    const activeText = effectText(item.id);
    if (activeText) return; // Buton zaten kilitli; güvenlik için
    confirmDialog(item.name, `${item.desc}\n\nKullanmak istediğine emin misin?`, () => {
      const r = useItem(item.id);
      if (r && r.ok === false) {
        Alert.alert('Kullanılamadı', r.error || 'Bu eşya şu an kullanılamıyor.');
      }
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.screenTitle}>Envanter</Text>
          <Text style={styles.screenSub}>Eşyalarını buradan kullan</Text>
        </View>
        <View style={styles.balanceChip}>
          <Text style={styles.balanceIcon}>🪙</Text>
          <Text style={styles.balanceText}>{gold}</Text>
        </View>
      </View>

      {/* Aktif etkiler özeti */}
      <View style={styles.activeCard}>
        <Text style={styles.activeTitle}>Şu an aktif etkiler</Text>
        {ITEMS.some((i) => effectText(i.id)) ? (
          ITEMS.map((item) => {
            const text = effectText(item.id);
            return text ? (
              <View key={item.id} style={styles.activeRow}>
                <Text style={styles.activeEmoji}>{item.emoji}</Text>
                <Text style={styles.activeText}>{text}</Text>
              </View>
            ) : null;
          })
        ) : (
          <Text style={styles.activeEmpty}>Aktif eşya etkisi yok — bir eşyayı kullanarak başla.</Text>
        )}
      </View>

      {/* Eşyalar */}
      {ITEMS.map((item) => {
        const count = inv[item.id] || 0;
        const active = effectText(item.id);
        const canUse = count > 0 && !active;
        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCount}>
                  {count} adet {item.id === 'xp_boost' ? `· her kullanım ${XP_BOOST_USES} hak` : ''}
                </Text>
              </View>
              {active ? (
                <View style={[styles.useBtn, styles.btnActive]}>
                  <Text style={styles.btnActiveText}>Aktif</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.useBtn, !canUse && styles.btnDisabled]}
                  disabled={!canUse}
                  onPress={() => handleUse(item)}
                >
                  <Text style={[styles.btnUseText, !canUse && styles.btnDisabledText]}>
                    {count > 0 ? 'Kullan' : 'Yok'}
                  </Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.itemDesc}>{item.desc}</Text>
          </View>
        );
      })}

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Eşyalar Dükkan'dan altınla satın alınır. Etkiler sunucu gününe
          bağlıdır ve gün değişince yenilenir; XP Enerjisi hakkı bitene kadar
          bekler. Cezadan korunmak için Kalkan'ı gün içinde kullanmayı unutma!
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 60,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    screenTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: '800',
    },
    screenSub: {
      color: C.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    balanceChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.gold + '66',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    balanceIcon: {
      fontSize: 16,
    },
    balanceText: {
      color: C.gold,
      fontSize: 16,
      fontWeight: '800',
    },
    activeCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.primary + '55',
      padding: 14,
      gap: 8,
    },
    activeTitle: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    activeEmoji: {
      fontSize: 15,
    },
    activeText: {
      color: C.text,
      fontSize: 13,
      fontWeight: '600',
    },
    activeEmpty: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    itemCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 10,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    itemEmoji: {
      fontSize: 30,
    },
    itemInfo: {
      flex: 1,
      gap: 2,
    },
    itemName: {
      color: C.text,
      fontSize: 15,
      fontWeight: '800',
    },
    itemCount: {
      color: C.textMuted,
      fontSize: 12,
    },
    itemDesc: {
      color: C.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    useBtn: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: C.primary,
    },
    btnActive: {
      backgroundColor: C.primary + '22',
    },
    btnActiveText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnUseText: {
      color: C.onPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    btnDisabledText: {
      color: C.textMuted,
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
