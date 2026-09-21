# Sealpad Dev Container

This devcontainer provides a pre-configured Linux environment for contributing to Sealpad.

## What's included

- Node.js 24.x (matches `.nvmrc`)
- Python 3 + setuptools (required by node-gyp)
- Git + Git LFS
- Sealpad extension pre-compiled

## Usage

1. Open the repo in GitHub Codespaces or VS Code with the Dev Containers extension
2. Run `npm ci` to install dependencies
3. Run `npm run watch` to start compilation
4. For the web build: `./scripts/code-web.sh`

**Note:** The Electron desktop build (`./scripts/code.sh`) requires a display. In Codespaces, use the web build instead.

## Configuration

Set these environment variables (or update `extensions/sealpad/src/auth/supabaseClient.ts`):

```
SEALPAD_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SEALPAD_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
