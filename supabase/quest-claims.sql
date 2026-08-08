-- ============================================================
-- quest_claims tablosu — sync-quest Edge Function için
-- Görev ödül alımlarını SUNUCU tarafında saklar: bekleme süresi ve
-- günlük ödül limiti sunucu saatine göre doğrulanır (cihaz saati
-- oynatılamaz). İstemciler doğrudan yazamaz; yalnızca servis rolü
-- (Edge Function) erişir.
--
-- Kurulum: Supabase Dashboard → SQL Editor → bu dosyayı yapıştır → Run
-- ============================================================

create table if not exists public.quest_claims (
  username text not null,
  quest_id text not null,
  claimed_at timestamptz not null default now(),
  day text not null,
  primary key (username, quest_id)
);

-- Günlük ödül sayımı için indeks (username, day).
create index if not exists quest_claims_username_day_idx
  on public.quest_claims (username, day);

-- Bekleme süresi sorgusu için indeks (quest_id zaten PK'da).
create index if not exists quest_claims_day_idx
  on public.quest_claims (day);

alter table public.quest_claims enable row level security;

-- İstemcilere tamamen kapalı: yalnızca servis rolü (Edge Function) erişir.
drop policy if exists "no public access" on public.quest_claims;
create policy "no public access" on public.quest_claims
  for all
  using (false)
  with check (false);
