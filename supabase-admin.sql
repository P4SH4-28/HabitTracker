-- ============================================================
-- Habit Tracker — Yönetici Paneli şeması (Katman 5)
-- 1) profiles'a ban + hediye sütunları
-- 2) admin_logs denetim günlüğü (kim ne yaptı)
-- Yazımlar yalnızca admin-action Edge Function'ından (servis rolü)
-- gelir; anon bu tablolara dokunamaz. İdempotent — güvenle tekrar
-- çalıştırılabilir. Yer: Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- profiles: yeni sütunlar ----------
-- banned: kullanıcı yasaklandı mı? (banlı kullanıcı sync yapamaz,
-- liderlikte gizlenir; uygulaması yasak ekranı gösterir)
-- ban_reason: yasak gerekçesi (admin panele yazar)
-- granted_items: adminin HEDİYE ettiği ürünler: [{"type":"theme","id":"ocean"}]
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS granted_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ---------- Denetim günlüğü ----------
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);

-- Günlük yalnızca servis rolüyle yazılır/okunur; anon erişimi yok.
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
