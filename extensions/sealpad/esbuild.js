// @ts-check
const esbuild = require('esbuild');
const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
	entryPoints: ['src/extension.ts'],
	bundle: true,
	platform: 'node',
	external: ['vscode'],
	outfile: 'dist/extension.js',
	minify: process.env.NODE_ENV === 'production',
	sourcemap: process.env.NODE_ENV !== 'production',
};

if (isWatch) {
	esbuild.context(options).then(ctx => ctx.watch()).catch(() => process.exit(1));
} else {
	esbuild.build(options).catch(() => process.exit(1));
}
