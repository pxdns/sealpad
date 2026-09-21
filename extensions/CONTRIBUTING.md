# Sealpad Extensions

All Sealpad feature code lives in `extensions/sealpad/`. Other directories in `extensions/` are upstream vscode built-in extensions — do not modify them.

## `extensions/sealpad/` structure

```
extensions/sealpad/
├── package.json          — extension manifest (commands, views, auth provider)
├── tsconfig.json         — TypeScript config
├── esbuild.js            — bundler script (outputs dist/extension.js)
├── media/
│   ├── sealpad-logo.svg         — app logo (purple→teal gradient padlock)
│   └── sealpad-activitybar.svg  — 24px monochrome icon for the Activity Bar
├── themes/
│   └── sealpad-tahoe-dark.json  — Tahoe Liquid Glass dark color theme
└── src/
    ├── extension.ts       — activate() entry point
    └── auth/
        ├── supabaseClient.ts  — Supabase client singleton
        ├── authProvider.ts    — vscode.AuthenticationProvider implementation
        └── authWebview.ts     — sign-in / sign-up webview panel
```

## Building

```bash
cd extensions/sealpad
npm ci
npm run compile      # one-shot
npm run watch        # incremental (also started by root npm run watch)
```

## Adding new upstream extensions

If an upstream extension is needed (e.g., for CI or testing), add its directory to `build/npm/dirs.ts`. Do **not** add Sealpad feature code to existing upstream extension directories.
