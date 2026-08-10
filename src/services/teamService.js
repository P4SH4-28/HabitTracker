// ============================================================
// teamService.js — Supabase takım/kulüp servisi
// Kimlik, arkadaşlık sistemiyle aynı modelde kullanıcı adıyla yürür
// (Supabase Auth oturumu gerekmez). Tüm fonksiyonlar try-catch ile
// korunur; hata durumunda { ok: false, error } döner.
// Kurallar: herkes EN FAZLA BİR takımda olabilir; takım lideri
// ayrılınca takım silinir (üyeler cascade ile gider).
// ============================================================
import { supabase } from '../config/supabase';

// Kullanıcının içinde olduğu takımı döndürür (yoksa null).
// { team, role } | { team: null } | { ok:false } — basitlik için:
// dönüş her zaman { ok: true, team, role } (yoksa team: null).
export async function getTeamFor(username) {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id, role, teams (id, name, emoji, leader, created_at)')
      .eq('username', username)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true, team: null, role: null };
    return { ok: true, team: data.teams, role: data.role };
  } catch (e) {
    return { ok: false, error: 'Takım verisi alınamadı (çevrimdışı mısın?)' };
  }
}

// Takımın üyelerini profil bilgileriyle (haftalık XP dahil) döndürür.
// Sıralama: lider → haftalık XP'ye göre yüksekten düşüğe.
export async function getTeamMembers(teamId) {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('username, role, joined_at')
      .eq('team_id', teamId);
    if (error) return { ok: false, error: error.message };
    const members = data || [];
    // Üye profillerini toplu çek (liderlik/badge bilgisi için).
    const usernames = members.map((m) => m.username);
    let profiles = {};
    if (usernames.length > 0) {
      const { data: profs, error: pErr } = await supabase
        .from('profiles')
        .select('username, emoji, xp, coins, xp7d, streak, avatar_id, frame_id, photo_url')
        .in('username', usernames);
      if (!pErr && profs) {
        profiles = Object.fromEntries(profs.map((p) => [p.username, p]));
      }
    }
    const enriched = members
      .map((m) => ({
        username: m.username,
        role: m.role,
        joinedAt: m.joined_at,
        emoji: profiles[m.username]?.emoji || '😀',
        avatarId: profiles[m.username]?.avatar_id || null,
        frameId: profiles[m.username]?.frame_id || null,
        photoUrl: profiles[m.username]?.photo_url || null,
        xp7d: profiles[m.username]?.xp7d || 0,
        xp: profiles[m.username]?.xp || 0,
        streak: profiles[m.username]?.streak || 0,
      }))
      .sort((a, b) => {
        if (a.role === 'leader') return -1;
        if (b.role === 'leader') return 1;
        return b.xp7d - a.xp7d;
      });
    return { ok: true, members: enriched };
  } catch (e) {
    return { ok: false, error: 'Üye listesi alınamadı (çevrimdışı mısın?)' };
  }
}

// Açık takımları üye sayısıyla birlikte döndürür (katılma ekranı için).
export async function getTeams() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, emoji, leader, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return { ok: false, error: error.message };
    const teams = data || [];
    const counts = {};
    if (teams.length > 0) {
      const { data: members, error: mErr } = await supabase
        .from('team_members')
        .select('team_id');
      if (!mErr && members) {
        for (const m of members) counts[m.team_id] = (counts[m.team_id] || 0) + 1;
      }
    }
    return {
      ok: true,
      teams: teams.map((t) => ({ ...t, memberCount: counts[t.id] || 0 })),
    };
  } catch (e) {
    return { ok: false, error: 'Takım listesi alınamadı (çevrimdışı mısın?)' };
  }
}

// Yeni takım kurar: kullanıcı lider olarak takıma yazılır.
export async function createTeam(name, emoji, leader) {
  try {
    const clean = String(name || '').trim();
    if (clean.length < 2 || clean.length > 30) {
      return { ok: false, error: 'Takım adı 2-30 karakter olmalı' };
    }
    // Zaten bir takımda mı? (kurucu da en fazla bir takımda olur)
    const mine = await getTeamFor(leader);
    if (!mine.ok) return { ok: false, error: mine.error };
    if (mine.team) return { ok: false, error: 'Önce mevcut takımından ayrılmalısın' };

    const { data, error } = await supabase
      .from('teams')
      .insert({ name: clean, emoji: emoji || '🏳️', leader })
      .select('id, name, emoji, leader')
      .single();
    if (error) return { ok: false, error: error.message };

    const { error: mErr } = await supabase
      .from('team_members')
      .insert({ team_id: data.id, username: leader, role: 'leader' });
    if (mErr) {
      // Üye kaydı başarısız: yarım kalmış takımı temizle.
      await supabase.from('teams').delete().eq('id', data.id);
      return { ok: false, error: mErr.message };
    }
    return { ok: true, team: data };
  } catch (e) {
    return { ok: false, error: 'Takım kurulamadı (çevrimdışı mısın?)' };
  }
}

// Açık bir takıma katılır (en fazla bir takım kuralı).
export async function joinTeam(teamId, username) {
  try {
    const mine = await getTeamFor(username);
    if (!mine.ok) return { ok: false, error: mine.error };
    if (mine.team) return { ok: false, error: 'Önce mevcut takımından ayrılmalısın' };

    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, username, role: 'member' });
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Bu takıma zaten üyesin' };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Katılınamadı (çevrimdışı mısın?)' };
  }
}

// Takımdan ayrılır. Lider ayrılırsa takım silinir (üyeler cascade).
export async function leaveTeam(teamId, username, role) {
  try {
    if (role === 'leader') {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) return { ok: false, error: error.message };
      return { ok: true, disbanded: true };
    }
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('username', username);
    if (error) return { ok: false, error: error.message };
    return { ok: true, disbanded: false };
  } catch (e) {
    return { ok: false, error: 'Ayrılınamadı (çevrimdışı mısın?)' };
  }
}
