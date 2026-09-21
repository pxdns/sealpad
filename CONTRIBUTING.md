# Contributing to Sealpad

Thank you for your interest in contributing!

## Overview

Sealpad is a fork of [Code - OSS](https://github.com/microsoft/vscode). Almost all Sealpad-specific code lives in `extensions/sealpad/` so that upstream merges stay manageable. Please keep patches to core vscode files minimal.

## Reporting issues

Open an issue at [github.com/pxdns/sealpad/issues](https://github.com/pxdns/sealpad/issues).

For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Development setup

See [README.md](README.md) for build instructions.

## Commit conventions

All Sealpad-specific commits must be prefixed:

```
[sealpad] <category>: short description
```

Examples:
- `[sealpad] auth: add BIP-39 key recovery`
- `[sealpad] theme: fix tab border in Tahoe Dark`
- `[sealpad] ci: add Linux build job`

This prefix lets us extract the full fork diff at any time:

```bash
git log --oneline --grep='\[sealpad\]'
```

## Extension development

Feature work goes in `extensions/sealpad/src/`. The extension is compiled with esbuild:

```bash
cd extensions/sealpad
npm ci
npm run compile        # one-shot
npm run watch          # incremental
```

## Upstream sync

See [SEALPAD.md](SEALPAD.md) for the upstream merge procedure. When the upstream changes files we've patched (`product.json`, `build/npm/dirs.ts`, `src/vs/platform/windows/electron-main/windows.ts`), resolve conflicts by keeping Sealpad values.

## Code of conduct

Be respectful. This project is about private communication tools — take privacy and security seriously in all contributions.
