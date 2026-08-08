# 🚀 Play Store Yayın Rehberi

Habit Tracker'ı Google Play'de yayınlamak için adım adım. Toplam süre: 2-3 saat (onay 1-7 gün sürebilir).

## 0) Ön Koşullar (tek seferlik)

- **Google Play Geliştirici Hesabı**: https://play.google.com/console → 25 $ tek seferlik ücret
- Telefonda test: APK'nın telefonda çalıştığını doğrula (yukarıdaki sabit APK linkiyle)

## 1) GitHub Secrets Ekle (imza için)

Keystore zaten `C:\Users\KPLN\Desktop\HabitTracker-keystore\` klasöründe hazır:

- `habit-tracker-release.keystore` — anahtar dosyası (YEDEKLE!)
- `keystore-secrets.txt` — şifreler + base64 değeri (YEDEKLE!)

GitHub'da: **Settings → Secrets and variables → Actions → New repository secret** — 4 secret ekle:

| Secret adı | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `keystore-secrets.txt` içindeki `KEYSTORE_BASE64=` değeri |
| `ANDROID_KEYSTORE_PASSWORD` | `STORE_PASSWORD=` değeri |
| `ANDROID_KEY_PASSWORD` | `KEY_PASSWORD=` değeri |
| `ANDROID_KEY_ALIAS` | `habit-tracker` |

Sonra **Actions → Android APK Build → Run workflow** ile bir build tetikle. Logda
"Imza yapilandirmasi tamam" yazısını görürsen imza aktif demektir; sonraki build'lerde
üretilen `app-release.aab` gerçek imzalı olur.

> ⚠️ **Keystore'u iki yerde yedekle** (USB + bulut). Kaybedersen veya silersen
> Play'deki uygulamayı bir daha GÜNCELLEYEMEZSİN (aynı imzayı üretmek imkânsız).

## 2) Play Console'da Uygulama Oluştur

1. https://play.google.com/console → **Create app**
2. Uygulama adı: `Habit Tracker`, dil: Türkçe
3. Tür: **Uygulama**, Ücretsiz

## 3) Uygulama İçeriği (Store listing)

- **Kısa açıklama**: "Alışkanlıklarını takip et, XP kazan, seviye atla!"
- **Uzun açıklama**: README'deki özellik tablosunu Türkçe anlat
- **Uygulama ikonu**: `assets/icon.png`
- **Ekran görüntüleri**: 2-8 adet (telefondan ekran görüntüsü al, en az 2 yatay 1080p)
- **Özellik grafiği**: 1024×500 (Canva'dan kolayca yapılır)

## 4) Veri Güvenliği Formu

- Veri paylaşımı: **Paylaşılmıyor**
- Toplanan veriler: kullanıcı adı, oyun ilerlemesi (yalnızca hesap/bulut senkron için)

## 5) Uygulama Erişimi (Test grubu)

- **Kapalı test (beta)** ile başlamak güvenlidir: önce 12 testçi davet et (iç test daha kolay)
- İç test için: **Testing → Internal testing → Create release**
- AAB'yi yükle (son build'in `app-release.aab` dosyası — artifact veya Release linki)
- Sürüm notu: "İlk sürüm" yaz
- Testçi olarak kendi Google hesabını ekle (testçi olmayan Play'de uygulamayı açamaz)

## 6) Yeni Sürüm Yayınlama

Her build `versionCode` olarak GitHub Actions run numarasını alır (otomatik artar).
Yani her yeni AAB'yi doğrudan yükleyebilirsin — sürüm çakışması olmaz.

## 7) Üretime Alma (Production)

1. **App content** bölümündeki tüm adımları tamamla (veri güvenliği, reklam yok, içerik derecelendirme)
2. **Production → Create release** → AAB yükle → **Review app** → onayı bekle (1-7 gün)
3. Onay gelince uygulama Play Store'da herkese açık olur

## Sık Karşılaşılan Red Nedenleri

- Ekran görüntüsü eksik / düşük çözünürlük
- İçerik derecelendirme formu doldurulmamış
- Veri güvenliği formu tutarsız
- AAB imzasız (yukarıdaki secret'lar yanlışsa)
