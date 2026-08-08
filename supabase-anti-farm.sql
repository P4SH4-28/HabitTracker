-- ============================================================
-- Habit Tracker — Anti-farm şeması (Katman 3 + 4)
-- 1) daily_earnings günlük kazanç defteri tablosu
-- 2) profiles'a bayrak + son senkron sütunları
-- 3) RLS sıkılaştırma: anon artık profiles'ta YAZAMAZ (yalnızca okur).
--    Yazımlar yalnızca sync-profile Edge Function'ından (servis rolü) geçer.
-- Güvenli şekilde tekrar çalıştırılabilir (idempotent).
-- Yer: Supabase Dashboard → SQL Editor
--
-- NOT: Politikalar İSİMDEN BAĞIMSIZ düşürülür (DO bloğu). Supabase paneli
-- tabloları yerel dilde politika adlarıyla oluşturabildiği için ("Profili
-- ekle (anon)" gibi) sabit isimli DROP yetersiz kalır; bu blok tablodaki
-- tüm politika adlarını toplayıp teker teker düşürür.
-- ============================================================

-- ---------- Günlük kazanç defteri ----------
CREATE TABLE IF NOT EXISTS public.daily_earnings (
  username TEXT NOT NULL,
  day TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  gold INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, day)
);

-- ---------- Tüm eski/izinli politikaları düşür (her iki tabloda) ----------
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'daily_earnings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.daily_earnings ENABLE ROW LEVEL SECURITY;

-- ---------- Okuma politikaları (herkese açık, yalnızca SELECT) ----------
-- daily_earnings: liderlikteki 7 günlük XP trendi okur (yalnızca kullanıcı
-- adı + günlük XP toplamı; kimlik bilgisi yoktur). Yazım yalnızca servis
-- rolünden (edge function) gelir.
DROP POLICY IF EXISTS "anon_read_daily_earnings" ON public.daily_earnings;
CREATE POLICY "anon_read_daily_earnings" ON public.daily_earnings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "auth_read_daily_earnings" ON public.daily_earnings;
CREATE POLICY "auth_read_daily_earnings" ON public.daily_earnings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_read_profiles" ON public.profiles;
CREATE POLICY "anon_read_profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "auth_read_profiles" ON public.profiles;
CREATE POLICY "auth_read_profiles" ON public.profiles
  FOR SELECT USING (true);

-- ---------- profiles yeni sütunlar ----------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sync_at TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

-- Güvence: anon yazma yetkisi gerçekten kapandı mı diye hızlı kontrol
-- (aşağıdaki satır hata vermeli — INSERT izni reddedilir):
-- INSERT INTO public.profiles (username, xp, coins) VALUES ('__rlsc_test', 0, 0);
