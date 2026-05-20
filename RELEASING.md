# Releasing StepForge

StepForge uses `electron-builder` with the GitHub Releases provider.

1. Set `GH_TOKEN` in the shell to a GitHub token with repository release permissions.
2. Bump the version with `npm version patch`, `npm version minor`, or `npm version major`.
3. Run `npm run verify:release` from the `stepforge` folder.
4. Run `npm run release` from the `stepforge` folder.
5. Run `npm run verify:updater -- -RequirePublished` to confirm the GitHub release contains the NSIS installer, `latest.yml`, and blockmap referenced by `latest.yml`.

For local smoke testing without publishing, run `npm run dist` and install the generated file from `release/`.
