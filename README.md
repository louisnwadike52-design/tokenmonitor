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
| **Claude Code** | `~/.claude/projects/**/*.jsonl` (honors `$CLAUDE_CONFIG_DIR`) | dedupes resumed sessions; 5m/1h cache-write TTLs priced separately |
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
| `--json` | machine-readable output (rows + totals) |
| `--no-color` | disable ANSI styling (also honors `NO_COLOR`) |
| `-h, --help` / `-v, --version` | help / version |

## How costs are estimated

Costs are computed from each vendor's **public API list prices** (USD per million tokens):

```text
input×Pin + output×Pout + cacheRead×Pread + cacheWrite5m×Pin×1.25 + cacheWrite1h×Pin×2
```

- If you pay per token via API keys, this approximates your bill.
- If you're on a subscription (Claude Max, ChatGPT Plus, Gemini free tier), it shows
  what your usage *would* cost at API rates — useful for judging the plan's value.
- Models missing from the pricing table show `—` and are footnoted, never mispriced.
- Prices live in [`src/pricing.js`](src/pricing.js) — pricing-update PRs are very welcome.

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
- Budgets and alerts

## License

[MIT](LICENSE) © Louis Nwadike
