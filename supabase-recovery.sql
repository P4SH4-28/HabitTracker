-- ============================================================
-- supabase-recovery.sql — Kurtarma anahtarı desteği (hesap kurtarma)
-- Şifre unutan kullanıcı, kayıtta üretilen kurtarma anahtarıyla
-- şifresini sıfırlayabilir (cihaz kaybolsa / şifre unutulsa bile).
--
-- Güvenlik notu:
-- - recovery_hash yalnızca servis rolüyle YAZILIR ve DOĞRULANIR
--   (edge function "recovery-action"). İstemci anahtarı bu sütunu
--   hiçbir zaman OKUYAMAZ (RLS; liderlik sorguları bu sütunu çekmez).
-- - "set" işlemi yalnızca profilde hiç anahtar yokken serbesttir;
--   mevcut anahtar varsa yalnızca eski anahtarın hash'iyle değiştirilir
--   (başkasının anahtarını üzerine yazma engellenir).
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → yapıştır → Run
-- ============================================================

-- Kurtarma anahtarı hash'i (düz metin ASLA saklanmaz).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS recovery_hash TEXT;

-- Liderlik/arkadaş listeleri bu sütunu hiç çekmediği için güvenlik
-- sağlaması amacıyla seçimden dışlamak isteyen projeler için görünüm:
-- (opsiyonel) CREATE OR REPLACE VIEW public_profile AS
--   SELECT username, xp, coins, banned, flagged FROM profiles;
