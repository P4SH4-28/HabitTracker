// ============================================================
// Görev (quest) sistemi — statik görev kataloğu
// 60 görev, 4 zorluk kutusunda toplanır (Basit/Orta/Zor/Çok Zor).
// - Zorluk başına BEKLEME SÜRESİ vardır: görev ödülü alındıktan sonra
//   yeniden yapılabilmesi için sürenin dolması gerekir (kutu başlığında yazar).
// - Ödül zorluğa göre değişir: XP + altın (otomatik görevler XP verir;
//   manuel "Yaptım" görevleri LİDERLİĞİ korumak için yalnızca altın verir).
// - Otomatik görevler günlük sayaçlarla ölçülür (alışkanlık tamamlama,
//   odak seansı, kazanılan altın). "questClaims" içindeki anlık görüntü
//   (value) ile ilerleme her alımda sıfırlanır; kaldığın yerden sürer.
// ============================================================

// Zorluk seviyeleri: bekleme süresi, XP ve altın ödülleri burada tanımlı.
export const QUEST_DIFFICULTIES = {
  easy: {
    label: 'Basit',
    emoji: '🟢',
    cooldownMs: 30 * 60 * 1000, // 30 dakika
    cooldownText: 'her 30 dakikada bir',
    xp: 10,
    gold: 5,
    colorKey: 'accent',
  },
  medium: {
    label: 'Orta',
    emoji: '🟡',
    cooldownMs: 45 * 60 * 1000, // 45 dakika
    cooldownText: 'her 45 dakikada bir',
    xp: 25,
    gold: 10,
    colorKey: 'xp',
  },
  hard: {
    label: 'Zor',
    emoji: '🟠',
    cooldownMs: 60 * 60 * 1000, // 1 saat
    cooldownText: 'her 1 saatte bir',
    xp: 50,
    gold: 20,
    colorKey: 'danger',
  },
  veryHard: {
    label: 'Çok Zor',
    emoji: '🔴',
    cooldownMs: 120 * 60 * 1000, // 2 saat
    cooldownText: 'her 2 saatte bir',
    xp: 100,
    gold: 40,
    colorKey: 'primary',
  },
};

// Kategoriler (görevlerin üzerindeki etiket).
export const QUEST_CATEGORIES = {
  temel: { name: 'Temel', emoji: '🎯' },
  spor: { name: 'Spor', emoji: '🏃' },
  saglik: { name: 'Sağlık', emoji: '💪' },
  beslenme: { name: 'Beslenme', emoji: '🥗' },
  egitim: { name: 'Eğitim', emoji: '📚' },
  zihin: { name: 'Zihin', emoji: '🧠' },
  uretkenlik: { name: 'Üretkenlik', emoji: '💼' },
  ev: { name: 'Ev & Düzen', emoji: '🏠' },
  sosyal: { name: 'Sosyal', emoji: '👥' },
  dijital: { name: 'Dijital', emoji: '📱' },
  para: { name: 'Para', emoji: '💰' },
};

// Otomatik görevlerin ölçüleceği günlük sayaç adı → stats.day anahtarı.
const METRIC = {
  completions: 'completions',
  pomodoro: 'pomodoro',
  gold: 'goldEarned',
};

// Görev kataloğu (60 görev).
// type: 'auto' → uygulama sayaçlarıyla ölçülür, XP + altın verir.
//       'manual' → "Yaptım" butonuyla onaylanır, yalnızca altın verir.
export const QUEST_CATALOG = [
  // ---------------- BASİT (22) ----------------
  { id: 'q_auto_completions_3', type: 'auto', metric: METRIC.completions, target: 3, difficulty: 'easy', category: 'temel', emoji: '✅', title: '3 alışkanlık tamamla', desc: 'Bugün 3 alışkanlığını tamamla' },
  { id: 'q_auto_pomodoro_1', type: 'auto', metric: METRIC.pomodoro, target: 1, difficulty: 'easy', category: 'temel', emoji: '🍅', title: '1 odak seansı bitir', desc: '25 dakikalık bir pomodoro tamamla' },
  { id: 'q_auto_gold_10', type: 'auto', metric: METRIC.gold, target: 10, difficulty: 'easy', category: 'temel', emoji: '🪙', title: '10 altın kazan', desc: 'Alışkanlık ve pomodoro ödüllerinden 10 altın topla' },
  { id: 'q_walk_10', type: 'manual', difficulty: 'easy', category: 'spor', emoji: '🚶', title: '10 dakika yürüyüş', desc: 'Kısa bir yürüyüşle kanı dolaştır' },
  { id: 'q_stretch_2', type: 'manual', difficulty: 'easy', category: 'spor', emoji: '🤸', title: '2 dakika esneme', desc: 'Basit germe hareketleriyle gevşe' },
  { id: 'q_water_1', type: 'manual', difficulty: 'easy', category: 'saglik', emoji: '💧', title: '1 bardak su iç', desc: 'Su hedefine küçük bir adım at' },
  { id: 'q_sleep_8', type: 'manual', difficulty: 'easy', category: 'saglik', emoji: '😴', title: '8 saat uyku', desc: 'Erken yat, uykunu tam al' },
  { id: 'q_fruit_1', type: 'manual', difficulty: 'easy', category: 'beslenme', emoji: '🍎', title: '1 porsiyon meyve', desc: 'Taze bir meyve tüket' },
  { id: 'q_veg_1', type: 'manual', difficulty: 'easy', category: 'beslenme', emoji: '🥦', title: '1 porsiyon sebze', desc: 'Öğününe sebze ekle' },
  { id: 'q_read_10', type: 'manual', difficulty: 'easy', category: 'egitim', emoji: '📖', title: '10 sayfa kitap oku', desc: 'Kitabından 10 sayfa ilerle' },
  { id: 'q_podcast_20', type: 'manual', difficulty: 'easy', category: 'egitim', emoji: '🎧', title: '20 dakika dinle', desc: 'İlgi alanında bir podcast ya da ders dinle' },
  { id: 'q_breath_5', type: 'manual', difficulty: 'easy', category: 'zihin', emoji: '🌬️', title: '5 dakika nefes egzersizi', desc: 'Sakin nefes al, dikkatini topla' },
  { id: 'q_journal_3', type: 'manual', difficulty: 'easy', category: 'zihin', emoji: '📝', title: 'Günlüğe 3 satır yaz', desc: 'Duygularını not et' },
  { id: 'q_todo_1', type: 'manual', difficulty: 'easy', category: 'uretkenlik', emoji: '📋', title: 'Günün listesini çıkar', desc: 'Bugün yapacaklarını yaz' },
  { id: 'q_inbox_5', type: 'manual', difficulty: 'easy', category: 'uretkenlik', emoji: '✉️', title: 'Gelen kutunu temizle', desc: '5 dakikada gereksiz mailleri sil' },
  { id: 'q_bed_1', type: 'manual', difficulty: 'easy', category: 'ev', emoji: '🛏️', title: 'Yatağını topla', desc: 'Güne düzenli başla' },
  { id: 'q_laundry_1', type: 'manual', difficulty: 'easy', category: 'ev', emoji: '🧺', title: 'Çamaşırı sepete at', desc: 'Odanı dağınıklıktan kurtar' },
  { id: 'q_msg_1', type: 'manual', difficulty: 'easy', category: 'sosyal', emoji: '📩', title: 'Birine mesaj at', desc: 'Bir yakınına selam gönder' },
  { id: 'q_hi_1', type: 'manual', difficulty: 'easy', category: 'sosyal', emoji: '👋', title: 'Birine selam ver', desc: 'Tanıdığın biriyle selamlaş' },
  { id: 'q_airplane_30', type: 'manual', difficulty: 'easy', category: 'dijital', emoji: '📵', title: '30 dk uçak modu', desc: 'Telefonu 30 dakika kapat' },
  { id: 'q_desk_1', type: 'manual', difficulty: 'easy', category: 'dijital', emoji: '🖥️', title: 'Masaüstünü topla', desc: 'Çalışma alanını düzenle' },
  { id: 'q_expense_1', type: 'manual', difficulty: 'easy', category: 'para', emoji: '💰', title: 'Harcamayı not et', desc: 'Bugünkü harcamanı kaydet' },

  // ---------------- ORTA (16) ----------------
  { id: 'q_auto_completions_5', type: 'auto', metric: METRIC.completions, target: 5, difficulty: 'medium', category: 'temel', emoji: '✅', title: '5 alışkanlık tamamla', desc: 'Bugün 5 alışkanlığını tamamla' },
  { id: 'q_auto_pomodoro_2', type: 'auto', metric: METRIC.pomodoro, target: 2, difficulty: 'medium', category: 'temel', emoji: '🍅', title: '2 odak seansı bitir', desc: 'İki pomodoro ile derin çalış' },
  { id: 'q_auto_gold_20', type: 'auto', metric: METRIC.gold, target: 20, difficulty: 'medium', category: 'temel', emoji: '🪙', title: '20 altın kazan', desc: 'Alışkanlık ve pomodoro ödüllerinden 20 altın topla' },
  { id: 'q_walk_30', type: 'manual', difficulty: 'medium', category: 'spor', emoji: '🏃', title: '30 dakika yürüyüş', desc: 'Tempolu bir yürüyüşe çık' },
  { id: 'q_home_workout_15', type: 'manual', difficulty: 'medium', category: 'spor', emoji: '🏋️', title: '15 dk ev antrenmanı', desc: 'Şınav, squat ya da plank yap' },
  { id: 'q_sit_1', type: 'manual', difficulty: 'medium', category: 'saglik', emoji: '🩺', title: '2 saat hareketsiz oturma', desc: 'Her 25 dakikada bir kalk, gerin' },
  { id: 'q_water_1_5', type: 'manual', difficulty: 'medium', category: 'beslenme', emoji: '🥤', title: '1,5 litre su iç', desc: 'Günlük su ihtiyacını tamamla' },
  { id: 'q_cook_1', type: 'manual', difficulty: 'medium', category: 'beslenme', emoji: '🍳', title: 'Evde sağlıklı öğün', desc: 'Abur cubur yerine ev yemeği hazırla' },
  { id: 'q_read_30', type: 'manual', difficulty: 'medium', category: 'egitim', emoji: '📚', title: '30 sayfa kitap oku', desc: 'Kitabından 30 sayfa ilerle' },
  { id: 'q_lesson_15', type: 'manual', difficulty: 'medium', category: 'egitim', emoji: '🎓', title: '1 ders videosu izle', desc: '15 dakika üstü bir eğitim videosu' },
  { id: 'q_meditate_10', type: 'manual', difficulty: 'medium', category: 'zihin', emoji: '🧘', title: '10 dakika meditasyon', desc: 'Sessizlikte nefesine odaklan' },
  { id: 'q_puzzle_1', type: 'manual', difficulty: 'medium', category: 'zihin', emoji: '🧩', title: 'Bir zihin oyunu çöz', desc: 'Bulmaca, sudoku ya da satranç' },
  { id: 'q_deepwork_1', type: 'manual', difficulty: 'medium', category: 'uretkenlik', emoji: '💻', title: 'Tek işe odaklan', desc: 'Kesintisiz 1 pomodoro tek konuda çalış' },
  { id: 'q_plan_tomorrow', type: 'manual', difficulty: 'medium', category: 'uretkenlik', emoji: '🗓️', title: 'Yarının planını yaz', desc: 'Yarınki önceliklerini belirle' },
  { id: 'q_clean_15', type: 'manual', difficulty: 'medium', category: 'ev', emoji: '🧹', title: '15 dk toparlanma', desc: 'Odanın bir bölümünü düzenle' },
  { id: 'q_call_30', type: 'manual', difficulty: 'medium', category: 'sosyal', emoji: '📞', title: '30 dk sesli görüşme', desc: 'Bir dostunla uzun bir sohbet' },

  // ---------------- ZOR (12) ----------------
  { id: 'q_auto_completions_8', type: 'auto', metric: METRIC.completions, target: 8, difficulty: 'hard', category: 'temel', emoji: '✅', title: '8 alışkanlık tamamla', desc: 'Bugün 8 alışkanlığını tamamla' },
  { id: 'q_auto_pomodoro_3', type: 'auto', metric: METRIC.pomodoro, target: 3, difficulty: 'hard', category: 'temel', emoji: '🍅', title: '3 odak seansı bitir', desc: 'Üç pomodoro ile günü güçlendir' },
  { id: 'q_auto_gold_35', type: 'auto', metric: METRIC.gold, target: 35, difficulty: 'hard', category: 'temel', emoji: '🪙', title: '35 altın kazan', desc: 'Gün içinde 35 altın topla' },
  { id: 'q_run_5k', type: 'manual', difficulty: 'hard', category: 'spor', emoji: '🏅', title: '5 km koşu ya da 1 saat spor', desc: 'Kendini zorla, terle' },
  { id: 'q_processed_0', type: 'manual', difficulty: 'hard', category: 'beslenme', emoji: '🥗', title: 'İşlenmiş gıda yok', desc: 'Bugün tamamen doğal beslen' },
  { id: 'q_read_50', type: 'manual', difficulty: 'hard', category: 'egitim', emoji: '📖', title: '50 sayfa kitap oku', desc: 'Kitapta uzun bir oturuşla ilerle' },
  { id: 'q_write_500', type: 'manual', difficulty: 'hard', category: 'egitim', emoji: '✍️', title: '500 kelime yaz', desc: 'Kendi yazını ya da notlarını yaz' },
  { id: 'q_meditate_20', type: 'manual', difficulty: 'hard', category: 'zihin', emoji: '🧘', title: '20 dakika meditasyon', desc: 'Derin bir odak seansı dene' },
  { id: 'q_finish_project', type: 'manual', difficulty: 'hard', category: 'uretkenlik', emoji: '🎯', title: 'Kilit işi bitir', desc: '3 pomodoro ile bir işi sonlandır' },
  { id: 'q_deep_clean', type: 'manual', difficulty: 'hard', category: 'ev', emoji: '🧽', title: '1 odayı derin temizle', desc: 'Bir odayı baştan sona temizle' },
  { id: 'q_meet_1', type: 'manual', difficulty: 'hard', category: 'sosyal', emoji: '🎉', title: 'Arkadaşınla buluş', desc: 'Yüz yüze bir etkinlik planla' },
  { id: 'q_phone_off_2h', type: 'manual', difficulty: 'hard', category: 'dijital', emoji: '📵', title: 'Akşam 2 saat telefonsuz', desc: 'Telefonu kapat, kendine zaman ayır' },

  // ---------------- ÇOK ZOR (10) ----------------
  { id: 'q_auto_completions_10', type: 'auto', metric: METRIC.completions, target: 10, difficulty: 'veryHard', category: 'temel', emoji: '✅', title: '10 alışkanlık tamamla', desc: 'Bugün 10 alışkanlığını tamamla' },
  { id: 'q_auto_pomodoro_4', type: 'auto', metric: METRIC.pomodoro, target: 4, difficulty: 'veryHard', category: 'temel', emoji: '🍅', title: '4 odak seansı bitir', desc: 'Dört pomodoro ile olağanüstü üretken ol' },
  { id: 'q_auto_gold_50', type: 'auto', metric: METRIC.gold, target: 50, difficulty: 'veryHard', category: 'temel', emoji: '🪙', title: '50 altın kazan', desc: 'Gün içinde 50 altın topla' },
  { id: 'q_run_10k', type: 'manual', difficulty: 'veryHard', category: 'spor', emoji: '🏆', title: '10 km koşu', desc: 'Uzun mesafeye hazır mısın?' },
  { id: 'q_training_2h', type: 'manual', difficulty: 'veryHard', category: 'saglik', emoji: '💪', title: '2 saat yoğun antrenman', desc: 'Antrenman + esneme ile tamamlama' },
  { id: 'q_course_1h', type: 'manual', difficulty: 'veryHard', category: 'egitim', emoji: '🎓', title: '1 saat online ders', desc: 'Bir kurs modülünü baştan sona bitir' },
  { id: 'q_detox_1h', type: 'manual', difficulty: 'veryHard', category: 'zihin', emoji: '🧊', title: '1 saat dijital detoks', desc: 'Teknoloji yok, tamamen kendinle kal' },
  { id: 'q_day_project', type: 'manual', difficulty: 'veryHard', category: 'uretkenlik', emoji: '🚀', title: 'Günün projesini bitir', desc: 'Büyük işini bugün tamamla' },
  { id: 'q_house_1', type: 'manual', difficulty: 'veryHard', category: 'ev', emoji: '🏠', title: 'Evi baştan sona topla', desc: 'Tüm ortak alanları düzenle' },
  { id: 'q_quality_time', type: 'manual', difficulty: 'veryHard', category: 'sosyal', emoji: '💍', title: '1 saat kaliteli vakit', desc: 'Birine tam dikkatini ver, iltifat et' },
];

// Zorluk sırası (ekranlarda bu sırayla gösterilir).
export const QUEST_DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'veryHard'];

// Görev id'sine göre görevi bulur (yoksa null).
export function getQuest(id) {
  return QUEST_CATALOG.find((q) => q.id === id) || null;
}

// Otomatik görevin bugünkü ilerlemesi: günlük sayaç - son alım anlık görüntüsü.
// Bekleme süresinden sonra yeniden tamamlanabilir; sayaç ilerledikçe sürer.
export function questProgress(quest, dayStats, claims) {
  if (!quest || quest.type !== 'auto') return 0;
  const snapshot = claims?.[quest.id]?.value ?? 0;
  const current = dayStats?.[quest.metric] ?? 0;
  return Math.max(0, current - snapshot);
}

// Görevin son alım zamanı (0 = hiç alınmamış).
export function questClaimedAt(quest, claims) {
  return claims?.[quest.id]?.ts ?? 0;
}

// Kalan bekleme süresi (ms). 0 = bekleme yok, görev yapılabilir.
export function cooldownLeft(quest, claims, now = Date.now()) {
  const claimedAt = questClaimedAt(quest, claims);
  if (!claimedAt) return 0;
  const diff = QUEST_DIFFICULTIES[quest.difficulty];
  return Math.max(0, claimedAt + diff.cooldownMs - now);
}

// Görev ödülü şu an alınabilir mi? (bekleme doldu + hedef tamamlandı)
export function canClaimQuest(quest, dayStats, claims, now = Date.now()) {
  if (!quest) return false;
  if (cooldownLeft(quest, claims, now) > 0) return false;
  if (quest.type === 'manual') return true;
  return questProgress(quest, dayStats, claims) >= quest.target;
}

// Günlük "günlük sayaçları" güncelleme yardımcısı (saf fonksiyon).
// stats.day = { key, completions, pomodoro, goldEarned, xpEarned, bankReleased } —
// gün değişince sayaçlar sıfırlanır (yeni güne başlar). delta ile
// artır/azalt. xpEarned: günlük XP kazanç tavanının takibi için;
// goldEarned: hem görev metriği hem altın tavanı sayacıdır.
// bankReleased: XP kumbarasından o gün boşaltılan miktar (günde 500 sınırlı).
export function bumpDay(stats, today, delta) {
  const base =
    stats.day && stats.day.key === today
      ? stats.day
      : { key: today, completions: 0, pomodoro: 0, goldEarned: 0, xpEarned: 0, bankReleased: 0 };
  return {
    ...stats,
    day: {
      key: today,
      completions: Math.max(0, base.completions + (delta.completions || 0)),
      pomodoro: Math.max(0, base.pomodoro + (delta.pomodoro || 0)),
      goldEarned: Math.max(0, base.goldEarned + (delta.goldEarned || 0)),
      xpEarned: Math.max(0, base.xpEarned + (delta.xpEarned || 0)),
      bankReleased: Math.max(0, base.bankReleased + (delta.bankReleased || 0)),
    },
  };
}
