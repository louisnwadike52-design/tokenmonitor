# Contributing to tokenmonitor

Thanks for helping! This project is intentionally small and boring to work on.

## Setup

Requirements: Node.js ≥ 20 and git. There are **no dependencies to install**.

```sh
git clone https://github.com/louisnwadike52-design/tokenmonitor.git
cd tokenmonitor
npm test        # unit tests (built-in node:test runner)
npm run lint    # file-size limit + module import checks
node bin/tokenmonitor.js --help
```

## Project rules

1. **Zero runtime dependencies.** PRs adding a dependency will be declined.
2. **Every JS file stays ≤ 150 lines** (target ≤ 100). CI enforces this via
   `scripts/check.mjs`. If a file grows past the limit, split it.
3. **Everything user-facing has a test.** Fixtures live in `test/fixtures/`
   and mirror the real on-disk log shapes of each tool.
4. **Never guess a price.** Unknown models must cost `null` (rendered `—`).

## Architecture

```text
adapters (logs → UsageRecords) → aggregate (group/filter) → pricing (cost) → report (table/json)
```

A `UsageRecord` is `{ tool, model, date, usage }` where `usage` is
`{ input, output, cacheRead, cacheWrite5m, cacheWrite1h }` (see `src/usage.js`).

## Adding an adapter (the most valuable contribution)

1. Create `src/adapters/<tool>.js` exporting `{ name, async *collect(paths) }`.
   `collect` yields `UsageRecord`s; use the helpers in `src/fsx.js` for
   fault-tolerant walking/parsing. Look at `src/adapters/codex.js` as a template.
2. Add the tool's log directory resolution to `src/config.js` (honor the env
   vars the tool itself uses).
3. Register the adapter in `src/adapters/index.js`.
4. Add a fixture in `test/fixtures/<tool>/` copied from a real (sanitized!) log,
   and a `test/<tool>.test.js` asserting exact parsed records.
5. Document the tool in the README table.

## Updating pricing

Edit the table in `src/pricing.js` (USD per million tokens), cite the vendor
pricing page in the PR description, and update `test/pricing.test.js` if the
change affects a tested model.

## Pull requests

- Keep PRs focused; one change per PR.
- `npm test && npm run lint` must pass.
- Describe *what changed and why* — link vendor docs for log-format or pricing claims.

## Releasing (maintainers)

1. Bump `version` in `package.json`, update `CHANGELOG.md`.
2. `git tag vX.Y.Z && git push --tags`.
3. The `Release` workflow tests and publishes to npm with provenance.
   It requires the `NPM_TOKEN` repository secret (an npm automation token).
