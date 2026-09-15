const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(initial = []) {
  let stored = JSON.stringify(initial);
  let cursor = 0;
  const state = [];
  const health = new Map();
  let allowed = true;
  let failSave = false;
  let saves = 0;
  const modules = {
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in state)) state[i] = initial;
        return [state[i], value => { state[i] = value; }];
      },
      useRef(initial) {
        const i = cursor++;
        if (!(i in state)) state[i] = { current: initial };
        return state[i];
      },
      useCallback: value => value,
    },
    'expo-router': { useFocusEffect() {} },
    'react-native': { Platform: { OS: 'ios' }, AppState: {} },
    '@/hooks/kv-store': { KVStore: {
      getItemSync: () => stored,
      setItemSync: (_, value) => { stored = value; },
    } },
    '@/hooks/use-health-kit': {
      useHealthKit: () => ({ isAvailable: true, enabled: true }),
      askForAuthorization: async () => {}, OWN_BUNDLE_ID: 'around',
    },
    '@/utils/date': { toDateKey: date => date.toISOString().slice(0, 10) },
    '@/utils/progress': { validWeightDate: date => /^\d{4}-\d{2}-\d{2}$/.test(date) },
    '@kingstinct/react-native-healthkit': {
      AuthorizationStatus: { sharingAuthorized: 2 },
      authorizationStatusFor: () => allowed ? 2 : 1,
      async saveQuantitySample(type, unit, kg, startDate, endDate, metadata) {
        saves++;
        if (failSave) throw new Error('Unavailable');
        const id = metadata.HKSyncIdentifier;
        const sample = { uuid: id, quantity: kg, startDate, metadata, sourceRevision: { source: { bundleIdentifier: 'around' } } };
        health.set(id, sample);
        return sample;
      },
      queryQuantitySamples: async () => [...health.values()],
      async deleteObjects(type, filter) {
        health.delete(filter.uuid ?? filter.metadata.value);
      },
    },
  };
  const output = ts.transpileModule(fs.readFileSync('hooks/use-weight-log.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => {
    assert.ok(modules[name], `Unexpected import: ${name}`);
    return modules[name];
  }, Date, Map, JSON, Number });
  return {
    render() { cursor = 0; return exports.useWeightLog(true); },
    stored: () => JSON.parse(stored), health,
    deny: () => { allowed = false; }, allow: () => { allowed = true; },
    fail: value => { failSave = value; }, saves: () => saves,
  };
}

async function settle(h) {
  for (let i = 0; i < 30 && h.render().busy; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.render().busy, false);
}

(async () => {
  const h = harness([{ date: '2026-01-01', kg: 70 }]);
  await h.render().refresh();
  assert.equal(h.health.size, 1, 'migrates existing weight');
  assert.equal(h.stored()[0].pending, false);
  await h.render().refresh();
  assert.equal(h.saves(), 1, 'does not re-save synced history');
  assert.equal(h.render().persist([{ date: '2026-01-01', kg: 71 }]), true);
  await settle(h);
  assert.equal(h.health.size, 1, 'editing replaces sample');
  assert.equal([...h.health.values()][0].quantity, 71);
  h.deny();
  h.render().persist([]);
  await settle(h);
  assert.equal(h.stored()[0].deleted, true, 'retains pending deletion');
  h.allow();
  await h.render().refresh();
  assert.equal(h.health.size, 0);
  assert.equal(h.stored().length, 0);
  h.fail(true);
  h.render().persist([{ date: '2026-01-02', kg: 72 }]);
  await settle(h);
  assert.equal(h.stored()[0].pending, true, 'retains failed write');
  const version = h.stored()[0].version;
  h.fail(false);
  await h.render().refresh();
  assert.equal(h.stored()[0].version, version, 'retries same sync version');
  assert.equal(h.health.size, 1);
  h.health.set('external', { uuid: 'external', quantity: 75, startDate: new Date('2026-01-03T12:00:00'), sourceRevision: { source: { bundleIdentifier: 'other' } } });
  await h.render().refresh();
  assert.equal(h.render().weights.at(-1).healthReadOnly, true);
  assert.equal(h.render().weights.at(-1).kg, 75);
  console.log('Weight sync: migration, edit, deletion, denial, retry, and import checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
