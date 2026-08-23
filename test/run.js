import assert from 'assert';
import { lintTopic, hasErrors, SP_MESSAGE_TYPES } from '../src/index.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

test('valid device topic passes with no errors', () => {
  const f = lintTopic('spBv1.0/Montreal/DDATA/Line-1/Press-01');
  assert.strictEqual(hasErrors(f), false);
  assert.ok(f.some((x) => x.kind === 'pass'));
});

test('valid node topic (4 levels, N-type) passes', () => {
  const f = lintTopic('spBv1.0/Montreal/NDATA/Line-1');
  assert.strictEqual(hasErrors(f), false);
});

test('empty topic yields a single fail', () => {
  const f = lintTopic('');
  assert.strictEqual(f.length, 1);
  assert.strictEqual(f[0].kind, 'fail');
});

test('wildcard characters are rejected', () => {
  const f = lintTopic('spBv1.0/Montreal/DDATA/Line+1/Press-01');
  assert.ok(hasErrors(f));
  assert.ok(f.some((x) => /wildcard/.test(x.message)));
});

test('unknown message type in place of DATA is flagged with a hint', () => {
  const f = lintTopic('spBv1.0/Montreal/DATA/Line-1/Press-01');
  assert.ok(hasErrors(f));
  assert.ok(f.some((x) => /NDATA/.test(x.message) && /DDATA/.test(x.message)));
});

test('N-type message with a device_id (5 levels) is rejected', () => {
  const f = lintTopic('spBv1.0/Montreal/NDATA/Line-1/Press-01');
  assert.ok(hasErrors(f));
  assert.ok(f.some((x) => /node-level/.test(x.message)));
});

test('D-type message missing a device_id (4 levels) is rejected', () => {
  const f = lintTopic('spBv1.0/Montreal/DDATA/Line-1');
  assert.ok(hasErrors(f));
  assert.ok(f.some((x) => /device-level/.test(x.message)));
});

test('Sparkplug 3.0 STATE topic is recognized as valid', () => {
  const f = lintTopic('spBv1.0/STATE/scada-host-01');
  assert.strictEqual(hasErrors(f), false);
  assert.ok(f.some((x) => x.kind === 'pass'));
});

test('legacy 2.2 STATE form is accepted with a migration warning', () => {
  const f = lintTopic('STATE/scada-host-01');
  assert.strictEqual(hasErrors(f), false);
  assert.ok(f.some((x) => x.kind === 'warn' && /legacy/i.test(x.message)));
});

test('wrong namespace casing gets a case-sensitivity hint', () => {
  const f = lintTopic('spbv1.0/Montreal/DDATA/Line-1/Press-01');
  assert.ok(hasErrors(f));
  assert.ok(f.some((x) => /case-sensitive/.test(x.message)));
});

test('SP_MESSAGE_TYPES exports the 8 Sparkplug message types', () => {
  assert.strictEqual(SP_MESSAGE_TYPES.length, 8);
  assert.ok(SP_MESSAGE_TYPES.includes('DDATA'));
});

console.log(`\n${passed} passed`);
