# 🧩 Widget Kurulum Rehberi (Android + iOS)

Uygulamanın 4 widget'ı var (aynı tasarım, aynı veri alanları):

| Widget | Boyut | Açıklama | Tıklama |
|---|---|---|---|
| **Seri Tracker** (`StreakWidget`) | 2x2 | Seri sayın + bugünkü hedef durumu | Uygulamayı açar |
| **Pomodoro Başlat** (`PomodoroWidget`) | 2x2 | Tek dokunuşla odak seansı | `myapp://pomodoro/start` |
| **Hızlı Görevler** (`QuickTaskWidget`) | 4x2 | Günün 4 görevi + onay kutuları | `TASK_DONE:<id>` |
| **Düello Ayarla** (`DuelWidget`) | 2x2 | Hızlı düello kurma | `myapp://duel/create` |

## 📱 Android (ÇALIŞIR — APK'da hazır)

Kod: `src/widgets/` + `src/services/widgetService.js` + `app.json` widget tanımları.

1. APK'yı kur, ana ekrana uzun bas → **Widget'lar** → istediğin widget'ı ekle.
2. Widget verileri **AsyncStorage** üzerinden paylaşılır (ana uygulama `saveWidgetSnapshot`, widget `loadWidgetSnapshot`).
3. **Görev tamamlama** widget'tan yapılınca görev `habittracker:pendingWidgetTasks` kuyruğuna yazılır; uygulama açıldığında `App.js` kuyruğu işler ve normal akışla (sunucu doğrulaması + ödül) tamamlar.
4. **Pomodoro/Düello** tıklamaları `myapp://` derin bağlantısını açar; `App.js` içindeki `useDeepLink` ilgili ekrana yönlendirir (pomodoro anında başlar).

> Not: Widget'lar yalnızca **standalone APK**'da çalışır; Expo Go'da native widget modülü yoktur.

## 🍎 iOS (Xcode + Mac gerektirir — Windows'ta test edilemez)

iOS widget'ları WidgetKit (Swift) ile yazılır ve **App Groups** üzerinden veri paylaşır. Bu depoda hazır dosyalar:

| Dosya | Açıklama |
|---|---|
| `ios-widgets/WidgetShared.swift` | App Group + UserDefaults paylaşım katmanı + veri modelleri |
| `ios-widgets/HabitTrackerWidgets.swift` | 4 widget (WidgetKit, @main bundle) |
| `ios-widgets/HabitTrackerWidgetBridge.swift` | RN native köprü (snapshot'ı App Group'a yazar) |

### Kurulum adımları (Mac'te)

1. **Projeyi prebuild et:** `npx expo run:ios` (ya da EAS build).
2. **Widget extension ekle:** Xcode → File → New → Target → **Widget Extension** (ad: `HabitTrackerWidgets`).
3. **App Groups tanımla:** Her iki hedefe de (ana app + widget extension) Signing & Capabilities → **+ App Groups** → `group.com.p4sh4.HabitTracker`.
4. **Swift dosyalarını ekle:** `ios-widgets/` içindeki 3 dosyayı uygun hedeflere ekle:
   - `WidgetShared.swift` → her iki hedef
   - `HabitTrackerWidgets.swift` → widget extension
   - `HabitTrackerWidgetBridge.swift` → ana uygulama hedefi
5. **Ana uygulama snapshot yazar:** `src/services/widgetService.js` içindeki `refreshiOSWidget(data, today)` çağrısı köprüyü kullanır (kullanmıyorsan native modülü doğrudan çağır: `NativeModules.HabitTrackerWidgetBridge.saveSnapshot(JSON.stringify(snapshot))`).
6. **Widget'ı yenile:** Ana uygulamada veri değişince `WidgetCenter.shared.reloadAllTimelines()` çağır (örnek: `HabitTrackerWidgets` dosyasında `widgetURL` ile derin bağlantı).

### Derin bağlantılar (iOS)

- `myapp://pomodoro/start` → pomodoro'yu anında başlatır
- `myapp://duel/create` → Sosyal sekmesini açar (düello kurma)
- `myapp://quests` → Günün Görevleri

`app.json` içinde `"scheme": "myapp"` zaten tanımlı (iOS tarafında `CFBundleURLSchemes` prebuild'de otomatik oluşur).

## 🔗 Deep Link akışı (her iki platform)

```
Widget tıklaması
  → myapp://pomodoro/start | myapp://duel/create | TASK_DONE:<id>
  → App.js (useDeepLink / widgetTaskHandler)
  → Navigation: Home + startPomodoro() | Social | quest claim
```

## 🗃️ Veri Paylaşım Katmanı

| Platform | Depo | Anahtar |
|---|---|---|
| Android | AsyncStorage (JS) | `habittracker:widgetSnapshot`, `habittracker:pendingWidgetTasks` |
| iOS | UserDefaults (App Group) | `habittracker:widgetSnapshot`, `habittracker:pendingWidgetTasks` |

Şema: `src/widgets/types.ts` (StreakStatus, TaskItem, DuelState, WidgetSnapshot).
