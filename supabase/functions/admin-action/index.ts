// ============================================================
// admin-action — Supabase Edge Function (Habit Tracker Yönetici Paneli)
// Admin hesabından gelen istekleri servis rolüyle işler:
//   search_users — kullanıcı ara (isim benzerliği)
//   get_user     — profil detayı + 7 günlük XP trendi
//   ban / unban  — yasaklama (sync engellenir, liderlikten gizlenir)
//   adjust       — XP/altın cezası veya ödülü (pozitif/negatif)
//   grant/revoke — hediye: tema, avatar, çerçeve ver/geri al
//   unflag       — şüpheli bayrağını kaldır
//   logs         — denetim günlüğü (son 30 işlem)
// Güvenlik: istekte ADMIN_KEY doğrulanır (uygulama içi sabit ya da
// Dashboard → Edge Functions → Settings → Secrets'ta ADMIN_KEY).
// Deploy: Verify JWT KAPALI (sync-profile ile aynı).
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Uygulamadaki src/config/admin.js değeriyle AYNI olmalı.
const ADMIN_KEY = Deno.env.get('ADMIN_KEY') ?? 'ht-admin-v1-8f3kQz2LxP9mW7Nc';

const ITEM_TYPES = new Set(['theme', 'avatar', 'frame']);
const DAYS_7 = 6;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function json(res, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Denetim günlüğüne ekler (asla isteği durdurmaz; hata yutulur).
async function log(actor, action, target, detail) {
  try {
    await supabase.from('admin_logs').insert({
      actor,
      action,
      target: target ?? null,
      detail: detail ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    // günlük yazılamadı — işlem yine de tamamlanır
  }
}

// Son 7 günün XP toplamı (liderlik trendiyle aynı hesap).
async function xp7dFor(username) {
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - DAYS_7);
    const { data } = await supabase
      .from('daily_earnings')
      .select('xp')
      .eq('username', username)
      .gte('day', since.toISOString().slice(0, 10));
    return (data || []).reduce((sum, r) => sum + (r.xp || 0), 0);
  } catch (e) {
    return 0;
  }
}

async function getProfile(username) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  return data || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(req, 405, { error: 'method_not_allowed' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(req, 400, { error: 'bad_json' });
  }

  if (body?.adminKey !== ADMIN_KEY) {
    return json(req, 403, { error: 'forbidden' });
  }

  const actor = typeof body?.actor === 'string' ? body.actor.trim() : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  const target = typeof body?.target === 'string' ? body.target.trim() : '';
  if (!actor) return json(req, 400, { error: 'actor_required' });
  if (actor !== 'P4SH4') return json(req, 403, { error: 'not_admin' });

  switch (action) {
    case 'search_users': {
      const q = typeof body?.q === 'string' ? body.q.trim() : '';
      if (q.length < 1) return json(req, 400, { error: 'query_required' });
      const { data, error } = await supabase
        .from('profiles')
        .select('username, xp, coins, flagged, banned, ban_reason, granted_items')
        .ilike('username', `%${q}%`)
        .order('xp', { ascending: false })
        .limit(25);
      if (error) return json(req, 500, { error: 'lookup_failed' });
      return json(req, 200, { ok: true, users: data || [] });
    }

    case 'get_user': {
      if (!target) return json(req, 400, { error: 'target_required' });
      const prof = await getProfile(target);
      if (!prof) return json(req, 404, { ok: false, error: 'not_found' });
      const xp7d = await xp7dFor(target);
      return json(req, 200, { ok: true, user: { ...prof, xp7d } });
    }

    case 'ban': {
      if (!target) return json(req, 400, { error: 'target_required' });
      if (target === actor) return json(req, 400, { error: 'cannot_ban_self' });
      const prof = await getProfile(target);
      if (!prof) return json(req, 404, { ok: false, error: 'not_found' });
      const reason =
        typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : '';
      const { error } = await supabase
        .from('profiles')
        .update({
          banned: true,
          ban_reason: reason || null,
          flagged: true,
          flagged_reason: 'banned',
        })
        .eq('username', target);
      if (error) return json(req, 500, { error: 'ban_failed' });
      await log(actor, 'ban', target, reason || null);
      return json(req, 200, { ok: true });
    }

    case 'unban': {
      if (!target) return json(req, 400, { error: 'target_required' });
      const { error } = await supabase
        .from('profiles')
        .update({ banned: false, ban_reason: null })
        .eq('username', target);
      if (error) return json(req, 500, { error: 'unban_failed' });
      await log(actor, 'unban', target, null);
      return json(req, 200, { ok: true });
    }

    case 'adjust': {
      if (!target) return json(req, 400, { error: 'target_required' });
      const xp = Number(body?.xp);
      const coins = Number(body?.coins);
      if (!Number.isFinite(xp) || !Number.isFinite(coins)) {
        return json(req, 400, { error: 'invalid_amounts' });
      }
      if (xp === 0 && coins === 0) return json(req, 400, { error: 'empty_adjust' });
      const prof = await getProfile(target);
      if (!prof) return json(req, 404, { ok: false, error: 'not_found' });
      const newXp = Math.max(0, (prof.xp ?? 0) + Math.round(xp));
      const newCoins = Math.max(0, (prof.coins ?? 0) + Math.round(coins));
      const { error } = await supabase
        .from('profiles')
        .update({ xp: newXp, coins: newCoins })
        .eq('username', target);
      if (error) return json(req, 500, { error: 'adjust_failed' });
      await log(actor, 'adjust', target, `xp:${xp} coins:${coins}`);
      return json(req, 200, { ok: true, user: { xp: newXp, coins: newCoins } });
    }

    case 'grant': {
      if (!target) return json(req, 400, { error: 'target_required' });
      const itemType = body?.itemType;
      const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : '';
      if (!ITEM_TYPES.has(itemType) || !itemId) {
        return json(req, 400, { error: 'invalid_item' });
      }
      const prof = await getProfile(target);
      if (!prof) return json(req, 404, { ok: false, error: 'not_found' });
      const list = Array.isArray(prof.granted_items) ? prof.granted_items : [];
      if (!list.some((i) => i.type === itemType && i.id === itemId)) {
        list.push({ type: itemType, id: itemId });
      }
      const { error } = await supabase
        .from('profiles')
        .update({ granted_items: list })
        .eq('username', target);
      if (error) return json(req, 500, { error: 'grant_failed' });
      await log(actor, 'grant', target, `${itemType}:${itemId}`);
      return json(req, 200, { ok: true });
    }

    case 'revoke': {
      if (!target) return json(req, 400, { error: 'target_required' });
      const itemType = body?.itemType;
      const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : '';
      if (!ITEM_TYPES.has(itemType) || !itemId) {
        return json(req, 400, { error: 'invalid_item' });
      }
      const prof = await getProfile(target);
      if (!prof) return json(req, 404, { ok: false, error: 'not_found' });
      const list = (Array.isArray(prof.granted_items) ? prof.granted_items : []).filter(
        (i) => !(i.type === itemType && i.id === itemId)
      );
      const { error } = await supabase
        .from('profiles')
        .update({ granted_items: list })
        .eq('username', target);
      if (error) return json(req, 500, { error: 'revoke_failed' });
      await log(actor, 'revoke', target, `${itemType}:${itemId}`);
      return json(req, 200, { ok: true });
    }

    case 'unflag': {
      if (!target) return json(req, 400, { error: 'target_required' });
      const { error } = await supabase
        .from('profiles')
        .update({ flagged: false, flagged_reason: null })
        .eq('username', target);
      if (error) return json(req, 500, { error: 'unflag_failed' });
      await log(actor, 'unflag', target, null);
      return json(req, 200, { ok: true });
    }

    case 'logs': {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('id', { ascending: false })
        .limit(30);
      if (error) return json(req, 500, { error: 'logs_failed' });
      return json(req, 200, { ok: true, logs: data || [] });
    }

    default:
      return json(req, 400, { error: 'unknown_action' });
  }
});
