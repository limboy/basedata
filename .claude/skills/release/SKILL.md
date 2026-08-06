---
name: release
description: Cuts a new BaseData desktop release — bumps the version, tags it, pushes, and lets GitHub Actions build the macOS (Apple Silicon) package with electron-builder and publish it live as a public GitHub Release. Use this whenever the user wants to "release", "ship", "cut a version", "publish a build", "make a new build available", or asks about the release/CI pipeline, auto-update, or electron-builder publishing for this repo — even if they just say "let's release" or name a version number.
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

## The release goes live automatically — there is no draft step

`electron-builder.yml` sets `publish.releaseType: release`. As soon as CI finishes
building, signing, and notarizing successfully, the GitHub release is created
**public** — no human clicks "Publish release." That means **the tag push is the
actual publish step**: once `git push --follow-tags` lands and CI goes green, the
build is live and users can download it. There is no later review point to catch
a bad release before it's public.

(This used to land as a draft — `releaseType: draft` — requiring a manual publish
click. That safety net was intentionally removed at the user's request in favor of
full automation.)

## Before touching anything: confirm with the user

Pushing a tag is the point of no easy return: it kicks off CI, and a green run makes
the build public immediately, with no draft to review first. Before running
`npm version` or pushing, confirm with the user:
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
   It pre-creates the GitHub release with `gh release create ... --generate-notes`
   (release notes auto-built from the commits/PRs since the previous release — no
   changelog to maintain by hand), builds on `macos-14`, runs
   `electron-builder --mac --arm64 --publish always`, and uploads the `dmg`, the
   `zip`, and `latest-mac.yml` to that release — live the moment the run goes green,
   no manual step after.

6. **Confirm it's live and hand the link to the user**:
   ```bash
   gh release view vX.Y.Z --web
   ```
   There's nothing left for them to click — just let them know the build is out.

## If the build fails or you need to redo it

A failed run before the publish step completes leaves nothing public — just fix the
problem and start over from step 3, don't reuse the version number. But because
publishing is no longer gated behind a draft, a run that fails *after* the release
was created (e.g. a later asset upload in a multi-target publish) may have already
made a partial release public. Check before assuming it's safe to just delete and
retag:
```bash
gh release view vX.Y.Z --json isDraft,assets  # see what's actually out there
gh release delete vX.Y.Z --yes 2>/dev/null   # only after confirming with the user
git push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z
```
If a release already went public with partial or broken assets, tell the user before
deleting it — don't silently remove something that may already have been downloaded.

### Known failure mode: duplicate releases from a publish race

`electron-builder`'s `dmg` and `zip` mac targets each call get-or-create on the
GitHub release for the tag when publishing, and those calls can race — both see "no
release yet" and each create one, splitting the assets (e.g. `dmg` in one release,
`zip` + `latest-mac.yml` in another). `.github/workflows/release.yml` has a step
that pre-creates the release before `electron-builder` runs specifically to close
this race, but if it ever shows up anyway (e.g. workflow was dispatched manually and
skipped that step, or the race happens elsewhere), check `gh release list` for two
entries under the same tag, merge the assets into one via the GitHub API, and delete
the other. Since releases now go public immediately, catch and fix this fast.

### Known failure mode: the pre-created release must not be a draft

`electron-builder` reuses whatever release it finds matching the tag exactly as-is
— draft or not — it never flips a draft to published after uploading. So the
pre-create step in `.github/workflows/release.yml` must create the release without
`--draft` (matching `publish.releaseType: release` in `electron-builder.yml`); if it
ever creates a draft, every future release will silently pile up as an unpublished
draft again regardless of what `releaseType` says. If releases mysteriously stop
going live, check that step first.

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
