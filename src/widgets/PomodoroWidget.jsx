'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Pomodoro Hızlı Başlangıç — 2x2
// Tasarım: üstte sarı vurgulu "Pomodoro Başlat" kutusu, altta büyük
// sarı Play ▶ butonu. Tıklama deep link ile uygulamayı açar ve
// sayacı anında başlatır: myapp://pomodoro/start
const BG = '#141032';
const BOX = '#FFD34D';
const BOX_TEXT = '#1A1530';
const MUTED = '#B9B4E8';
const GOLD = '#FFC107';

export function PomodoroWidget({ snapshot }) {
  const running = !!snapshot?.pomodoroRunning;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
        borderRadius: 22,
        padding: 12,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'myapp://pomodoro/start' }}
    >
      <FlexWidget
        style={{
          backgroundColor: BOX,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginBottom: 10,
        }}
      >
        <TextWidget
          text="Pomodoro Başlat"
          style={{ fontSize: 13, fontWeight: '900', color: BOX_TEXT }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 64,
          height: 64,
          borderRadius: 40,
          backgroundColor: running ? 'rgba(255,193,7,0.25)' : GOLD,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FlexWidget
          style={{
            width: 0,
            height: 0,
            marginLeft: 4,
            borderLeftWidth: 20,
            borderTopWidth: 12,
            borderBottomWidth: 12,
            borderLeftColor: running ? '#FFC107' : '#141032',
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            backgroundColor: 'transparent',
          }}
        />
      </FlexWidget>

      {running ? (
        <TextWidget text="çalışıyor…" style={{ fontSize: 10, color: MUTED, marginTop: 8 }} />
      ) : null}
    </FlexWidget>
  );
}
