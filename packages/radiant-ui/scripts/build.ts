/**
 * Builds the radiant-ui library into `dist/`.
 *
 * Bundles the public TypeScript entries and every `src/components/ui/<name>/index.ts`
 * as browser-targeted ESM with `@ecopages/*` external.
 *
 * Run with: pnpm run build:files
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { transformAsync } from '@babel/core';
import decorators from '@babel/plugin-proposal-decorators';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const UI_DIR = path.join(SRC, 'components', 'ui');

const externalPackages = [
	'@ecopages/jsx',
	'@ecopages/jsx/*',
	'@ecopages/radiant',
	'@ecopages/radiant/*',
	'@ecopages/signals',
	'@ecopages/signals/*',
	'*.css',
];

function listComponentEntries(): string[] {
	return readdirSync(UI_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(UI_DIR, entry.name, 'index.ts'))
		.filter((indexPath) => existsSync(indexPath))
		.sort();
}

/**
 * Lowers standard decorators because esbuild preserves them in ESM output.
 *
 * @remarks The package uses standard decorator semantics, while consumers such
 * as the docs SSR loader must receive executable JavaScript rather than source
 * decorator syntax.
 */
function standardDecoratorTransform(): esbuild.Plugin {
	return {
		name: 'radiant-ui:standard-decorators',
		setup(build) {
			build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
				if (!args.path.startsWith(`${SRC}${path.sep}`)) {
					return null;
				}

				const loader = path.extname(args.path) === '.tsx' ? 'tsx' : 'ts';
				const transpiled = await esbuild.transform(readFileSync(args.path, 'utf8'), {
					loader,
					jsx: 'automatic',
					jsxImportSource: '@ecopages/jsx',
					target: 'esnext',
					tsconfigRaw: {
						compilerOptions: {
							experimentalDecorators: false,
						},
					},
				});
				const transformed = await transformAsync(transpiled.code, {
					babelrc: false,
					configFile: false,
					filename: args.path,
					plugins: [[decorators, { version: '2023-11' }]],
				});

				return {
					contents: transformed?.code ?? transpiled.code,
					loader: 'js',
				};
			});
		},
	};
}

try {
	await esbuild.build({
		absWorkingDir: ROOT,
		alias: {
			'@': SRC,
		},
		bundle: true,
		entryPoints: [
			path.join(SRC, 'index.ts'),
			path.join(SRC, 'aria.ts'),
			path.join(SRC, 'cx.ts'),
			...listComponentEntries(),
		],
		external: externalPackages,
		format: 'esm',
		jsx: 'automatic',
		jsxImportSource: '@ecopages/jsx',
		logLevel: 'silent',
		minify: true,
		outbase: SRC,
		outdir: DIST,
		platform: 'browser',
		plugins: [standardDecoratorTransform()],
		sourcemap: true,
	});
} catch (error) {
	console.error('[radiant-ui]', error);
	process.exitCode = 1;
}
