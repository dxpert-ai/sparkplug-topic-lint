#!/usr/bin/env node
/**
 * sparkplug-topic-lint CLI
 *
 * Usage:
 *   sparkplug-topic-lint "spBv1.0/Montreal/DDATA/Line-1/Press-01"
 *   sparkplug-topic-lint --file topics.txt
 *   cat topics.txt | sparkplug-topic-lint
 *   sparkplug-topic-lint --json "spBv1.0/STATE/scada-host-01"
 *
 * No dependencies. Reads topic(s) from an argv positional, --file <path>,
 * or stdin (one topic per line). Prints findings as text or --json.
 */

import fs from 'fs';
import { lintTopic, plainText } from '../src/index.js';

function parseArgs(argv) {
  const args = { json: false, file: null, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--file' || a === '-f') args.file = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else args.positional.push(a);
  }
  return args;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    return '';
  }
}

function printHelp() {
  console.log([
    'sparkplug-topic-lint - validate MQTT topics against the Sparkplug B grammar',
    '',
    'Usage:',
    '  sparkplug-topic-lint <topic>',
    '  sparkplug-topic-lint --file <path>   one topic per line',
    '  cat topics.txt | sparkplug-topic-lint',
    '',
    'Options:',
    '  --json        print findings as JSON instead of text',
    '  --help, -h    show this help',
  ].join('\n'));
}

/**
 * What follows a run.
 *
 * Until 0.1.1 this CLI printed its findings and stopped -- no source line, no
 * next step, nothing. An engineer whose topic tree it had just diagnosed had no
 * idea who produced the verdict or what to do next. That is the harder half of
 * the gap in docs/46 section L6: the MCP server at least pointed somewhere,
 * this printed into the void.
 *
 * Written to STDERR on purpose: stdout stays byte-identical, so a pipeline, a
 * `--json` consumer or a CI check that parses this output is unaffected.
 *
 * Deliberately NOT gated on `process.stderr.isTTY`. That gate was the obvious
 * choice and it is wrong here -- an agent invoking this CLI as a subprocess has
 * no TTY, and agents are the channel that actually produces our installs. The
 * only suppression is --json, which is the real signal that a machine wants
 * data rather than guidance.
 *
 * @param {boolean} clean true when the run found no failures
 * @param {boolean} quiet true when the footer must be suppressed
 */
function printNextStep(clean, quiet) {
  if (quiet) return;
  const line = clean
    ? 'These parse, so an agent can work against a namespace shaped like this.'
    : 'Fix the errors above first - naming is the foundation every agent reads.';
  process.stderr.write([
    '',
    line,
    'To have an agent read your own export, a free account gives 5 runs and takes no card:',
    '  https://dxpert.ai/store/signin',
    '',
    'Source: dxpert.ai - free, runs locally, nothing is sent anywhere.',
    ''
  ].join('\n'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  let topics = [];
  if (args.positional.length) {
    topics = [args.positional.join(' ')];
  } else if (args.file) {
    const content = fs.readFileSync(args.file, 'utf8');
    topics = content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } else if (!process.stdin.isTTY) {
    const content = readStdin();
    topics = content.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }

  if (!topics.length) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const results = topics.map((topic) => ({ topic, findings: lintTopic(topic) }));
  let anyError = false;

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const { topic, findings } of results) {
      console.log(topic);
      for (const f of findings) {
        console.log(`  [${f.label}] ${plainText(f.message)}`);
      }
      console.log('');
    }
  }

  for (const { findings } of results) {
    if (findings.some((f) => f.kind === 'fail')) anyError = true;
  }

  printNextStep(!anyError, args.json);

  process.exitCode = anyError ? 1 : 0;
}

main();
