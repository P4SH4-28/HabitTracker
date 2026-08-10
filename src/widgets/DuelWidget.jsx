'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Hızlı Düello Ayarlama — 2x2
// Tasarım: üstte "Düello Ayarla" + 🔥, altta büyük açık gri Play ▶
// butonu. Tıklama deep link ile Düello Kurma ekranını açar:
// myapp://duel/create
const BG = '#17181C';
const SURFACE = '#2A2F3A';
const TEXT = '#F2F5FF';
const MUTED = '#9AA0B5';
const BUTTON = '#B9C0D4';
const BUTTON_TEXT = '#17181C';

export function DuelWidget({ snapshot }) {
  const active = !!snapshot?.duel?.active;
  const opponent = snapshot?.duel?.opponent || null;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: BG,
        borderRadius: 22,
        padding: 14,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'myapp://duel/create' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget
          text="Düello Ayarla"
          style={{ fontSize: 13, fontWeight: '800', color: TEXT }}
        />
        <TextWidget text="  🔥" style={{ fontSize: 15 }} />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 60,
          height: 60,
          borderRadius: 40,
          backgroundColor: BUTTON,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FlexWidget
          style={{
            width: 0,
            height: 0,
            marginLeft: 4,
            borderLeftWidth: 18,
            borderTopWidth: 11,
            borderBottomWidth: 11,
            borderLeftColor: BUTTON_TEXT,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            backgroundColor: 'transparent',
          }}
        />
      </FlexWidget>

      <TextWidget
        text={active && opponent ? `vs ${opponent}` : 'rakip seç, savaş başlasın'}
        style={{ fontSize: 10, color: active ? '#FF6B4A' : MUTED }}
      />
    </FlexWidget>
  );
}
