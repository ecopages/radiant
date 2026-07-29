/** Post-build check: server entrypoints import shared `dist/chunk-*.js` (see `build.ts` server split). */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const packageRoot = path.join(import.meta.dirname, '..');
const distDir = path.join(packageRoot, 'dist');
const distServerDir = path.join(distDir, 'server');

const sharedChunks = readdirSync(distDir).filter((name) => name.startsWith('chunk-') && name.endsWith('.js'));

if (sharedChunks.length === 0) {
	console.error(
		'[@ecopages/radiant] server dist verification: expected shared chunk files under dist/ (esbuild splitting).',
	);
	process.exit(1);
}

const serverEntriesThatMustShareChunks = [
	'render-component.js',
	'radiant-element-ssr.js',
	'radiant-element-ssr-bridge.js',
	'install-ssr-runtime.js',
];

for (const entryName of serverEntriesThatMustShareChunks) {
	const entryPath = path.join(distServerDir, entryName);

	if (!existsSync(entryPath)) {
		console.error(`[@ecopages/radiant] server dist verification: missing ${entryName}.`);
		process.exit(1);
	}

	const source = readFileSync(entryPath, 'utf8');

	if (!source.includes('../chunk-')) {
		console.error(
			`[@ecopages/radiant] server dist verification: ${entryName} must import shared chunks (../chunk-*.js).`,
		);
		process.exit(1);
	}
}
