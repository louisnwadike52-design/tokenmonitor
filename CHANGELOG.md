# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-09-08

### Added

- **Subscription comparison** — `--plan <id>` compares your usage against a flat
  monthly plan (Claude Pro/Max, ChatGPT Plus/Pro, Google AI Pro/Ultra) and shows
  the effective value multiple; `tokenmonitor plans` lists the plans. Prices and
  sources documented in `PRICING.md` and `src/plans.js`.
- **Programmatic API** — the package is now importable as a zero-dependency ES
  module (`import { collectUsage, aggregate, costOf } from "tokenmonitor"`), with a
  documented, tested export surface (`src/index.js`).
- `PRICING.md` documenting exact token fields per tool, the cost formula, cache
  multipliers, and cited price sources — parity with the ccusage methodology.
- `SECURITY.md`, Dependabot config for GitHub Actions, and `.nvmrc`.

### Changed

- **Cost is now labelled unambiguously** as a pay-as-you-go API list-price estimate
  in every report, so subscription users aren't misled by large API-equivalent figures.
- Number handling hardened against non-numeric log values; zero-token records dropped.

### Fixed

- `CLAUDE_CONFIG_DIR` now **replaces** the default log locations instead of adding
  to them, matching Claude Code's own behavior (previously it could read the real
  `~/.claude` even when pointed elsewhere).
- More resilient Codex model detection and a recursion-depth guard in the Gemini
  adapter.

## [0.1.0] - 2026-09-08

### Added

- `tokenmonitor` CLI with `summary` (default), `daily`, and `models` views.
- Adapters for Claude Code, OpenAI Codex CLI, and Gemini CLI session logs.
- Cost estimation from vendor list prices, including Anthropic cache
  read/write (5m/1h TTL) multipliers and OpenAI/Gemini cached-input discounts.
- User pricing overrides via `~/.config/tokenmonitor/pricing.json` or
  `$TOKENMONITOR_PRICING`.
- `--since`, `--until`, `--tool`, `--json`, `--no-color` options.
- Zero-dependency implementation, tests on the built-in `node:test` runner,
  CI (Node 20/22/24) and npm release workflow with provenance.

[0.2.0]: https://github.com/louisnwadike52-design/tokenmonitor/releases/tag/v0.2.0
[0.1.0]: https://github.com/louisnwadike52-design/tokenmonitor/releases/tag/v0.1.0
