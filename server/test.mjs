// Sunucu uçtan uca testleri — başlatılmış bir sunucuya karşı çalışır.
// Kullanım: BASE=http://localhost:3100 node test.mjs
const BASE = process.env.BASE || 'http://localhost:3100';

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) pass++;
  else { fail++; console.log('FAIL:', name); }
}
async function api(path, { method = 'GET', token, body, q } = {}) {
  const url = BASE + path + (q ? '?' + new URLSearchParams(q) : '');
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-device-token': token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

const tokens = {};
async function register(name) {
  const r = await api('/api/profiles/register', { method: 'POST', body: { name } });
  ok(r.status === 200 && r.data?.ok, `kayıt: ${name} (${r.status})`);
  tokens[name] = r.data?.token;
  return r.data;
}

// 1) Sağlık
const health = await api('/api/health');
ok(health.status === 200 && health.data.ok, 'health yanıtı');

// 2) Kayıtlar + duplicate
await register('Ahmet');
await register('Zeynep');
await register('Mert');
await register('Deniz');
await register('Ece');
const dup = await api('/api/profiles/register', { method: 'POST', body: { name: 'Ahmet' } });
ok(dup.status === 409, 'aynı isim ikinci kez kaydedilemez (409)');
const short = await api('/api/profiles/register', { method: 'POST', body: { name: 'A' } });
ok(short.status === 400, '1 karakterlik isim reddedilir');

// 3) Profil güncelleme
const upd = await api('/api/profiles/update', {
  method: 'POST',
  token: tokens.Ahmet,
  body: { xp: 500, level: 3, streak: 2, emoji: '😎', avatarId: 'av_cat', gold: 100 },
});
ok(upd.status === 200 && upd.data?.profile?.xp === 500 && upd.data?.profile?.avatarId === 'av_cat', 'profil güncellenir');
const badToken = await api('/api/profiles/update', { method: 'POST', token: 'yok', body: { xp: 1 } });
ok(badToken.status === 401, 'geçersiz token reddedilir');

await api('/api/profiles/update', { method: 'POST', token: tokens.Zeynep, body: { xp: 300, level: 2 } });
await api('/api/profiles/update', { method: 'POST', token: tokens.Mert, body: { xp: 900, level: 4, streak: 5 } });

// 4) Liderlik sıralaması
const lb = await api('/api/leaderboard?limit=50');
const order = lb.data?.players?.map((p) => p.name) || [];
ok(order[0] === 'Mert' && order[1] === 'Ahmet' && order[2] === 'Zeynep', `liderlik XP sıralı (${order.slice(0, 3).join(',')})`);

// 5) Arama
const s1 = await api('/api/profiles/search?q=Ah');
ok(s1.data?.results?.some((p) => p.name === 'Ahmet'), 'önek araması Ahmet bulur');
const s2 = await api('/api/profiles/search?q=Zeynep');
ok(s2.data?.results?.length === 1 && s2.data?.results?.[0]?.name === 'Zeynep', 'tam isim araması tekil sonuç');

// 6) İstek akışı: Ahmet → Zeynep
const req1 = await api('/api/friends/request', { method: 'POST', token: tokens.Ahmet, body: { name: 'Zeynep' } });
ok(req1.data?.state === 'pending', 'istek gönderilir (pending)');
const reqDup = await api('/api/friends/request', { method: 'POST', token: tokens.Ahmet, body: { name: 'Zeynep' } });
ok(reqDup.data?.state === 'already_pending', 'çift istek engellenir');
const reqSelf = await api('/api/friends/request', { method: 'POST', token: tokens.Ahmet, body: { name: 'Ahmet' } });
ok(reqSelf.status === 400, 'kendine istek engellenir');
const reqGhost = await api('/api/friends/request', { method: 'POST', token: tokens.Ahmet, body: { name: 'YokBiri' } });
ok(reqGhost.status === 404, 'olmayan kullanıcıya istek 404');

// 7) Zeynep gelen istekleri görür
const inboxB = await api('/api/friends/requests', { token: tokens.Zeynep });
ok(inboxB.data?.requests?.length === 1 && inboxB.data?.requests?.[0]?.from?.name === 'Ahmet' && inboxB.data?.requests?.[0]?.from?.xp === 500, 'gelen istek profille birlikte');

// 8) Onayla → iki yönlü arkadaşlık
const accept = await api('/api/friends/accept', { method: 'POST', token: tokens.Zeynep, body: { requestId: inboxB.data?.requests?.[0]?.id } });
ok(accept.status === 200 && accept.data?.friend?.name === 'Ahmet', 'onay sonrası arkadaş profili döner');
const frA = await api('/api/friends', { token: tokens.Ahmet });
const frB = await api('/api/friends', { token: tokens.Zeynep });
ok(frA.data?.friends?.some((f) => f.name === 'Zeynep'), 'Ahmet listesinde Zeynep');
ok(frB.data?.friends?.some((f) => f.name === 'Ahmet'), 'Zeynep listesinde Ahmet');
const reqAfter = await api('/api/friends/request', { method: 'POST', token: tokens.Zeynep, body: { name: 'Ahmet' } });
ok(reqAfter.data?.state === 'already_friends', 'arkadaşken istek gönderilemez');

// 9) Reddetme akışı: Mert → Ahmet; Ahmet reddeder
await api('/api/friends/request', { method: 'POST', token: tokens.Mert, body: { name: 'Ahmet' } });
const inboxA = await api('/api/friends/requests', { token: tokens.Ahmet });
ok(inboxA.data?.requests?.length === 1 && inboxA.data?.requests?.[0]?.from?.name === 'Mert', 'Ahmet gelen isteği görür');
const decline = await api('/api/friends/decline', { method: 'POST', token: tokens.Ahmet, body: { requestId: inboxA.data?.requests?.[0]?.id } });
ok(decline.status === 200, 'reddetme başarılı');
const inboxA2 = await api('/api/friends/requests', { token: tokens.Ahmet });
ok(inboxA2.data?.requests?.length === 0, 'reddedilen istek listeden düşer');

// 10) İsim değişince bekleyen istek alıcı ismi güncellenir
await api('/api/friends/request', { method: 'POST', token: tokens.Ece, body: { name: 'Deniz' } });
const ren = await api('/api/profiles/update', { method: 'POST', token: tokens.Deniz, body: { name: 'DenizY' } });
ok(ren.status === 200 && ren.data?.profile?.name === 'DenizY', 'isim değişir');
const inboxDeniz = await api('/api/friends/requests', { token: tokens.Deniz });
ok(inboxDeniz.data?.requests?.length === 1 && inboxDeniz.data?.requests?.[0]?.from?.name === 'Ece', 'isim değişince istek kaybolmaz');
const renClash = await api('/api/profiles/update', { method: 'POST', token: tokens.Deniz, body: { name: 'Zeynep' } });
ok(renClash.status === 409, 'kullanımda isme geçilemez');

// 11) Arkadaşlığı kaldırma
const rem = await api('/api/friends/remove?name=Zeynep', { method: 'DELETE', token: tokens.Ahmet });
ok(rem.status === 200, 'arkadaşlık kaldırılır');
const frA2 = await api('/api/friends', { token: tokens.Ahmet });
const frB2 = await api('/api/friends', { token: tokens.Zeynep });
ok(frA2.data?.friends?.length === 0 && frB2.data?.friends?.length === 0, 'iki taraftan da düşer');

console.log(`\nSunucu testi: ${pass} geçti, ${fail} hata`);
process.exit(fail > 0 ? 1 : 0);
