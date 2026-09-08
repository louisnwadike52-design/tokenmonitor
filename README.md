# tokenmonitor

[![CI](https://github.com/louisnwadike52-design/tokenmonitor/actions/workflows/ci.yml/badge.svg)](https://github.com/louisnwadike52-design/tokenmonitor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

**See what your AI coding tools actually use and cost — one command, 100% local.**

`tokenmonitor` reads the session logs your AI CLIs already write to disk and reports
token usage and estimated spend across all of them:

| Tool | Logs read | Notes |
| --- | --- | --- |
| **Claude Code** | `~/.claude/projects/**/*.jsonl` (`$CLAUDE_CONFIG_DIR` overrides) | dedupes resumed sessions; 5m/1h cache-write TTLs priced separately |
| **OpenAI Codex CLI** | `$CODEX_HOME/sessions` (default `~/.codex/sessions`) | per-request deltas; cached input priced at the discounted rate |
| **Gemini CLI** | `$GEMINI_DIR` (default `~/.gemini`) | best-effort scan of session metrics and chat transcripts |

No API keys, no accounts, no telemetry, no network calls — it never leaves your machine.

## Install

```sh
npm install -g tokenmonitor   # or: npx tokenmonitor
```

From source (zero dependencies — there is nothing to `npm install`):

```sh
git clone https://github.com/louisnwadike52-design/tokenmonitor.git
cd tokenmonitor && npm link
```

## Usage

```sh
tokenmonitor            # usage by tool + model (default)
tokenmonitor daily      # usage by day
tokenmonitor models     # usage by model
tokenmonitor plans      # list known subscription plans
```

```text
$ tokenmonitor daily --since 2026-09-05

Date        Input     Output     Cache Read  Cache Write          Total  Est. Cost
──────────────────────────────────────────────────────────────────────────────────
2026-09-05  4,933  1,642,150  1,338,074,425   11,017,526  1,350,739,034    $816.08
2026-09-06  5,148  1,846,044  1,341,559,226   18,695,778  1,362,106,196    $910.02
2026-09-07  7,967  2,597,661  1,879,532,003   22,492,909  1,904,630,540     $1,720
2026-09-08    180     90,306     28,576,229    1,367,832     30,034,547     $51.16
──────────────────────────────────────────────────────────────────────────────────
TOTAL       18,228  6,176,161  4,587,741,883   53,574,045  4,647,510,317     $3,497
```

### Options

| Flag | Effect |
| --- | --- |
| `--since <YYYY-MM-DD>` / `--until <YYYY-MM-DD>` | date range filter |
| `--tool <claude\|codex\|gemini>` | limit to one tool |
| `--plan <id>` | compare usage against a subscription plan (see below) |
| `--json` | machine-readable output (rows + totals + plan) |
| `--no-color` | disable ANSI styling (also honors `NO_COLOR`) |
| `-h, --help` / `-v, --version` | help / version |

## Tokens vs. cost — read this

**Token counts are exact** — read straight from each tool's log fields, deduplicated
so nothing is counted twice. The methodology matches [ccusage](https://ccusage.com/guide/cost-modes),
the established Claude Code cost tool. See [PRICING.md](PRICING.md) for the precise fields.

**"Est. Cost" is the pay-as-you-go API list price** of that usage:

```text
input×Pin + output×Pout + cacheRead×Pin×0.1 + cacheWrite5m×Pin×1.25 + cacheWrite1h×Pin×2
```

- Pay per token via **API keys**? This approximates your bill.
- On a **subscription** (Claude Pro/Max, ChatGPT Plus/Pro, Google AI Pro/Ultra)? You
  pay a flat monthly fee, **not** this number — it's what the usage *would* cost at API
  rates. Heavy users routinely rack up many multiples of their plan fee in API-equivalent
  value; that's the point of a subscription. Use `--plan` to see the comparison.
- Models with no known price show `—` and are footnoted — **never** mispriced.

### Subscription comparison

```text
$ tokenmonitor --plan claude-max-20x

...usage table...

Subscription check — Claude Max 20x
  Plan fee:         $200.00/mo × 2 mo = $400.00
  API-equivalent:   $22,995.50  (claude usage)
  Effective value:  57.5× your subscription
  → Your plan covers this; the same usage would cost more at API rates.
```

`tokenmonitor plans` lists every known plan id. Prices (with sources) live in
[`src/plans.js`](src/plans.js) and [PRICING.md](PRICING.md).

### Custom pricing

Override or extend the table with `~/.config/tokenmonitor/pricing.json`
(or point `$TOKENMONITOR_PRICING` at any file). Keys are model-id prefixes;
prices are USD per million tokens:

```json
{
  "my-fine-tuned-model": { "input": 3, "output": 12 },
  "claude-opus-5": { "input": 4.5, "output": 22.5 }
}
```

Optional per-entry fields: `cacheRead`, `cacheWrite5m`, `cacheWrite1h`.

## Use as a library

`tokenmonitor` is also a zero-dependency ES module:

```js
import { collectUsage, aggregate, totalsOf } from "tokenmonitor";

const records = await collectUsage();               // priced usage records
const daily = aggregate(records, { groupBy: "date" });
console.log(totalsOf(daily));
```

Also exported: `costOf`, `resolvePricing`, `PRICING`, `PLANS`, `planSummary`,
`renderReport`, and the `adapters` registry. See [`src/index.js`](src/index.js).

## Privacy

`tokenmonitor` only ever **reads** local log files and prints to stdout.
It makes zero network requests and has zero dependencies — the entire package
is ~25 kB of auditable JavaScript.

## Contributing

Adding support for a new AI CLI is a single ~80-line adapter file — see
[CONTRIBUTING.md](CONTRIBUTING.md) for the walkthrough, project rules
(every source file ≤ 150 lines, enforced by CI), and how to run the tests.

## Roadmap

- npm release (`npm i -g tokenmonitor`)
- `--watch` live mode
- More adapters: Cursor CLI, Copilot CLI, Aider
- Per-request server-tool (web search) surcharges
- Budgets and alerts

## License

[MIT](LICENSE) © Louis Nwadike
