# 🎯 Habit Tracker

Alışkanlıklarını oyunlaştırarak takip et, XP kazan, seviye atla, görevleri tamamla ve arkadaşlarınla yarış.

![Expo](https://img.shields.io/badge/Expo-57-black) ![React Native](https://img.shields.io/badge/React%20Native-0.86-blue) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Edge%20Functions-green)

## ✨ Özellikler

| | |
|---|---|
| 🏃 **Alışkanlık takibi** | Günlük alışkanlıklar, ikon + renk seçimi, kaçırılan görevlerde altın cezası |
| 🔥 **Seri ödülleri** | 3/7/14/30/60 günlük serilerde bonus XP + altın (eşik başına bir kez) |
| ⚡ **XP & Seviye** | Tamamlanan her görev XP kazandırır; seviye atlayınca kutlama modalı |
| 🪙 **Altın ekonomisi** | Görev 5 🪙, pomodoro 15 🪙; cezalar 15 🪙 |
| 📋 **Görev Panosu** | 60 görevlik katalog, 4 zorluk (30dk – 2sa), otomatik + manuel görevler, bekleme süreleri |
| 🛍️ **Dükkan** | Avatar, avatar çerçevesi ve 13 tema — altınla satın alınır |
| 🏆 **Liderlik** | Seviye 5'te açılır; arkadaşlar + kendin, 7 günlük XP trendi, şüpheli kullanıcı rozeti |
| 👥 **Arkadaşlar** | Kullanıcı adıyla arama, istek gönder/kabul et/reddet |
| ⚔️ **Arkadaş Düellosu** | 7 günlük XP yarışı: davet → kabul → canlı skor çubuğu → kazanan +100 XP / +50 🪙 |
| 🍅 **Pomodoro** | Uygulama kapansa bile süre doğru işler; tamamlama ödülü |
| 🎖️ **Başarımlar** | Kilidi açılan rozetler, bildirim tostları |
| 🔔 **OS Bildirimleri** | Ayarlanan saatte uygulama KAPALIYKEN bile gerçek hatırlatma |
| 🔑 **Şifre kurtarma** | Kayıtta üretilen kurtarma anahtarıyla şifre sıfırlama (cihaz değişse bile) |
| 👋 **İlk açılış rehberi** | Yeni kullanıcıya 3 sayfalık tanıtım |
| 💾 **Yedek & Senkron** | Cihaz içi yedek + Supabase bulut senkronu (cihaz değişince devam et) |

## 🛡️ Anti-Farm Mimarisi (5 Katman)

Oyun ekonomisini korumak için çok katmanlı bir savunma kuruldu:

1. **Katman 1 — İstemci tavanı:** Günlük en fazla 500 XP / 150 🪙 (geri alma tavanı yeniden açar)
2. **Katman 2 — Sunucu saati:** Tüm yanıtlardan sunucu saati okunur; cihaz saati oynatılamaz
3. **Katman 3 — Sunucu doğrulaması:** `sync-profile` edge function'ı yalnızca **delta** kabul eder, `daily_earnings` defteri üzerinden tavanı sunucuda kıstırır; RLS ile doğrudan tabloya yazım engellenir; 10 sn rate limit
4. **Katman 4 — Tespit & görünürlük:** Saat oynatan veya tavan aşan hesap `⚠️ ŞÜPHELİ` rozetiyle liderlikte herkese görünür
5. **Katman 5 — Yönetici Paneli:** `P4SH4` hesabıyla kullanıcı ara, **banla/unbanla**, XP/altın cezası veya ödülü ver, tema/avatar/çerçeve **hediye et**, bayrak kaldır; tüm işlemler denetim günlüğünde

## 🧰 Teknolojiler

- **Expo SDK 57 / React Native 0.86** — mobil uygulama
- **Supabase** — PostgreSQL (RLS + servis rolü) + Edge Functions (Deno)
- **React Navigation** — alt sekmeli navigasyon
- **AsyncStorage** — yerel veri + oturum kalıcılığı
- **GitHub Actions** — otomatik APK derleme

## 🚀 Çalıştırma

```bash
npm install
npx expo start          # QR ile Expo Go'da aç
npx expo start --web    # tarayıcıda test
```

## 📱 APK Derleme

`main` dalına her push, GitHub Actions'ı tetikler:

1. GitHub → **Actions** → **Android APK Build** → bitmesini bekle (~15-20 dk)
2. **HabitTracker-App-Release** artifact'ını indir (`app-release.apk` + `app-release.aab`)
3. `app-release.apk`'yı telefona kur (Bilinmeyen kaynaklara izin ver)

Sabit indirme linkleri (her build'de güncellenir):

- **APK** (telefon kurulumu): `https://github.com/P4SH4-28/HabitTracker/releases/latest/download/HabitTracker.apk`
- **AAB** (Play Store): `https://github.com/P4SH4-28/HabitTracker/releases/latest/download/app-release.aab`
- Depo dosya listesindeki `HabitTracker.apk` da doğrudan indirilebilir.

Manuel derleme için: `.github/workflows/build-apk.yml` → **Run workflow**.

## 🚀 Play Store Yayını

Play Store'a çıkmak için adım adım rehber: **`docs/PLAYSTORE-YAYIN.md`**

Özet: keystore zaten üretildi (`HabitTracker-keystore` klasörü, depo DIŞINDA). CI'ya imza
için 4 GitHub secret'ı eklemen yeterli:

| Secret adı | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | keystore dosyasının base64'ü |
| `ANDROID_KEYSTORE_PASSWORD` | keystore şifresi |
| `ANDROID_KEY_PASSWORD` | anahtar şifresi |
| `ANDROID_KEY_ALIAS` | `habit-tracker` |

> ⚠️ Keystore dosyasını ve şifreleri **asla** depoya atma; kaybedersen Play Store'da
> uygulama güncellenemez. Çoklu kopya al ve güvenli yerde sakla.

## 🗄️ Supabase Kurulumu

1. `supabase-anti-farm.sql` → SQL Editor → **Run** (RLS sıkılaştırma + defter tablosu)
2. `supabase-admin.sql` → SQL Editor → **Run** (yönetici sütunları + denetim günlüğü)
3. `supabase-recovery.sql` → SQL Editor → **Run** (şifre kurtarma sütunu)
4. `supabase-duel.sql` → SQL Editor → **Run** (arkadaş düellosu tablosu)
5. Edge Functions'e şu fonksiyonları **Verify JWT KAPALI** olarak deploy et:
   - `sync-profile` → `supabase/functions/sync-profile/index.ts`
   - `admin-action` → `supabase/functions/admin-action/index.ts`
   - `recovery-action` → `supabase/functions/recovery-action/index.ts` (şifre kurtarma)
   - `duel-action` → `supabase/functions/duel-action/index.ts` (arkadaş düellosu)
6. `src/config/supabase.js` içindeki proje URL + anon anahtarını kendi projenle değiştir

> ⚠️ `src/config/admin.js`'deki `ADMIN_KEY`, `admin-action` fonksiyonundaki anahtarla aynı olmalı.

## 🧪 Testler

Edge function karar mantıkları (tavan, saat koruması, ban, hediye) yerel simülasyonlarla doğrulanır — gerçek bir test veritabanı gerektirmez.

## 🔐 Hesap Sistemi

- Kimlik, **kullanıcı adı + şifre** ile yürütülür (Supabase Auth kullanılmaz); şifre hash'lenir
- **Beni hatırla:** oturum kalıcıdır, uygulama açılınca doğrudan girilir (çıkış yapınca oturum silinir)
- **Kurtarma anahtarı:** kayıtta üretilir ve bir kez gösterilir; hash'i sunucuda saklanır.
  "Şifremi unuttum" akışıyla (isim + kurtarma anahtarı) yeni şifre belirlenebilir — cihaz değişse bile.
- **Yönetici hesabı:** `P4SH4` (şifre sabittir) — Ayarlar'da yönetici bölümü + özel sekme açar

## 📁 Proje Yapısı

```
├── App.js                      # Kök: navigasyon, tema, yasak ekranı
├── src/
│   ├── screens/                # Home, Quest, Shop, Progress, Leaderboard, Friends, Settings, Admin
│   ├── components/             # HabitCard, Sheet, Modals, tostlar…
│   ├── context/                # AuthContext (oturum) + DataContext (veri/senkron)
│   ├── services/               # sync, profile, leaderboard, friend, admin, serverClock
│   ├── data/                   # quests (görev kataloğu), shop (ürünler), achievements
│   ├── logic.js                # XP/seviye matematiği, tavan sabitleri
│   └── theme.js                # 13 tema tanımı
├── supabase/
│   └── functions/              # sync-profile + admin-action + recovery-action + duel-action
├── supabase-anti-farm.sql      # Katman 3-4 şeması
├── supabase-admin.sql          # Katman 5 şeması
├── supabase-recovery.sql       # Şifre kurtarma sütunu
├── supabase-duel.sql           # Arkadaş düellosu tablosu
├── docs/playstore-yayin.md     # Play Store yayın rehberi
└── .github/workflows/build-apk.yml
```
