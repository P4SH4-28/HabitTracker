// ============================================================
// supabase.js — Supabase bulut istemcisi (yapılandırma)
// - SUPABASE_URL: Supabase proje panelinden (Project Settings →
//   API) alınan proje URL'si. Örnek: https://abcdefghij.supabase.co
// - SUPABASE_ANON_KEY: Aynı paneldeki "anon public" anahtarı.
//   Güvenli taraftır (RLS kuralları veriyi korur), uygulamaya
//   gömülebilir.
// - Oturum verileri AsyncStorage'da saklanır; cihaz kapansa da
//   oturum korunur.
// ============================================================
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { wrapFetch } from '../services/serverClock';

// TODO: Gerçek Supabase proje bilgilerinle değiştir.
export const SUPABASE_URL = 'https://abqvphwuafsnfpgfppme.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3ItQtlREyGcGQV_qHx81kQ_9btWvfSS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Tüm yanıtlardan sunucu saatini okuyan sarmalayıcı (zaman farm'ı koruması).
  global: { fetch: wrapFetch(fetch) },
});
