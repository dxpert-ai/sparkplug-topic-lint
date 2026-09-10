import assert from 'assert';
import { spawnSync } from 'child_process';
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


// --------------------------------------------------------------- CLI surface
// Added in 0.1.1. Before it, this CLI printed its findings and stopped -- no
// source line and no next step, so an engineer whose tree it had just
// diagnosed had no idea who produced the verdict or what to do about it.
// These lock in the two properties that make the footer safe to ship:
// stdout stays byte-identical, and --json stays machine-clean.

const CLI = new URL('../bin/cli.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function runCli(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { out: r.stdout, err: r.stderr, code: r.status };
}

test('a failing CLI run names the next step on stderr', () => {
  const { err } = runCli(['spBv1.0/Mtl/BADTYPE/Edge-1']);
  assert.match(err, /Fix the errors above first/);
  assert.match(err, /free account gives 5 runs and takes no card/);
  assert.match(err, /store\/signin/);
});

test('a clean CLI run names a different next step', () => {
  const { err } = runCli(['spBv1.0/Mtl/DDATA/Edge-1/Press-01']);
  assert.match(err, /These parse/);
  assert.match(err, /store\/signin/);
  assert.ok(!/Fix the errors above/.test(err));
});

test('the footer never touches stdout', () => {
  const { out } = runCli(['spBv1.0/Mtl/BADTYPE/Edge-1']);
  assert.ok(!out.includes('store/signin'), 'stdout must stay parseable and unchanged');
  assert.ok(!out.includes('free account'), 'stdout must stay parseable and unchanged');
});

test('--json stays machine-clean on both streams', () => {
  const { out, err } = runCli(['--json', 'spBv1.0/Mtl/DDATA/Edge-1/Press-01']);
  JSON.parse(out);
  assert.strictEqual(err.trim(), '', '--json signals a machine consumer: say nothing');
});

test('the next-step copy never overclaims', () => {
  const { err } = runCli(['spBv1.0/Mtl/BADTYPE/Edge-1']);
  for (const word of ['audit', 'certified', 'guaranteed', 'compliant']) {
    assert.ok(!new RegExp(word, 'i').test(err), 'must never say ' + word);
  }
});

console.log(`\n${passed} passed`);
