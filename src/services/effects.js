// ============================================================
// effects.js — hafif etkinlik veriyolu (kutlama vs.)
// Bileşenler birbirini tanımadan "celebrate" etkinliği yayınlar;
// Confetti overlay'i (App.js kökünde / modal içinde) bunu dinler.
// Kullanım: celebrate({ source: 'streak', mode: 'mini' })
// Kaynaklar: 'levelup' | 'streak' | 'generic'
// ============================================================

const listeners = new Set();

export function subscribeEffects(cb) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function emitEffect(payload) {
  listeners.forEach((cb) => {
    try {
      cb(payload);
    } catch (e) {
      /* tek dinleyici hatası yayını bozmaz */
    }
  });
}

// Konfeti patlaması yayınlar. payload: { source, mode, origin? }
export function celebrate(payload = {}) {
  emitEffect({ type: 'celebrate', source: 'generic', mode: 'full', ...payload });
}