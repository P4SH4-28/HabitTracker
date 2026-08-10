-- ============================================================
-- Habit Tracker — TEK PARÇA ŞEMA (setup.sql)
-- Eski dağınık yamaların (anti-farm / admin / duel / recovery /
-- social / quest-claims) tamamını TEK betikte toplar + eksik taban
-- tablolarını (profiles, friendships) oluşturur.
--
-- Kurulum: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run
-- Betik idempotent'tir: hatalara takılmadan tekrar çalıştırılabilir.
--
-- Güvenlik modeli:
--   - profiles / daily_earnings / quest_claims / duels / admin_logs:
--     OKUMA herkese açık (liderlik/arkadaş listeleri anon key ile okur),
--     YAZMA yalnızca servis rolü (Edge Function'lar RLS'yi bypass eder).
--   - friendships: yazma işlemleri UYGULAMADAN doğrudan yapılır
--     (kimlik kullanıcı adıyla yürür; Supabase Auth oturumu yoktur),
--     bu yüzden bu tabloda anon INSERT/UPDATE/DELETE izinlidir.
--   - chat_messages / pomodoro_rooms / pomodoro_room_members:
--     okuma herkese açık, yazma yalnızca chat-action (servis rolü).
-- ============================================================

-- ---------- 1) PROFİLLER (taban tablo — eski dosyalarda YOKTU) ----------
-- Kimlik: username (uygulama Supabase Auth kullanmaz). id, arkadaşlık
-- ilişkileri için uuid olarak ayrıca tutulur (gen_random_uuid ile üretilir).
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       TEXT NOT NULL UNIQUE,
  name           TEXT,
  emoji          TEXT DEFAULT '😀',
  streak         INTEGER NOT NULL DEFAULT 0,
  xp             INTEGER NOT NULL DEFAULT 0,
  coins          INTEGER NOT NULL DEFAULT 0,
  xp7d           INTEGER NOT NULL DEFAULT 0,
  avatar_id      TEXT,
  frame_id       TEXT,
  last_active    TIMESTAMPTZ,
  vip_until      TIMESTAMPTZ,
  last_sync_at   TEXT,
  flagged        BOOLEAN NOT NULL DEFAULT false,
  flagged_reason TEXT,
  banned         BOOLEAN NOT NULL DEFAULT false,
  ban_reason     TEXT,
  granted_items  JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_hash  TEXT,
  bio            TEXT NOT NULL DEFAULT '',
  photo_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profil fotoğrafı ve bio (mevcut veritabanlarına eksik sütunlar eklenir).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Kullanıcı profil fotoğrafları (public bucket + anon yazma — uygulama
-- Supabase Auth kullanmaz, kimlik kullanıcı adıyla yürür).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "avatars_read"   ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY IF NOT EXISTS "avatars_insert" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'avatars');
CREATE POLICY IF NOT EXISTS "avatars_update" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
CREATE POLICY IF NOT EXISTS "avatars_delete" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'avatars');

-- ---------- 2) GÜNLÜK KAZANÇ DEFTERİ (sync-profile tavanı) ----------
CREATE TABLE IF NOT EXISTS public.daily_earnings (
  username   TEXT NOT NULL,
  day        TEXT NOT NULL,
  xp         INTEGER NOT NULL DEFAULT 0,
  gold       INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, day)
);

-- ---------- 3) GÖREV ÖDÜL ALIMLARI (sync-quest) ----------
CREATE TABLE IF NOT EXISTS public.quest_claims (
  username   TEXT NOT NULL,
  quest_id   TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  day        TEXT NOT NULL,
  PRIMARY KEY (username, quest_id)
);

-- ---------- 4) YÖNETİCİ DENETİM GÜNLÜĞÜ (admin-action) ----------
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id         BIGSERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);

-- ---------- 5) ARKADAŞLIKLAR (friendService — anon key ile yazar) ----------
-- İki yönlü ilişki: user_id isteği gönderen, friend_id isteği alandır.
-- status: pending (beklemede) → accepted (arkadaş). Reddetme/arkadaşlığı
-- silme = satırı silme. Aynı çift arasında yalnızca BİR aktif ilişki.
CREATE TABLE IF NOT EXISTS public.friendships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  friend_id  UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id <> friend_id)
);

-- Aynı çift arasında çift istek/çift arkadaşlık engellenir (yönden bağımsız).
CREATE UNIQUE INDEX IF NOT EXISTS friendships_active_pair_idx
  ON public.friendships (least(user_id, friend_id), greatest(user_id, friend_id))
  WHERE status IN ('pending', 'accepted');

-- ---------- 6) DÜELLOLAR (duel-action) ----------
CREATE TABLE IF NOT EXISTS public.duels (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger         TEXT NOT NULL,
  opponent           TEXT NOT NULL,
  start_xp_challenger INTEGER NOT NULL DEFAULT 0,
  start_xp_opponent  INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'done')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at            TIMESTAMPTZ NOT NULL,
  winner             TEXT,
  reward_claimed     BOOLEAN NOT NULL DEFAULT false,
  CHECK (challenger <> opponent)
);

CREATE UNIQUE INDEX IF NOT EXISTS duels_active_pair_idx
  ON public.duels (challenger, opponent)
  WHERE status <> 'done';

-- ---------- 7) GENEL SOHBET (chat-action) ----------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT NOT NULL,
  name         TEXT NOT NULL,
  avatar_id    TEXT,
  avatar_photo TEXT,
  message      TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS avatar_photo TEXT;

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx
  ON public.chat_messages (created_at DESC);

-- ---------- 8) CANLI POMODORO ODALARI (chat-action) ----------
CREATE TABLE IF NOT EXISTS public.pomodoro_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  host           TEXT NOT NULL,
  participants   INTEGER NOT NULL DEFAULT 0 CHECK (participants >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pomodoro_room_members (
  room_id   UUID NOT NULL REFERENCES public.pomodoro_rooms (id) ON DELETE CASCADE,
  username  TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, username)
);

-- ---------- 9) İNDEKSLER ----------
CREATE INDEX IF NOT EXISTS quest_claims_username_day_idx
  ON public.quest_claims (username, day);
CREATE INDEX IF NOT EXISTS quest_claims_day_idx
  ON public.quest_claims (day);

-- ---------- 9.5) TAKIMLAR (kulüpler — teamService, anon key ile yazar) ----------
-- Kulüp tabanı + üyeler. Kimlik kullanıcı adıyla yürür; yazma işlemleri
-- (takım kurma/katılma/ayrılma) arkadaşlıklar gibi uygulamadan doğrudan
-- yapılır. Takım lideri ayrılınca takım silinir (üyeler cascade ile gider).
CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 30),
  emoji      TEXT NOT NULL DEFAULT '🏳️',
  leader     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id   UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  username  TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, username)
);

CREATE INDEX IF NOT EXISTS team_members_username_idx ON public.team_members (username);

-- ---------- 10) RLS + POLİTİKALAR ----------
-- Tüm eski/izinli politika adlarını isimden bağımsız temizle (panel yerel
-- dilde adlar üretebildiği için sabit isimli DROP yetersiz kalır).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'daily_earnings', 'quest_claims', 'admin_logs',
        'friendships', 'duels', 'chat_messages', 'pomodoro_rooms',
        'pomodoro_room_members', 'teams', 'team_members'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_earnings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_claims         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members         ENABLE ROW LEVEL SECURITY;

-- Okuma herkese açık (anon key ile liderlik/arkadaş/sohbet çekilir).
CREATE POLICY "read_profiles"           ON public.profiles             FOR SELECT USING (true);
CREATE POLICY "read_daily_earnings"     ON public.daily_earnings       FOR SELECT USING (true);
CREATE POLICY "read_duels"              ON public.duels                FOR SELECT USING (true);
CREATE POLICY "read_chat"               ON public.chat_messages        FOR SELECT USING (true);
CREATE POLICY "read_rooms"              ON public.pomodoro_rooms       FOR SELECT USING (true);
CREATE POLICY "read_room_members"       ON public.pomodoro_room_members FOR SELECT USING (true);
CREATE POLICY "read_friendships"        ON public.friendships          FOR SELECT USING (true);
CREATE POLICY "read_teams"              ON public.teams                FOR SELECT USING (true);
CREATE POLICY "read_team_members"       ON public.team_members         FOR SELECT USING (true);

-- friendships: yazma işlemleri uygulamadan doğrudan yapılır (kimlik
-- kullanıcı adıyla; Supabase Auth yok). Bu tabloda anon yazma izinli.
CREATE POLICY "write_friendships"       ON public.friendships
  FOR ALL USING (true) WITH CHECK (true);

-- teams / team_members: takım kurma, katılma ve ayrılma da uygulamadan
-- doğrudan yapılır — anon yazma izinli (arkadaşlıklarla aynı model).
CREATE POLICY "write_teams"             ON public.teams
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "write_team_members"      ON public.team_members
  FOR ALL USING (true) WITH CHECK (true);

-- quest_claims / admin_logs: istemcilere TAMAMEN kapalı (servis rolü yazar).
CREATE POLICY "no_public_quest_claims"  ON public.quest_claims FOR ALL USING (false) WITH CHECK (false);

-- ---------- 11) REALTIME: sohbet + canlı odalar anında yayınlanır ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pomodoro_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pomodoro_rooms;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pomodoro_room_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pomodoro_room_members;
  END IF;
END $$;

-- ---------- DOĞRULAMA (opsiyonel) ----------
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Beklenen: admin_logs, chat_messages, daily_earnings, duels, friendships,
--           pomodoro_room_members, pomodoro_rooms, profiles, quest_claims,
--           team_members, teams
