// ============================================================
// HabitTrackerWidgets.swift — iOS WidgetKit widget seti (4 widget)
// Android widget'larıyla aynı tasarım ve aynı veri alanları.
// Derin bağlantılar (tıklama): myapp://pomodoro/start, myapp://duel/create
// ============================================================
import WidgetKit
import SwiftUI

// ---------------- Ortak renk paleti ----------------

enum W {
    static let bg = Color(red: 0.05, green: 0.07, blue: 0.20)   // gece laciverti
    static let surface = Color(red: 0.09, green: 0.12, blue: 0.29)
    static let text = Color(red: 0.95, green: 0.96, blue: 1.0)
    static let muted = Color(red: 0.60, green: 0.63, blue: 0.79)
    static let gold = Color(red: 1.0, green: 0.83, blue: 0.30)
    static let fire = Color(red: 1.0, green: 0.42, blue: 0.29)
    static let green = Color(red: 0.21, green: 0.82, blue: 0.50)
    static let accent = Color(red: 0.49, green: 0.36, blue: 1.0)
}

// ---------------- 1) Seri Tracker (2x2) ----------------

struct StreakWidgetView: View {
    var entry: SnapshotEntry
    var body: some View {
        let s = entry.snapshot.streak
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Seri").font(.system(size: 13, weight: .bold)).foregroundColor(W.text)
                Spacer()
                Text(entry.snapshot.frozen ? "❄️" : "🔥")
            }
            Spacer()
            Text("\(s.streak)")
                .font(.system(size: 40, weight: .heavy))
                .foregroundColor(s.allDone ? W.green : W.fire)
            Text(s.allDone ? "tebrikler 🎉" : "hedeflerin \(max(0, s.totalToday - s.doneToday))")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(s.allDone ? W.green : W.muted)
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 22).fill(W.bg))
        .widgetURL(URL(string: "myapp://habit"))
    }
}

// ---------------- 2) Hızlı Başlangıç Pomodoro (2x2) ----------------

struct PomodoroWidgetView: View {
    var entry: SnapshotEntry
    var body: some View {
        VStack(spacing: 8) {
            Text("Pomodoro Başlat")
                .font(.system(size: 13, weight: .heavy))
                .foregroundColor(Color(red: 0.10, green: 0.08, blue: 0.19))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(RoundedRectangle(cornerRadius: 10).fill(W.gold))
            ZStack {
                Circle()
                    .fill(entry.snapshot.pomodoroRunning ? W.gold.opacity(0.25) : W.gold)
                    .frame(width: 62, height: 62)
                Image(systemName: "play.fill")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(entry.snapshot.pomodoroRunning ? W.gold : Color(red: 0.10, green: 0.08, blue: 0.19))
                    .offset(x: 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 22).fill(Color(red: 0.08, green: 0.06, blue: 0.20)))
        .widgetURL(URL(string: "myapp://pomodoro/start"))
    }
}

// ---------------- 3) Hızlı Görev Tamamlama (4x2) ----------------

struct QuickTaskWidgetView: View {
    var entry: SnapshotEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Günün Görevleri").font(.system(size: 13, weight: .bold)).foregroundColor(W.text)
                Spacer()
                Text("\(entry.snapshot.tasks.filter { $0.done }.count)/\(entry.snapshot.tasks.count)")
                    .font(.system(size: 11)).foregroundColor(W.muted)
            }
            if entry.snapshot.tasks.isEmpty {
                Text("Bugün için görev yok").font(.system(size: 12)).foregroundColor(W.muted)
            } else {
                ForEach(Array(entry.snapshot.tasks.prefix(4))) { t in
                    HStack(spacing: 8) {
                        Text("\(t.emoji) \(t.title)")
                            .font(.system(size: 12))
                            .foregroundColor(t.done ? W.muted : W.text)
                            .strikethrough(t.done)
                        Spacer()
                        Image(systemName: t.done ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 17))
                            .foregroundColor(t.done ? W.green : W.accent)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(RoundedRectangle(cornerRadius: 10).fill(W.surface))
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 18).fill(W.bg))
        .widgetURL(URL(string: "myapp://quests"))
    }
}

// ---------------- 4) Hızlı Düello Ayarlama (2x2) ----------------

struct DuelWidgetView: View {
    var entry: SnapshotEntry
    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 4) {
                Text("Düello Ayarla").font(.system(size: 13, weight: .bold)).foregroundColor(W.text)
                Text("🔥")
            }
            ZStack {
                Circle()
                    .fill(Color(red: 0.73, green: 0.75, blue: 0.83))
                    .frame(width: 58, height: 58)
                Image(systemName: "play.fill")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(Color(red: 0.09, green: 0.09, blue: 0.11))
                    .offset(x: 2)
            }
            Text(entry.snapshot.duel.active
                 ? "vs \(entry.snapshot.duel.opponent ?? "?")"
                 : "rakip seç, savaş başlasın")
                .font(.system(size: 9))
                .foregroundColor(entry.snapshot.duel.active ? W.fire : W.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 22).fill(Color(red: 0.09, green: 0.09, blue: 0.11)))
        .widgetURL(URL(string: "myapp://duel/create"))
    }
}

// ---------------- Timeline / giriş ----------------

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct SnapshotProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: WidgetStore.loadSnapshot())
    }
    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: WidgetStore.loadSnapshot()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let entry = SnapshotEntry(date: Date(), snapshot: WidgetStore.loadSnapshot())
        // 30 dk'da bir yenile; uygulama açıldığında WidgetCenter reload çağrılır.
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(1800))))
    }
}

// ---------------- Widget tanımları ----------------

@main
struct HabitTrackerWidgetsBundle: WidgetBundle {
    var body: some Widget {
        StreakWidget()
        PomodoroWidget()
        QuickTaskWidget()
        DuelWidget()
    }
}

struct StreakWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "StreakWidget", provider: SnapshotProvider()) { entry in
            StreakWidgetView(entry: entry)
        }
        .configurationDisplayName("Seri Takip")
        .description("Seri sayın ve bugünün hedefleri")
        .supportedFamilies([.systemSmall])
    }
}

struct PomodoroWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PomodoroWidget", provider: SnapshotProvider()) { entry in
            PomodoroWidgetView(entry: entry)
        }
        .configurationDisplayName("Pomodoro Başlat")
        .description("Tek dokunuşla odak seansı başlat")
        .supportedFamilies([.systemSmall])
    }
}

struct QuickTaskWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "QuickTaskWidget", provider: SnapshotProvider()) { entry in
            QuickTaskWidgetView(entry: entry)
        }
        .configurationDisplayName("Hızlı Görevler")
        .description("Günün görevlerini widget'tan tamamla")
        .supportedFamilies([.systemMedium])
    }
}

struct DuelWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DuelWidget", provider: SnapshotProvider()) { entry in
            DuelWidgetView(entry: entry)
        }
        .configurationDisplayName("Düello Ayarla")
        .description("Arkadaşınla hızlı düello başlat")
        .supportedFamilies([.systemSmall])
    }
}
