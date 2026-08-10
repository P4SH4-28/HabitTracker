// ============================================================
// widgetTaskHandler — Android widget olaylarını karşılar
// (widget eklendi, periyodik yenileme, yeniden boyutlandırma,
//  öğe tıklamaları...). index.js içinde yalnızca Android'de yüklenir.
//
// Tıklama action'ları:
//   OPEN_APP / OPEN_URI  → native tarafta işlenir (JS çalışmaz),
//                          widget bileşeninde tanımlanır.
//   TASK_DONE:<id>       → görevi arka planda işaretle (pending kuyruk)
// ============================================================
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { StreakWidget } from './StreakWidget';
import { PomodoroWidget } from './PomodoroWidget';
import { QuickTaskWidget } from './QuickTaskWidget';
import { DuelWidget } from './DuelWidget';
import { loadWidgetSnapshot, enqueueWidgetTask, WIDGET_NAMES } from '../services/widgetService';

const WIDGET_RENDERERS = {
  StreakWidget,
  PomodoroWidget,
  QuickTaskWidget,
  DuelWidget,
};

export async function widgetTaskHandler(props) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  if (!widgetInfo || !WIDGET_NAMES.includes(widgetInfo.widgetName)) return;
  if (widgetAction === 'WIDGET_DELETED') return;

  // ---------- Tıklama işlemleri (headless JS'te de çalışır) ----------
  if (widgetAction && widgetAction !== 'WIDGET_CLICKED') {
    if (widgetAction.startsWith('TASK_DONE:')) {
      const taskId = widgetAction.slice('TASK_DONE:'.length);
      if (taskId) {
        await enqueueWidgetTask(taskId);
        // Kuyruğa yazıldıktan sonra widget'ı yeniden çiz (işaretli görünsün).
        const snapshot = await loadWidgetSnapshot();
        const tasks = (snapshot?.tasks || []).map((t) =>
          t.id === taskId ? { ...t, done: true } : t
        );
        renderWidget({
          light: <QuickTaskWidget snapshot={{ ...snapshot, tasks }} />,
          dark: <QuickTaskWidget snapshot={{ ...snapshot, tasks }} />,
        });
      }
      return;
    }
  }

  // ---------- Görünüm güncellemesi (ekleme, periyodik, boyut) ----------
  const snapshot = await loadWidgetSnapshot();
  const Renderer = WIDGET_RENDERERS[widgetInfo.widgetName] || StreakWidget;
  renderWidget({
    light: <Renderer snapshot={snapshot} />,
    dark: <Renderer snapshot={snapshot} />,
  });
}

registerWidgetTaskHandler(widgetTaskHandler);
