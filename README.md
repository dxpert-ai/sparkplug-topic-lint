# sparkplug-topic-lint

Validates MQTT topics against the Sparkplug B topic grammar (Sparkplug 3.0). It exists because Sparkplug topic mistakes are easy to make and expensive to find later, once a broker, historian, and SCADA host all disagree about what a topic means.

## What it checks

- Topic shape: `spBv1.0/{group_id}/{message_type}/{edge_node_id}[/{device_id}]`
- STATE topics, both the Sparkplug 3.0 form (`spBv1.0/STATE/{host_id}`) and the legacy 2.2 form (`STATE/{host_id}`)
- Message type validity (`NBIRTH`, `NDEATH`, `DBIRTH`, `DDEATH`, `NDATA`, `DDATA`, `NCMD`, `DCMD`) and node-vs-device mismatches (e.g. an `NDATA` topic that carries a `device_id`, or a `DDATA` topic missing one)
- MQTT wildcards (`+`, `#`) that should never appear in a published topic
- Empty topic levels, stray whitespace, and characters outside the safe `A-Z a-z 0-9 _ - .` set in an id segment

## Usage

### Browser

Open `demo/index.html` directly in a browser (no server or build step needed — it's a plain ES module import). Paste a topic and click "Lint topic".

### As a module

```js
import { lintTopic } from '@dxpert/sparkplug-topic-lint';

const findings = lintTopic('spBv1.0/Montreal/DDATA/Line-1/Press-01');
// [{ kind: 'pass', label: 'VALID', message: 'Well-formed Sparkplug B device topic.' }, ...]
```

Each finding is `{ kind: 'fail' | 'warn' | 'pass' | 'info', label, message }`. `message` may contain simple `<code>...</code>` markup; strip it with the exported `plainText()` helper for plain-text output.

### CLI

```sh
node bin/cli.js "spBv1.0/Montreal/DDATA/Line-1/Press-01"
node bin/cli.js --file topics.txt
cat topics.txt | node bin/cli.js --json
```

No dependencies to install. Exit code is non-zero if any linted topic has an error.

## Examples

```
spBv1.0/Montreal/DDATA/Line-1/Press-01
  [VALID] Well-formed Sparkplug B device topic.
  [PARSED] group_id = Montreal - message = DDATA - edge_node = Line-1 - device = Press-01

spBv1.0/Montreal/DATA/Line 1/Press-01/Motor
  [ERROR] DATA is not a Sparkplug B message type. Valid: NBIRTH, NDEATH, DBIRTH, DDEATH, NDATA, DDATA, NCMD, DCMD, STATE. There is no plain DATA type - use NDATA (node) or DDATA (device).
  [WARN] The edge_node_id Line 1 contains whitespace. Legal in MQTT, but a reliable source of downstream pain (historians, SQL columns, file paths). Prefer - or _.

spBv1.0/STATE/scada-host-01
  [VALID] Well-formed Sparkplug 3.0 STATE topic.
  [PARSED] STATE message - host_id = scada-host-01
```

## Maintained by dxpert.ai

dxpert.ai (https://dxpert.ai) builds tools and services for Industry 4.0 / digital transformation teams designing and validating industrial data layers. This linter is one of a small set of free, no-signup validators.

A free hosted version of this tool runs at [dxpert.ai/tools.html](https://dxpert.ai/tools.html) — no install required.
