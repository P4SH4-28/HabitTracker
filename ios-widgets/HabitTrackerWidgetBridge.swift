// ============================================================
// HabitTrackerWidgetBridge.swift — iOS native köprü (opsiyonel)
// Ana uygulama JS tarafındaki widgetService, snapshot'ı App Group
// UserDefaults'a yazabilmek için bu modülü çağırır:
//
//   import HabitTrackerWidgetBridge  // React Native native modülü
//
// Kurulum (Xcode, Windows'ta yapılamaz — Mac gerekir):
// 1. iOS projesine bu dosyayı ekle (HabitTracker hedefi)
// 2. Her iki hedefe (ana app + WidgetExtension) App Group
//    "group.com.p4sh4.HabitTracker" ekle
// 3. JS tarafı: widgetService.refreshiOSWidget(data, today)
//    modülünü çağırır (bkz. README / WIDGETS-IOS.md)
// ============================================================
#if canImport(React)
import React
import Foundation

@objc(HabitTrackerWidgetBridge)
final class HabitTrackerWidgetBridge: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool { true }

    /// JS: HabitTrackerWidgetBridge.saveSnapshot(jsonString, resolver, rejecter)
    @objc func saveSnapshot(_ json: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard let suite = UserDefaults(suiteName: "group.com.p4sh4.HabitTracker") else {
            rejecter("no_suite", "App Group tanımlı değil", nil)
            return
        }
        suite.set(json, forKey: "habittracker:widgetSnapshot")
        resolver(nil)
    }
}
#endif
