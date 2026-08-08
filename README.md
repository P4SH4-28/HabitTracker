# 🎯 Habit Tracker

Alışkanlıklarını oyunlaştırarak takip et, XP kazan, seviye atla, görevleri tamamla ve arkadaşlarınla yarış.

![Expo](https://img.shields.io/badge/Expo-57-black) ![React Native](https://img.shields.io/badge/React%20Native-0.86-blue) ![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Edge%20Functions-green)

## ✨ Özellikler

| | |
|---|---|
| 🏃 **Alışkanlık takibi** | Günlük alışkanlıklar, ikon + renk seçimi, kaçırılan görevlerde altın cezası |
| ⚡ **XP & Seviye** | Tamamlanan her görev XP kazandırır; seviye atlayınca kutlama modalı |
| 🪙 **Altın ekonomisi** | Görev 5 🪙, pomodoro 15 🪙; cezalar 15 🪙 |
| 📋 **Görev Panosu** | 60 görevlik katalog, 4 zorluk (30dk – 2sa), otomatik + manuel görevler, bekleme süreleri |
| 🛍️ **Dükkan** | Avatar, avatar çerçevesi ve 13 tema — altınla satın alınır |
| 🏆 **Liderlik** | Seviye 5'te açılır; arkadaşlar + kendin, 7 günlük XP trendi, şüpheli kullanıcı rozeti |
| 👥 **Arkadaşlar** | Kullanıcı adıyla arama, istek gönder/kabul et/reddet |
| 🍅 **Pomodoro** | Uygulama kapansa bile süre doğru işler; tamamlama ödülü |
| 🎖️ **Başarımlar** | Kilidi açılan rozetler, bildirim tostları |
| 🔔 **Hatırlatma** | Ayarlanan saatte günlük hatırlatma |
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
2. **HabitTracker-App-Release** artifact'ını indir
3. `app-release.apk`'yı telefona kur (Bilinmeyen kaynaklara izin ver)

Manuel derleme için: `.github/workflows/build-apk.yml` → **Run workflow**.

## 🗄️ Supabase Kurulumu

1. `supabase-anti-farm.sql` → SQL Editor → **Run** (RLS sıkılaştırma + defter tablosu)
2. `supabase-admin.sql` → SQL Editor → **Run** (yönetici sütunları + denetim günlüğü)
3. Edge Functions'e şu fonksiyonları **Verify JWT KAPALI** olarak deploy et:
   - `sync-profile` → `supabase/functions/sync-profile/index.ts`
   - `admin-action` → `supabase/functions/admin-action/index.ts`
4. `src/config/supabase.js` içindeki proje URL + anon anahtarını kendi projenle değiştir

> ⚠️ `src/config/admin.js`'deki `ADMIN_KEY`, `admin-action` fonksiyonundaki anahtarla aynı olmalı.

## 🧪 Testler

Edge function karar mantıkları (tavan, saat koruması, ban, hediye) yerel simülasyonlarla doğrulanır — gerçek bir test veritabanı gerektirmez.

## 🔐 Hesap Sistemi

- Kimlik, **kullanıcı adı + şifre** ile yürütülür (Supabase Auth kullanılmaz); şifre hash'lenir
- **Beni hatırla:** oturum kalıcıdır, uygulama açılınca doğrudan girilir (çıkış yapınca oturum silinir)
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
│   └── functions/              # sync-profile + admin-action (Deno)
├── supabase-anti-farm.sql      # Katman 3-4 şeması
├── supabase-admin.sql          # Katman 5 şeması
└── .github/workflows/build-apk.yml
```
