# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/louisnwadike52-design/tokenmonitor/releases/tag/v0.1.0
