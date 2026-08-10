// ============================================================
// avatarService.js — Profil fotoğrafı yükleme servisi
// - Fotoğraf galeriden seçilir (expo-image-picker, kare kırpma).
// - Supabase Storage'daki public "avatars" bucket'ına yüklenir.
// - Dönen public URL profileService üzerinden sync-profile ile
//   profiles.photo_url sütununa yazılır.
// ============================================================
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';

const BUCKET = 'avatars';

// Galeriden kare bir profil fotoğrafı seçer.
// Dönüş: { ok: true, uri } | { ok: false, canceled: true } | { ok: false, error }
export async function pickProfilePhoto() {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, error: 'Galeri izni gerekli — Ayarlar\'dan izin ver' };
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return { ok: false, canceled: true };
    return { ok: true, uri: result.assets[0].uri };
  } catch (e) {
    return { ok: false, error: 'Fotoğraf seçilemedi' };
  }
}

// Seçilen fotoğrafı "avatars" bucket'ına yükler ve public URL döner.
export async function uploadProfilePhoto(username, uri) {
  try {
    const extMatch = /\.(jpe?g|png|webp)$/i.exec(uri || '');
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const path = `${username}.${ext}`;
    const body = await fetch(uri).then((r) => r.blob());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, body, { upsert: true, contentType: `image/${ext}` });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, photoUrl: data.publicUrl };
  } catch (e) {
    return { ok: false, error: 'Fotoğraf yüklenemedi (bağlantı?)' };
  }
}

// Mevcut profil fotoğrafını siler (varsa; yoksa sessizce geçer).
export async function removeProfilePhoto(username) {
  try {
    await supabase.storage.from(BUCKET).remove([
      `${username}.jpg`,
      `${username}.jpeg`,
      `${username}.png`,
      `${username}.webp`,
    ]);
  } catch (e) {
    // Silme hatası ölümcül değil — sütun yine de null yapılır.
  }
}
