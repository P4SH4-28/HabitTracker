'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Widget renkleri uygulamanın koyu temasıyla (#0B0E14) uyumludur.
const BG = '#0B0E14';
const SURFACE = '#141A26';
const TEXT = '#F2F5FF';
const MUTED = '#8A8FA8';
const ACCENT = '#7C5CFF';
const GOLD = '#FFD34D';
const GREEN = '#35D07F';
const EMPTY_DOT = '#2A2F45';

const MAX_ROWS = 4;

// Sadece ilkelleri (primitives) kullanmalı: View/Text kullanılamaz.
// Widget bileşenleri hook kullanamaz ve async olamaz.
export function HabitWidget({ snapshot }) {
  const habits = snapshot?.habits || [];
  const done = snapshot?.totalDone || 0;
  const total = snapshot?.total || 0;
  const gold = snapshot?.gold || 0;
  const frozen = !!snapshot?.frozen;

  const rows = habits.slice(0, MAX_ROWS);
  const extra = habits.length - rows.length;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: BG,
        borderRadius: 18,
        padding: 12,
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 2,
        }}
      >
        <TextWidget text="Bugün" style={{ fontSize: 15, color: TEXT, fontWeight: 'bold' }} />
        <TextWidget text={`🪙 ${gold}`} style={{ fontSize: 12, color: GOLD }} />
      </FlexWidget>

      <TextWidget
        text={
          habits.length === 0
            ? 'Henüz alışkanlık yok'
            : `${done}/${total} tamamlandı${frozen ? ' · seriler donduruldu ❄️' : ''}`
        }
        style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}
      />

      {rows.map((h) => (
        <FlexWidget
          key={h.name}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: SURFACE,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginBottom: 4,
          }}
        >
          <TextWidget text={`${h.emoji || '✅'} `} style={{ fontSize: 13 }} />
          <TextWidget
            text={h.name}
            style={{
              fontSize: 13,
              color: TEXT,
              flexGrow: 1,
              marginRight: 6,
            }}
          />
          <TextWidget
            text={h.streak > 0 ? `🔥 ${h.streak}` : '—'}
            style={{ fontSize: 11, color: GOLD, marginRight: 6 }}
          />
          <TextWidget
            text={h.done ? '✓' : '○'}
            style={{ fontSize: 14, color: h.done ? GREEN : EMPTY_DOT }}
          />
        </FlexWidget>
      ))}

      {extra > 0 && (
        <TextWidget text={`+${extra} tane daha`} style={{ fontSize: 11, color: ACCENT }} />
      )}

      {habits.length === 0 && (
        <TextWidget
          text="Uygulamayı aç ve ilk alışkanlığını ekle 🎯"
          style={{ fontSize: 12, color: MUTED }}
        />
      )}
    </FlexWidget>
  );
}
