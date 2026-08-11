# Releasing StepForge

StepForge uses `electron-builder` with the GitHub Releases provider. Installed
copies poll GitHub every 10 minutes, download in the background, and install
silently once the app is idle, so publishing a release is all it takes to update
everyone.

## Automatic releases (normal path)

Merging to `main` releases. `.github/workflows/release.yml` runs on every push to
`main` and:

1. Bumps the patch version — from whichever is higher, `package.json` or the
   highest existing `v*` tag, so a hand-cut release can never cause a collision.
2. Runs `npm run typecheck`.
3. Runs `npm run release`, which builds and publishes the NSIS installer,
   `latest.yml`, and the blockmap to a new GitHub Release.
4. Commits the version bump back to `main` as `github-actions[bot]`.
5. Runs `npm run verify:updater -- -RequirePublished` against the published
   release.

Nothing else is required — no local build, no manual tag, no `GH_TOKEN`. The
workflow authenticates with the built-in `GITHUB_TOKEN`.

### Skipping a release

- **Docs and workflow changes never release.** The trigger ignores `**/*.md` and
  `.github/**`.
- **Any other merge can opt out** by including `[skip release]` in the merge
  commit message.

### Choosing a minor or major bump

Merges always bump the patch version. For a minor or major release, open the
**Actions** tab, pick the **Release** workflow, press **Run workflow**, and
choose the bump. It builds from the current `main`.

## Pull request checks

`.github/workflows/ci.yml` runs `npm run typecheck` and `npm run build` on every
pull request. Because merging publishes to users, treat a red PR as unmergeable.

## Manual release (fallback)

Only needed if Actions is unavailable.

1. Set `GH_TOKEN` in the shell to a GitHub token with repository release
   permissions.
2. Bump the version with `npm version patch`, `npm version minor`, or
   `npm version major`.
3. Run `npm run verify:release`.
4. Run `npm run release`.
5. Run `npm run verify:updater -- -RequirePublished` to confirm the GitHub
   release contains the NSIS installer, `latest.yml`, and the blockmap
   referenced by `latest.yml`.

For local smoke testing without publishing, run `npm run dist` and install the
generated file from `release/`.

## Notes and limitations

- **The packaged launch smoke test is not in CI.** `npm run verify:release`
  launches the packaged app and screenshots it; that is worth running locally
  before a risky release, but it is too fragile to gate automatic publishing.
  CI covers typecheck, build, packaging, and updater metadata.
- **Builds are unsigned.** No code-signing certificate is configured, so Windows
  SmartScreen warns on first install exactly as it does for local builds. Adding
  a certificate means setting `CSC_LINK` and `CSC_KEY_PASSWORD` as repository
  secrets and passing them to the build step.
- **The release tag points at the commit that triggered the build**, not at the
  version-bump commit the workflow pushes afterwards, because electron-builder
  creates the release before that commit exists.
- **If branch protection is ever added to `main`**, the workflow's version-bump
  push needs an exemption for `github-actions[bot]`, or step 4 will fail after
  the release has already been published.
