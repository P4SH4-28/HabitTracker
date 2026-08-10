-- ============================================================
-- social.sql — Sosyal sekme şeması (Genel Sohbet + Canlı Odalar)
-- Bu betiği Supabase Dashboard → SQL Editor'da ÇALIŞTIRIN.
--
-- 1) chat_messages      → genel sohbet mesajları
-- 2) pomodoro_rooms     → canlı odak odaları (liste + katılımcı sayısı)
-- 3) pomodoro_room_members → kim hangi odada (çift sayım koruması)
--
-- Güvenlik: SELECT herkese açık (okuma için anon key yeterli),
-- yazma işlemleri YALNIZCA 'chat-action' Edge Function'ından (servis
-- rolü) yapılır; doğrudan anon INSERT/UPDATE/DELETE reddedilir.
-- Realtime: iki tablo da publication'a eklenir (canlı sohbet/oda için).
-- ============================================================

-- ---------- 1) Genel sohbet mesajları ----------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  name text not null,
  avatar_id text,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat read: everyone"
  on public.chat_messages for select
  using (true);

-- Yazma yalnızca servis rolü (chat-action) → anon için hiçbir yazma izni yok.

-- ---------- 2) Canlı pomodoro odaları ----------
create table if not exists public.pomodoro_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  host text not null,
  participants integer not null default 0 check (participants >= 0),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

alter table public.pomodoro_rooms enable row level security;

create policy "rooms read: everyone"
  on public.pomodoro_rooms for select
  using (true);

-- ---------- 3) Oda üyelikleri (katılımcı sayısını doğru tutar) ----------
create table if not exists public.pomodoro_room_members (
  room_id uuid not null references public.pomodoro_rooms (id) on delete cascade,
  username text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, username)
);

alter table public.pomodoro_room_members enable row level security;

create policy "members read: everyone"
  on public.pomodoro_room_members for select
  using (true);

-- ---------- Realtime: bu tablolardaki değişiklikler anında yayınlanır ----------
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.pomodoro_rooms;
alter publication supabase_realtime add table public.pomodoro_room_members;

-- ---------- Profiller tablosuna VIP sütunu (yoksa ekle) ----------
alter table public.profiles
  add column if not exists vip_until timestamptz;

-- Sohbet mesajlarının hızlı çekilmesi için sıralama indeksi.
create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);
