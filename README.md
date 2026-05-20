# StepForge

StepForge is a Windows QA steps recorder built with Electron, React, and TypeScript. It captures window-focused screenshots while recording tester actions, lets teams edit and annotate steps, and exports HTML, PDF, DOCX, and Markdown reports for Jira/Xray workflows.

## Requirements

- Windows 10 or 11 x64
- Node.js 20 or newer
- npm

## Development

```powershell
npm install
npm run dev
```

## Validate A Release Build

```powershell
npm run verify:release
```

The Windows installer is generated in `release/` as `StepForge-Setup-<version>.exe`.

## Publish A Release

StepForge uses GitHub Releases for auto-update metadata.

1. Bump the version in `package.json`.
2. Run `npm run verify:release`.
3. Push the source changes to GitHub.
4. Create a GitHub release tagged `v<version>`.
5. Upload the generated installer, blockmap, and `latest.yml` from `release/`.
6. Run `npm run verify:updater -- -RequirePublished`.

Do not commit `release/`, `out/`, or `node_modules/`; they are generated locally.