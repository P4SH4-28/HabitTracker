// ============================================================
// HabitCard — Konsolide kart (tek gerçek: memoizedHabitCard).
// Bu dosya geriye-dönük uyumluluk re-export'udur; eski importlar
// (default kart + confirmDialog) sekmede bozulmadan çalışmaya devam eder.
// ============================================================
import HabitCard, { confirmDialog } from './memoizedHabitCard';

export { confirmDialog };
export default HabitCard;