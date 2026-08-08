-- ============================================================
-- supabase-duel.sql — Arkadaş Düellosu şeması (7 günlük XP yarışı)
-- duels tablosu: iki arkadaş arasındaki düelloyu tutar.
--   status: pending (davet) → active (kabul) → done (bitti)
--   start_xp_*: düello başlangıcındaki profil XP anlık görüntüsü;
--   kazanan = bitiş anındaki XP - başlangıç XP farkı büyük olan.
-- Ödül: kazanan +100 XP / +50 🪙 — "duel-action" edge function'ı ödülü
-- günlük kazanç tavanına (Katman 1) kıstırarak verir.
--
-- Güvenlik (anti-farm):
-- - Anon/istemci anahtarı düelloda YAZAMAZ (yalnızca okur); tüm işlemler
--   (davet/kabul/bitir) servis rolüyle "duel-action" üzerinden yürür.
-- - Aynı çift arasında yalnızca BİR açık (pending/active) düello olabilir
--   (kısmi benzersiz indeks).
-- - "finish" yalnızca katılımcılara açıktır ve yalnızca bitiş saatinden
--   sonra çalışır; ödül deftere tavanlı yazılır.
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → yapıştır → Run
-- ============================================================

-- ---------- Düello tablosu ----------
CREATE TABLE IF NOT EXISTS public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger TEXT NOT NULL,
  opponent TEXT NOT NULL,
  start_xp_challenger INTEGER NOT NULL DEFAULT 0,
  start_xp_opponent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  winner TEXT,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  CHECK (challenger <> opponent)
);

-- Aynı çift arasında tek açık düello (bitenler dışında).
CREATE UNIQUE INDEX IF NOT EXISTS duels_active_pair_idx
  ON public.duels (challenger, opponent)
  WHERE status <> 'done';

-- ---------- Politika temizliği (isimden bağımsız) ----------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('duels')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

-- Herkes düelloları görebilir (iki taraf da skoru izler); yazım yalnızca
-- servis rolünden (edge function) gelir.
DROP POLICY IF EXISTS "anon_read_duels" ON public.duels;
CREATE POLICY "anon_read_duels" ON public.duels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "auth_read_duels" ON public.duels;
CREATE POLICY "auth_read_duels" ON public.duels
  FOR SELECT USING (true);
