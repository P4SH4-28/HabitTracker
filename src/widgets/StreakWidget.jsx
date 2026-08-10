'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Seri Tracker — 2x2
// Tasarım: üstte "Seri" + 🔥, ortada büyük seri sayısı, altta dinamik
// mesaj (hedefler tamamlanmadıysa kalan sayısı, tamamlandıysa tebrik).
// Koyu lacivert (gece mavisi) zemin, yuvarlatılmış köşeler.
const BG = '#0D1233';
const SURFACE = '#171E4A';
const TEXT = '#F2F5FF';
const MUTED = '#9AA0C9';
const ACCENT = '#FFD34D';
const FIRE = '#FF6B4A';
const GREEN = '#35D07F';

export function StreakWidget({ snapshot }) {
  const streak = snapshot?.streak || {};
  const s = streak.streak ?? 0;
  const done = streak.doneToday ?? 0;
  const total = streak.totalToday ?? 0;
  const allDone = !!streak.allDone;
  const frozen = !!snapshot?.frozen;

  const message = allDone
    ? 'tebrikler 🎉'
    : `hedeflerin ${Math.max(0, total - done)}`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        borderRadius: 22,
        padding: 14,
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextWidget
          text="Seri"
          style={{ fontSize: 13, fontWeight: '800', color: TEXT }}
        />
        <TextWidget
          text={frozen ? '❄️' : '🔥'}
          style={{ fontSize: 16 }}
        />
      </FlexWidget>

      <TextWidget
        text={String(s)}
        style={{ fontSize: 44, fontWeight: '900', color: allDone ? GREEN : FIRE }}
      />

      <TextWidget
        text={message}
        style={{ fontSize: 12, fontWeight: '600', color: allDone ? GREEN : MUTED }}
      />
    </FlexWidget>
  );
}
