// ============================================================
// Dükkan verileri: altın kazanma oranları + avatar (profil fotoğrafı) ürünleri
// Avatarlar yalnızca EMOJI tabanlıdır (resim dosyası yüklemek yerine);
// böylece çevrimdışı çalışır, boyut/uyum sorunu yaşanmaz ve her cihazda
// aynı görünür. "price: 0" olanlar başlangıçta ücretsiz olarak verilir.
// ============================================================

// Her tamamlanan alışkanlık ve odak seansı için kazanılan altın.
export const GOLD_RATES = {
  habit: 5, // alışkanlık tamamla
  pomodoro: 15, // odak seansı bitir
};

export const SHOP_ITEMS = [
  // ----- Başlangıç (ücretsiz) -----
  { id: 'av_fox', name: 'Tilki', emoji: '🦊', price: 0 },
  { id: 'av_cat', name: 'Kedi', emoji: '🐱', price: 0 },
  { id: 'av_dog', name: 'Köpek', emoji: '🐶', price: 0 },

  // ----- Dükkan (altınla satın alınır) -----
  { id: 'av_panda', name: 'Panda', emoji: '🐼', price: 50 },
  { id: 'av_owl', name: 'Baykuş', emoji: '🦉', price: 75 },
  { id: 'av_wolf', name: 'Kurt', emoji: '🐺', price: 100 },
  { id: 'av_tiger', name: 'Kaplan', emoji: '🐯', price: 150 },
  { id: 'av_dino', name: 'Dinozor', emoji: '🦖', price: 180 },
  { id: 'av_unicorn', name: 'Tek Boynuzlu At', emoji: '🦄', price: 200 },
  { id: 'av_eagle', name: 'Kartal', emoji: '🦅', price: 220 },
  { id: 'av_astro', name: 'Astronot', emoji: '🧑‍🚀', price: 300 },
  { id: 'av_robot', name: 'Robot', emoji: '🤖', price: 350 },
  { id: 'av_dragon', name: 'Ejderha', emoji: '🐲', price: 400 },
  { id: 'av_king', name: 'Kral', emoji: '👑', price: 500 },
];

// Fiyatı 0 olanlar: yeni kullanıcıya baştan verilir.
export const FREE_AVATARS = SHOP_ITEMS.filter((i) => i.price === 0).map((i) => i.id);

// id'ye göre ürünü bulur (yoksa null).
export function getShopItem(id) {
  return SHOP_ITEMS.find((i) => i.id === id) || null;
}

// id'ye göre emojiyi döndürür (bilinmeyen id'de güvenli bir varsayılan).
export function getAvatarEmoji(id) {
  const item = getShopItem(id);
  return item ? item.emoji : '😀';
}

// ============================================================
// Avatar çerçeveleri — avatarın etrafına sarılan dekoratif emoji halkası.
// "ring": halkada görünecek emoji; fiyat eğrisi avatarlarla aynıdır.
// "price: 0" olanlar başlangıçta ücretsiz olarak verilir.
// ============================================================
export const FRAMES = [
  // ----- Başlangıç (ücretsiz) -----
  { id: 'fr_heart', name: 'Kalp', emoji: '❤️', price: 0 },
  { id: 'fr_star', name: 'Yıldız', emoji: '⭐', price: 0 },
  { id: 'fr_flower', name: 'Çiçek', emoji: '🌸', price: 0 },

  // ----- Dükkan (altınla satın alınır) -----
  { id: 'fr_ghost', name: 'Hayalet', emoji: '👻', price: 50 },
  { id: 'fr_moon', name: 'Ay', emoji: '🌙', price: 75 },
  { id: 'fr_cloud', name: 'Bulut', emoji: '☁️', price: 90 },
  { id: 'fr_flame', name: 'Alev', emoji: '🔥', price: 100 },
  { id: 'fr_water', name: 'Damla', emoji: '💧', price: 110 },
  { id: 'fr_sparkle', name: 'Işıltı', emoji: '✨', price: 120 },
  { id: 'fr_leaf', name: 'Yaprak', emoji: '🍃', price: 130 },
  { id: 'fr_paw', name: 'Pati', emoji: '🐾', price: 140 },
  { id: 'fr_bolt', name: 'Şimşek', emoji: '⚡', price: 150 },
  { id: 'fr_sun', name: 'Güneş', emoji: '☀️', price: 160 },
  { id: 'fr_snow', name: 'Kar Tanesi', emoji: '❄️', price: 170 },
  { id: 'fr_butterfly', name: 'Kelebek', emoji: '🦋', price: 180 },
  { id: 'fr_bee', name: 'Arı', emoji: '🐝', price: 190 },
  { id: 'fr_rainbow', name: 'Gökkuşağı', emoji: '🌈', price: 200 },
  { id: 'fr_crown', name: 'Kraliyet', emoji: '👑', price: 220 },
  { id: 'fr_frog', name: 'Kurbağa', emoji: '🐸', price: 240 },
  { id: 'fr_music', name: 'Müzik', emoji: '🎵', price: 250 },
  { id: 'fr_skull', name: 'Kafatası', emoji: '💀', price: 300 },
  { id: 'fr_octopus', name: 'Ahtapot', emoji: '🐙', price: 320 },
  { id: 'fr_diamond', name: 'Elmas', emoji: '💎', price: 350 },
  { id: 'fr_bubble', name: 'Köpük', emoji: '🫧', price: 400 },
  { id: 'fr_alien', name: 'Uzaylı', emoji: '👽', price: 450 },
  { id: 'fr_robot', name: 'Robot', emoji: '🤖', price: 480 },
  { id: 'fr_ring', name: 'Altın Yüzük', emoji: '💍', price: 500 },
  { id: 'fr_shark', name: 'Köpek Balığı', emoji: '🦈', price: 600 },

  // ----- Özel (nadir) -----
  { id: 'fr_neon', name: 'Neon', emoji: '✨', price: 750 },
  { id: 'fr_dragon', name: 'Ejderha', emoji: '🐉', price: 1000 },

  // ----- Season Pass VIP (Lottie animasyonlu) -----
  // Altınla satılmaz; Season Pass VIP ödülü olarak açılır.
  // "lottie": assets/lottie/ altındaki animasyon dosyası adı.
  // "vip": true → yalnızca VIP kullanıcılar görür/satın alır.
  { id: 'fr_lottie_heart', name: 'Kalp Aurası', emoji: '❤️', price: 0, vip: true, lottie: 'heart', color: '#FF5B7F' },
  { id: 'fr_lottie_flame', name: 'Alev Aurası', emoji: '🔥', price: 0, vip: true, lottie: 'flame', color: '#FF7A3D' },
  { id: 'fr_lottie_glow', name: 'Işıltı Aurası', emoji: '✨', price: 0, vip: true, lottie: 'glow', color: '#FFD166' },
];

// Fiyatı 0 olanlar: yeni kullanıcıya baştan verilir.
export const FREE_FRAMES = FRAMES.filter((f) => f.price === 0).map((f) => f.id);

// id'ye göre çerçeveyi bulur (yoksa null).
export function getFrame(id) {
  return FRAMES.find((f) => f.id === id) || null;
}
