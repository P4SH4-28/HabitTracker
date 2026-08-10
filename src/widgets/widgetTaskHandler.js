// Android sisteminin widget'ı güncelleme isteklerini karşılar.
// (Widget eklendi, periyodik yenileme, yeniden boyutlandırma...)
// index.js içinde yalnızca Android'de yüklenir.
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { HabitWidget } from './HabitWidget';
import { loadWidgetSnapshot, WIDGET_NAME } from '../services/widgetService';

export async function widgetTaskHandler(props) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  if (widgetInfo.widgetName !== WIDGET_NAME) return;
  if (widgetAction === 'WIDGET_DELETED') return;

  // Anlık görüntü yoksa widget "yükleniyor" durumunu gösterir (ilk ekleme).
  const snapshot = await loadWidgetSnapshot();
  renderWidget({
    light: <HabitWidget snapshot={snapshot} />,
    dark: <HabitWidget snapshot={snapshot} />,
  });
}

registerWidgetTaskHandler(widgetTaskHandler);
