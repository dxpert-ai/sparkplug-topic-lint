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

  process.exitCode = anyError ? 1 : 0;
}

main();
