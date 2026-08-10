'use no memo';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Hızlı Görev Tamamlama — 4x2
// Günün aktif görevlerini (max 4) listeler. Her satırda görev adı ve
// yuvarlak onay kutusu (○ / 🔘). Onay kutusuna tıklanınca
// clickAction = "TASK_DONE:<id>" ile widgetTaskHandler çalışır:
// görev arka planda (AsyncStorage + Supabase sync) tamamlanır,
// liste yeniden çizilir (tamamlananlar üstü çizili görünür).
const BG = '#0B0E14';
const SURFACE = '#141A26';
const TEXT = '#F2F5FF';
const MUTED = '#8A8FA8';
const ACCENT = '#7C5CFF';
const GREEN = '#35D07F';
const EMPTY = '#2A2F45';
const MAX_ROWS = 4;

export function QuickTaskWidget({ snapshot }) {
  const tasks = (snapshot?.tasks || []).slice(0, MAX_ROWS);
  const doneCount = tasks.filter((t) => t.done).length;

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
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <TextWidget text="Günün Görevleri" style={{ fontSize: 13, fontWeight: '800', color: TEXT }} />
        <TextWidget text={`${doneCount}/${tasks.length}`} style={{ fontSize: 11, color: MUTED }} />
      </FlexWidget>

      {tasks.length === 0 ? (
        <TextWidget text="Bugün için görev yok" style={{ fontSize: 12, color: MUTED }} />
      ) : (
        tasks.map((t) => (
          <FlexWidget
            key={t.id}
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
            <TextWidget text={`${t.emoji || '📋'} `} style={{ fontSize: 12 }} />
            <TextWidget
              text={t.title}
              style={{
                fontSize: 12,
                color: t.done ? MUTED : TEXT,
                textDecorationLine: t.done ? 'line-through' : 'none',
                flexGrow: 1,
                marginRight: 6,
              }}
            />
            <FlexWidget
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: t.done ? GREEN : ACCENT,
                backgroundColor: t.done ? GREEN : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              clickAction={t.done ? 'OPEN_APP' : `TASK_DONE:${t.id}`}
            >
              {t.done ? <TextWidget text="✓" style={{ fontSize: 13, color: '#0B0E14', fontWeight: '900' }} /> : null}
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
