# Sealpad Fork Changelog

This file tracks all intentional divergences from `microsoft/vscode` upstream.
Every Sealpad-specific commit is prefixed `[sealpad]` for easy filtering:

```
git log --oneline --grep='\[sealpad\]'
```

## Upstream merge procedure

```bash
git fetch upstream
git checkout upstream-sync && git reset --hard upstream/main
git checkout main
git merge upstream-sync --no-ff -m "chore: merge upstream vscode $(date +%Y-%m)"
# Conflicts expected in: product.json, build/npm/dirs.ts, windows.ts
npm ci && npm run watch
```

---

## Patch inventory

### `product.json` — rebrand + Open VSX
- All `nameShort`/`nameLong`/`applicationName` → "Sealpad" / "sealpad"
- `darwinBundleIdentifier` → `com.sealpad.Sealpad`
- `dataFolderName` → `.sealpad`
- `extensionsGallery` → `https://open-vsx.org` (replaces VS Marketplace)
- `builtInExtensions` → `[]` (removed MS-marketplace fetched extensions)
- `enableTelemetry` → `false`
- Removed: `defaultChatAgent` (Copilot), `agentsTelemetryAppName`, `voiceWsUrl`, MS-internal fields

### `build/npm/dirs.ts` — extension install list
- Added `'extensions/sealpad'` so `npm ci` installs its dependencies

### `src/vs/platform/windows/electron-main/windows.ts` — Liquid Glass
- Added `vibrancy: 'under-window'`, `visualEffectState: 'active'`, `transparent: true`
  to `defaultBrowserWindowOptions` for macOS (Tahoe Liquid Glass window effect)

### `extensions/sealpad/` — new built-in extension (no upstream conflict)
- Sealpad auth (Supabase email/password, `vscode.AuthenticationProvider`)
- Tahoe Dark color theme (`themes/sealpad-tahoe-dark.json`)
- Activity Bar icon + logo SVG assets
- Phase 1 stub commands: `signIn`, `signOut`, `openDM`, `createExpiringLink`

---

## Open decisions

| Decision | Status |
|---|---|
| Key recovery | BIP-39 recovery phrase (Phase 2) |
| Bot/extension API | TBD (Phase 5/6) |
| Self-hosted Open VSX | Deferred — using public open-vsx.org |
| Metadata privacy design | Needed before Phase 3 |

---

## Build notes (macOS Apple Silicon)

```bash
fnm use                               # picks up .nvmrc → Node 24.18.0
export GYP_DEFINES="kerberos_use_rtld=false"
npm_config_arch=arm64 npm ci
npm run watch
./scripts/code.sh
```

CI runs on `macos-14` (M1) via `.github/workflows/sealpad-build.yml`.
