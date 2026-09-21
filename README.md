# Sealpad

**Encrypted chat and file sharing inside a VS Code-style editor.**

Sealpad is a fork of [Code - OSS](https://github.com/microsoft/vscode) that adds end-to-end encrypted messaging, zero-knowledge file sharing, and live collaboration — all within the familiar VS Code interface.

## Features

- **E2EE direct messages and group channels** — the server sees only ciphertext
- **Zero-knowledge shared folders** — files encrypted client-side, keys travel in share links
- **Expiring messages and links** — timers, max-view limits
- **Live co-editing** — Yjs-based, with updates encrypted before hitting the relay
- **VS Code integration** — chats as sidebar views, editor tabs, split panes, and command palette commands (`Sealpad: Open DM`, `Sealpad: Create Expiring Link`)

## Architecture

| Layer | Technology |
|---|---|
| Base editor | Code - OSS (VS Code fork) |
| Backend | Supabase (Auth, Postgres, Storage, Realtime) |
| Encryption | libsodium / `@noble/ciphers` |
| Key recovery | BIP-39 recovery phrase (Phase 2) |
| Extension registry | [Open VSX](https://open-vsx.org) |
| Desktop | Electron |
| Web | Browser build |

The server **never sees plaintext**. All crypto runs client-side.

## Modes

- **Friends** — simple invites, chat-forward, editor chrome mostly hidden
- **Team / Study** — shared workspaces, shared folders, roles, live co-editing

## Building

### macOS (Apple Silicon)

```bash
# Prerequisites
xcode-select --install
python3 -m pip install setuptools
brew install fnm
fnm install && fnm use          # picks up .nvmrc → Node 24.18.0

# Install + run
export GYP_DEFINES="kerberos_use_rtld=false"
npm_config_arch=arm64 npm ci
npm run watch
./scripts/code.sh               # launches Electron
./scripts/code-web.sh           # launches web build at localhost:8080
```

### Configuration

Copy your Supabase project credentials into `extensions/sealpad/src/auth/supabaseClient.ts`:

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Or set them as environment variables: `SEALPAD_SUPABASE_URL` and `SEALPAD_SUPABASE_ANON_KEY`.

## CI

Every push to `main` triggers a build on a macOS M1 GitHub Actions runner (`.github/workflows/sealpad-build.yml`). The compiled extension is uploaded as an artifact.

## Roadmap

| Phase | Status |
|---|---|
| 1 — Fork, rebrand, auth | ✅ Complete |
| 2 — Encrypted DMs | 🔲 Next |
| 3 — Group channels + shared folders | 🔲 Planned |
| 4 — Expiring messages and links | 🔲 Planned |
| 5 — Live collaboration | 🔲 Planned |
| 6 — Mode polish | 🔲 Planned |

## Fork maintenance

See [SEALPAD.md](SEALPAD.md) for the complete list of upstream patches and the monthly merge procedure.

## License

[MIT](LICENSE.txt)
