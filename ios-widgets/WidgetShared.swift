// ============================================================
// WidgetShared.swift — iOS WidgetKit veri paylaşım katmanı
// Ana uygulama ile widget'lar arasında veri alışverişi App Groups
// (UserDefaults suite) üzerinden yapılır. Ana uygulama (widgetService)
// aynı anahtarlarla JSON yazar; bu yapı onu okur.
//
// Kurulum:
// 1. Xcode → Signing & Capabilities → App Groups: group.com.p4sh4.HabitTracker
//    (hem ana hedefe hem WidgetExtension hedefine ekle)
// 2. WidgetExtension'da bu dosyayı ekle
// 3. Ana uygulama JS tarafı myapp:// derin bağlantısını kullanır
// ============================================================
import WidgetKit
import SwiftUI

public struct AppGroup {
    /// Uygulama + widget'ın ortak App Group identifier'ı.
    public static let suiteName = "group.com.p4sh4.HabitTracker"
    /// Anahtar adları widgetService.js ile BİREBİR aynı olmalı.
    public static let snapshotKey = "habittracker:widgetSnapshot"
    public static let pendingTasksKey = "habittracker:pendingWidgetTasks"
}

// ---------------- Veri modelleri (types.ts ile aynı alanlar) ----------------

public struct StreakStatus: Codable {
    public var streak: Int
    public var doneToday: Int
    public var totalToday: Int
    public var allDone: Bool
}

public struct TaskItem: Codable, Identifiable {
    public var id: String
    public var title: String
    public var emoji: String
    public var done: Bool
}

public struct DuelState: Codable {
    public var active: Bool
    public var opponent: String?
}

public struct WidgetSnapshot: Codable {
    public var today: String
    public var streak: StreakStatus
    public var tasks: [TaskItem]
    public var duel: DuelState
    public var gold: Int
    public var frozen: Bool
    public var pomodoroRunning: Bool
}

// ---------------- Okuma / yazma yardımcıları ----------------

public enum WidgetStore {
    public static var defaults: UserDefaults {
        UserDefaults(suiteName: AppGroup.suiteName) ?? .standard
    }

    /// Ana uygulamanın yazdığı snapshot'ı okur (yoksa varsayılan).
    public static func loadSnapshot() -> WidgetSnapshot {
        guard let data = defaults.data(forKey: AppGroup.snapshotKey),
              let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else {
            return WidgetSnapshot(
                today: "",
                streak: StreakStatus(streak: 0, doneToday: 0, totalToday: 0, allDone: false),
                tasks: [],
                duel: DuelState(active: false, opponent: nil),
                gold: 0,
                frozen: false,
                pomodoroRunning: false
            )
        }
        return snap
    }

    /// Görev tamamlama isteğini kuyruğa ekler (uygulama açılınca işlenir).
    public static func enqueueTask(_ id: String) {
        var list = defaults.stringArray(forKey: AppGroup.pendingTasksKey) ?? []
        if !list.contains(id) {
            list.append(id)
            defaults.set(list, forKey: AppGroup.pendingTasksKey)
        }
    }
}
