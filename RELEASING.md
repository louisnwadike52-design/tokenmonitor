# Releasing

Releases are published to npm by GitHub Actions
([`.github/workflows/release.yml`](.github/workflows/release.yml)) when a `v*`
tag is pushed. Provenance is attached automatically, and CI-based publishing
bypasses the interactive 2FA prompt you hit when publishing from a laptop.

You configure authentication **once**. Pick one of the two methods below.

## Option A — Automation token (works for the first publish)

An npm **automation token** bypasses 2FA and can create the package on its
first publish, so this is the simplest way to go live.

1. npmjs.com → avatar → **Access Tokens** → **Generate New Token**.
   - Granular Access Token with **Read and write** to the `tokenmonitor`
     package (or a classic **Automation** token).
2. Add it to the repo:
   ```sh
   gh secret set NPM_TOKEN --repo louisnwadike52-design/tokenmonitor
   ```
   (or GitHub → repo → Settings → Secrets and variables → Actions → New secret,
   named `NPM_TOKEN`).

## Option B — Trusted Publishing / OIDC (optimal, no secrets)

No long-lived token to store or leak; npm trusts the workflow directly via
OIDC. Configurable on npmjs.com **after the package exists** (do Option A once
first, then switch).

1. npmjs.com → the `tokenmonitor` package → **Settings** → **Trusted Publisher**.
2. Choose **GitHub Actions** and enter:
   - Repository: `louisnwadike52-design/tokenmonitor`
   - Workflow filename: `release.yml`
3. Remove the `NPM_TOKEN` secret once trusted publishing works — it's no longer
   needed. The workflow already requests `id-token: write`, so nothing in the
   workflow changes.

## Cutting a release

Once one of the above is configured:

```sh
npm version patch          # or minor / major — bumps package.json, commits, tags
git push --follow-tags      # pushes the commit and the vX.Y.Z tag
```

Pushing the tag triggers the workflow, which re-runs tests + lint, verifies the
tag matches `package.json`, and publishes. Watch it with:

```sh
gh run watch --repo louisnwadike52-design/tokenmonitor
```

Then update the GitHub Release notes (`gh release create vX.Y.Z --notes ...` or
edit the auto-created release) and the `CHANGELOG.md` entry.

You can also trigger the workflow manually from the **Actions** tab
(**Release** → **Run workflow**) to publish the current `package.json` version.
