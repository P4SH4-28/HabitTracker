// ============================================================
// types.ts — Widget veri modelleri (TypeScript tipleri)
// Ana uygulama (widgetService) bu şekillerde snapshot üretir;
// widget bileşenleri (JSX) aynı alanları okur. iOS WidgetKit
// tarafı (UserDefaults App Group) da bu alan adlarını kullanır.
// ============================================================

/** Seri Tracker widget'ı — 2x2 */
export interface StreakStatus {
  /** En uzun aktif seri (gün) */
  streak: number;
  /** Bugün tamamlanan hedef sayısı */
  doneToday: number;
  /** Bugünkü toplam hedef sayısı */
  totalToday: number;
  /** Tüm hedefler bugün tamamlandı mı */
  allDone: boolean;
  /** Widget'ın çizildiği gün anahtarı (YYYY-MM-DD) */
  today: string;
}

/** Hızlı Görev widget'ı — 4x2 (satır başına bir görev) */
export interface TaskItem {
  /** Görev id'si (quest_claims / deep link içinde kullanılır) */
  id: string;
  /** Görev adı (ör. "15 dk pomodoro") */
  title: string;
  /** Görev zorluk emojisi */
  emoji: string;
  /** Bugün tamamlandı mı */
  done: boolean;
}

/** Düello widget'ı — 2x2 */
export interface DuelState {
  /** Aktif düello var mı */
  active: boolean;
  /** Rakip kullanıcı adı (aktifse) */
  opponent?: string | null;
  /** Benim 7 günlük XP'm */
  myXp7d?: number;
  /** Rakibin 7 günlük XP'si */
  oppXp7d?: number;
}

/** Widget'a yazılan tam snapshot (AsyncStorage + App Group). */
export interface WidgetSnapshot {
  today: string;
  streak: StreakStatus;
  tasks: TaskItem[];
  duel: DuelState;
  /** Kullanıcının altın bakiyesi (başlıkta gösterilir) */
  gold: number;
  /** Seri dondurucu bugün aktif mi */
  frozen: boolean;
}
