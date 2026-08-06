---
name: release
description: Cuts a new BaseData desktop release — bumps the version, tags it, pushes, and lets GitHub Actions build the macOS (Apple Silicon) package with electron-builder and publish it as a draft GitHub Release. Use this whenever the user wants to "release", "ship", "cut a version", "publish a build", "make a new build available", or asks about the release/CI pipeline, auto-update, or electron-builder publishing for this repo — even if they just say "let's release" or name a version number.
---

# BaseData release

BaseData ships as an unsigned Electron app built by `electron-builder`. Releases are
cut by pushing a `vX.Y.Z` git tag; `.github/workflows/release.yml` then does the actual
build on a macOS Apple-Silicon GitHub runner and publishes the artifacts. Local
machines never need to run `electron-builder` themselves for a real release — that
step is CI's job, so the artifact is built from exactly what's in the tagged commit.

Only macOS arm64 is wired up right now (see `electron-builder.yml` — `mac.target`
pins both `dmg` and `zip` to `arch: [arm64]`). Windows/Linux scripts still exist for
local `dist:win` / `dist:linux` builds but aren't part of this CI pipeline.

## Why the release lands as a draft

`electron-builder.yml` sets `publish.releaseType: draft`. CI can safely run
end-to-end — build, upload assets, create the GitHub release — without ever making
something public on its own. The release only goes live when a human clicks
"Publish release" on GitHub. Treat that as the actual publish step: pushing the tag
is not it.

## Before touching anything: confirm with the user

Pushing a tag is visible on GitHub, kicks off a CI run, and (once the resulting draft
is published) makes a build public — treat the tag push as the point of no easy
return, even though the release itself lands as a draft. Before running `npm version`
or pushing, confirm with the user:
- which version bump (patch / minor / major, or an explicit version)
- that the working tree is clean and on `main`

Don't push a tag on the user's behalf without that confirmation, even if they've
approved a release before — get it per release.

## Steps

1. **Sanity-check the tree.**
   ```bash
   git status --porcelain   # must be empty
   git branch --show-current  # should be main (or confirm with the user if not)
   git pull --ff-only
   ```

2. **Fail fast locally before tagging anything.** CI runs `typecheck` too, but
   catching a break here avoids burning a CI run and a tag on a broken commit:
   ```bash
   npm run typecheck
   npm run build
   ```

3. **Bump the version.** `npm version` updates `package.json`, commits, and creates
   the `vX.Y.Z` tag in one step — don't hand-edit the version field:
   ```bash
   npm version patch   # or: minor | major | 1.2.3
   ```

4. **Push the commit and the tag together** (this is the confirmed, outward-facing
   step from above):
   ```bash
   git push --follow-tags
   ```

5. **The workflow starts automatically** on the tag push. Watch it rather than
   guessing at timing:
   ```bash
   gh run watch $(gh run list --workflow=release.yml -L 1 --json databaseId -q '.[0].databaseId') --exit-status
   ```
   It builds on `macos-14`, runs `electron-builder --mac --arm64 --publish always`,
   and uploads the `dmg`, the `zip`, and `latest-mac.yml` to a draft release named
   after the tag.

6. **Hand the draft to the user** — don't publish it yourself:
   ```bash
   gh release view vX.Y.Z --web
   ```
   Tell them it's a draft and that clicking "Publish release" on that page is what
   actually makes it public.

## If the build fails or you need to redo it

Delete the tag and the (draft) release, fix the problem, and start over from step 3
— don't try to reuse a version number:
```bash
gh release delete vX.Y.Z --yes 2>/dev/null   # only if a draft was already created
git push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z
```

## Auto-update — not wired up yet, but the plumbing is ready

The user plans to add in-app auto-update later via `electron-updater`. Nothing in
the running app polls for updates today, but the release pipeline already produces
what `electron-updater` needs on the mac side:
- the `zip` target (Squirrel.Mac requires it, not just the `dmg`)
- `latest-mac.yml`, which `electron-builder`'s GitHub publish provider generates
  automatically from the same release

So when that feature is built, it's app-side only: add the `electron-updater`
dependency and call `autoUpdater.checkForUpdatesAndNotify()` (or equivalent) from the
main process. It will find these already-published releases, and it will actually
work — Squirrel.Mac (what `autoUpdater` uses on macOS) refuses to apply updates to
an unsigned app, and signing is already wired up (see below), so this isn't blocked
anymore.

## Signing and notarization

The workflow signs and notarizes the build, which is what makes Squirrel.Mac-based
auto-update possible later and avoids the Gatekeeper "unidentified developer" / "app
is damaged" warnings today. `electron-builder` handles both automatically — signing
via `CSC_LINK`/`CSC_KEY_PASSWORD`, notarizing via `APPLE_ID`/
`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID` (see `MacTargetHelper.getNotarizeOptions`
in `app-builder-lib` — it notarizes automatically whenever those three env vars are
present, no extra `electron-builder.yml` config needed). All five values are GitHub
repo secrets, wired into `.github/workflows/release.yml`:

| Secret | What it is | Where to get it |
| --- | --- | --- |
| `CSC_LINK` | Base64 of the "Developer ID Application" `.p12` cert | Keychain Access → export the cert → `base64 -i cert.p12` |
| `CSC_KEY_PASSWORD` | The password set when exporting that `.p12` | chosen during export |
| `APPLE_ID` | Apple Developer account email | — |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | appleid.apple.com → Sign-In and Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | 10-character Team ID | developer.apple.com/account → Membership Details |

If a build ever fails notarization or signing, `gh run view --log-failed` on the
failed run shows the `@electron/notarize` / codesign error directly — Apple's
rejection reasons (e.g. missing entitlements) show up there.
