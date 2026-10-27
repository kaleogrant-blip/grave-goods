import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memPrefs, memLS, memICloud } from './helpers.mjs';
const S = load('save-adapter.js');
const snap = (ua, keys) => ({ v: 1, updatedAt: ua, keys });

test('backend selection: Capacitor -> native; else window.claude -> artifact; else local', () => {
  const claude = { use() {} };
  assert.equal(S.selectBackend({ Capacitor: { isNativePlatform: () => true }, claude }), 'native', 'native wins over the artifact db');
  assert.equal(S.selectBackend({ Capacitor: {} , claude: null }), 'native', 'bare Capacitor object counts');
  assert.equal(S.selectBackend({ claude }), 'artifact');
  assert.equal(S.selectBackend({}), 'local');
  assert.equal(S.selectBackend({ claude: {} }), 'local', 'a claude object without use() is not a db');
  assert.equal(S.selectBackend({ Capacitor: { isNativePlatform: () => false }, claude }), 'artifact', 'Capacitor core loaded in a plain browser is not native');
  assert.equal(S.selectBackend({ Capacitor: { isNativePlatform: () => false } }), 'local');
  assert.equal(S.selectBackend(), 'local');
});

test('write then read round-trips through Preferences and iCloud', async () => {
  const prefs = memPrefs(), ic = memICloud(), st = S.createStore(prefs, ic);
  const d = snap(1000, { rw_gold: '12', rw_coll: '["Ankh"]' });
  await st.write(d);
  assert.deepEqual(await st.read(), d);
  assert.ok(prefs.m.has(S.SNAP_KEY)); assert.ok(ic.m.has(S.META_KEY));
  assert.deepEqual(await st.readCloud(), d); assert.deepEqual(await st.readPrefs(), d);
});

test('device-local keys (rw_tel, rw_tel_open, rw_ua) never leave the device; rw_tel_off does sync', async () => {
  const st = S.createStore(memPrefs(), memICloud());
  await st.write(snap(5, { rw_gold: '1', rw_tel: '[{"a":1}]', rw_tel_open: '{}', rw_ua: '5', rw_tel_off: '1' }));
  assert.deepEqual(Object.keys((await st.read()).keys).sort(), ['rw_gold', 'rw_tel_off']);
});

test('big saves are chunked under the per-value limit, and stale chunks are cleaned up', async () => {
  const ic = memICloud(), st = S.createStore(memPrefs(), ic);
  await st.write(snap(1, { rw_big: 'x'.repeat(250000) }));
  const chunks = [...ic.m.keys()].filter(k => /_c\d+$/.test(k)); assert.equal(chunks.length, 3);
  for (const k of chunks) assert.ok(ic.m.get(k).length <= 100000);
  assert.equal((await st.read()).keys.rw_big.length, 250000);
  await st.write(snap(2, { rw_small: 'y' }));
  assert.equal([...ic.m.keys()].filter(k => /_c\d+$/.test(k)).length, 1, 'chunks 1 and 2 removed');
  assert.deepEqual((await st.readCloud()).keys, { rw_small: 'y' });
});

test('a save over the iCloud budget fails with quota_exceeded (the game then keeps progress local) but Preferences still has it', async () => {
  const prefs = memPrefs(), st = S.createStore(prefs, memICloud());
  await assert.rejects(() => st.write(snap(1, { rw_big: 'x'.repeat(S.MAX_BYTES + 10) })), e => e.code === 'quota_exceeded');
  assert.ok(prefs.m.get(S.SNAP_KEY).length > S.MAX_BYTES, 'the local mirror was written first');
});

test('newer copy wins; a tie prefers the local mirror', async () => {
  const prefs = memPrefs(), ic = memICloud(), st = S.createStore(prefs, ic);
  await st.write(snap(100, { rw_gold: 'old' }));
  // another device writes a newer save straight into iCloud
  const other = S.createStore(memPrefs(), ic); await other.write(snap(200, { rw_gold: 'new' }));
  assert.equal((await st.read()).keys.rw_gold, 'new');
  assert.equal(JSON.parse(prefs.m.get(S.SNAP_KEY)).keys.rw_gold, 'new', 'local mirror caught up');
  // local is newer
  await st.write(snap(300, { rw_gold: 'newest' })); assert.equal((await st.read()).keys.rw_gold, 'newest');
  // tie
  const p2 = memPrefs(), i2 = memICloud(); await S.createStore(p2, i2).write(snap(7, { rw_gold: 'a' }));
  p2.m.set(S.SNAP_KEY, JSON.stringify(snap(7, { rw_gold: 'b' }))); assert.equal((await S.createStore(p2, i2).read()).keys.rw_gold, 'b');
});

test('reinstall: Preferences empty, iCloud has the save -> restored and mirrored back', async () => {
  const ic = memICloud(); await S.createStore(memPrefs(), ic).write(snap(50, { rw_gold: '99' }));
  const fresh = memPrefs(), st = S.createStore(fresh, ic);
  assert.equal((await st.read()).keys.rw_gold, '99'); assert.ok(fresh.m.has(S.SNAP_KEY));
});

test('iCloud signed out or missing: Preferences alone carries the save, nothing throws', async () => {
  for (const ic of [memICloud({ available: false }), null, { available: async () => { throw new Error('boom'); } }]) {
    const prefs = memPrefs(), st = S.createStore(prefs, ic);
    await st.write(snap(9, { rw_gold: '3' })); assert.equal((await st.read()).keys.rw_gold, '3');
  }
});

test('a torn iCloud write (meta and chunks disagree, or chunks still syncing) is ignored, not half-loaded', async () => {
  const ic = memICloud(), st = S.createStore(memPrefs(), ic);
  await st.write(snap(1, { rw_big: 'x'.repeat(150000) }));
  const c1 = ic.m.get('gg_save_v1_c1'); ic.m.delete('gg_save_v1_c1'); assert.equal(await st.readCloud(), null, 'missing chunk');
  ic.m.set('gg_save_v1_c1', 'zz'); assert.equal(await st.readCloud(), null, 'wrong length');
  ic.m.set('gg_save_v1_c1', c1); assert.ok(await st.readCloud());
  ic.m.set(S.META_KEY, '{nope'); assert.equal(await st.readCloud(), null);
});

test('erase removes the save from both places', async () => {
  const prefs = memPrefs(), ic = memICloud(), st = S.createStore(prefs, ic);
  await st.write(snap(1, { rw_big: 'x'.repeat(150000) })); await st.erase();
  assert.equal(await st.read(), null); assert.equal(prefs.m.size, 0); assert.equal(ic.m.size, 0);
});

test('invalid snapshots are refused', async () => {
  const st = S.createStore(memPrefs(), memICloud());
  for (const bad of [null, {}, { keys: [] , updatedAt: 1 }, { keys: {}, updatedAt: 'x' }]) await assert.rejects(() => st.write(bad), e => e.code === 'invalid_argument');
});

// ---- migration
test('migration: first native launch with nothing in iCloud imports localStorage', async () => {
  const prefs = memPrefs(), ic = memICloud(), st = S.createStore(prefs, ic);
  const ls = memLS({ rw_gold: '40', rw_coll: '[]', rw_ua: '1234', rw_tel: '[]', other: 'x' });
  assert.equal(await S.migrateIfNeeded(st, ls, () => 1), 'imported');
  const d = await st.readCloud(); assert.equal(d.updatedAt, 1234); assert.deepEqual(Object.keys(d.keys).sort(), ['rw_coll', 'rw_gold']);
  assert.equal((await st.readPrefs()).keys.rw_gold, '40');
});

test('migration: a save with no rw_ua gets one, in both places, so the game sees them as the same save', async () => {
  const st = S.createStore(memPrefs(), memICloud()), ls = memLS({ rw_gold: '1' });
  await S.migrateIfNeeded(st, ls, () => 777);
  assert.equal(ls.getItem('rw_ua'), '777'); assert.equal((await st.read()).updatedAt, 777);
});

test('migration never overwrites a save that already exists (iCloud or Preferences)', async () => {
  const ic = memICloud(); await S.createStore(memPrefs(), ic).write(snap(1, { rw_gold: 'cloud' }));
  const st = S.createStore(memPrefs(), ic);
  assert.equal(await S.migrateIfNeeded(st, memLS({ rw_gold: 'local' }), () => 5), 'has-save'); assert.equal((await st.read()).keys.rw_gold, 'cloud');
  const p = memPrefs(); const st2 = S.createStore(p, memICloud()); await st2.write(snap(1, { rw_gold: 'mirror' }));
  assert.equal(await S.migrateIfNeeded(st2, memLS({ rw_gold: 'local' }), () => 5), 'has-save');
});

test('migration with an empty localStorage does nothing', async () => {
  const st = S.createStore(memPrefs(), memICloud());
  assert.equal(await S.migrateIfNeeded(st, memLS({}), () => 5), 'nothing'); assert.equal(await st.read(), null);
  assert.equal(await S.migrateIfNeeded(st, memLS({ other: '1' }), () => 5), 'nothing');
});

// ---- the window.claude look-alike the game's Store talks to
test('claude shim: user id is stable, db doc get/set/delete behave like the artifact db, unknown capabilities are null', async () => {
  const prefs = memPrefs(), ic = memICloud(), ls = memLS({ rw_gold: '8', rw_ua: '10' });
  const c = S.createClaudeShim(S.createStore(prefs, ic), ls, { prefs, now: () => 99 });
  const user = await c.use('user'), id1 = await user.id(), id2 = await (await c.use('user')).id();
  assert.equal(id1, id2); assert.match(id1, /^[0-9a-f]{16,}/); assert.equal(await prefs.get('gg_install_id'), id1);
  assert.equal(await c.use('downloads'), null); assert.equal(await c.use('camera'), null);
  const ref = (await c.use('db')).doc('data/users/' + id1 + '/profile');
  const first = await ref.get();                       // migration already imported localStorage
  assert.equal(first.exists, true); assert.equal(first.data().keys.rw_gold, '8');
  await ref.set(snap(20, { rw_gold: '9' })); assert.equal((await ref.get()).data().keys.rw_gold, '9');
  await ref.delete(); assert.equal((await ref.get()).exists, false);
  await assert.rejects(() => ref.set({ keys: 'no' }), e => e.code === 'invalid_argument');
});

test('claude shim on a brand-new install with an empty localStorage: get() says it does not exist', async () => {
  const prefs = memPrefs(), c = S.createClaudeShim(S.createStore(prefs, memICloud()), memLS(), { prefs });
  const r = await (await c.use('db')).doc('x').get(); assert.equal(r.exists, false);
});
