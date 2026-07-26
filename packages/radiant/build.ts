/**
 * `@ecopages/radiant` dist build (esbuild only).
 *
 * **Hard boundary (asymmetric):** Server code must never ship in client bundles. Client
 * and shared core code may be pulled into server bundles — that is expected for SSR.
 * Enforcement: `deriveEntrypoints` sends only `src/server/*` (and explicit server export
 * paths) through the Node build; browser entrypoints never start from `server/`. The root
 * barrel (`src/index.ts`) is browser-only and does not re-export server modules.
 *
 * **Browser (one esbuild invocation):** Root barrel plus every non-server export subpath.
 * Each entry is a self-contained bundle (`splitting: false`); server chunks stay separate.
 *
 * **Server (one esbuild invocation, `splitting: true`):** All `server/*` entrypoints share
 * chunks so module-local SSR state stays a single instance.
 *
 * **Platform split:** Browser builds use `platform: 'browser'`; server builds use
 * `platform: 'node'` with `@ecopages/jsx` / `@ecopages/signals` external.
 */
import { copyFile, readFileSync, watch, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import { deriveEntrypoints } from './scripts/derive-entrypoints.js';

type PackageJsonExport = string | { import?: string; types?: string };

type PackageJsonShape = {
	name: string;
	version: string;
	repository?: {
		type: string;
		url: string;
	};
	author?: string;
	license: string;
	type?: string;
	main?: string;
	module?: string;
	types?: string;
	publishConfig?: { access?: string; directory?: string };
	files?: string[];
	sideEffects?: boolean | string[];
	exports?: Record<string, PackageJsonExport>;
	peerDependencies?: Record<string, string>;
};

function stripDistPrefix(value: string): string {
	if (value.startsWith('./dist/')) {
		return `./${value.slice('./dist/'.length)}`;
	}

	if (value.startsWith('dist/')) {
		return `./${value.slice('dist/'.length)}`;
	}

	return value;
}

function rewriteExport(value: PackageJsonExport): PackageJsonExport {
	if (typeof value === 'string') {
		return stripDistPrefix(value);
	}

	return {
		...(value.types ? { types: stripDistPrefix(value.types) } : {}),
		...(value.import ? { import: stripDistPrefix(value.import) } : {}),
	};
}

function createDistPackageJson(): PackageJsonShape {
	const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as PackageJsonShape;

	return {
		name: packageJson.name,
		version: packageJson.version,
		repository: packageJson.repository,
		author: packageJson.author,
		license: packageJson.license,
		type: packageJson.type,
		publishConfig: packageJson.publishConfig?.access ? { access: packageJson.publishConfig.access } : undefined,
		main: packageJson.main ? stripDistPrefix(packageJson.main) : undefined,
		module: packageJson.module ? stripDistPrefix(packageJson.module) : undefined,
		types: packageJson.types ? stripDistPrefix(packageJson.types) : undefined,
		files: ['**/*'],
		sideEffects: rewriteSideEffects(packageJson.sideEffects),
		exports: packageJson.exports
			? Object.fromEntries(Object.entries(packageJson.exports).map(([key, value]) => [key, rewriteExport(value)]))
			: undefined,
		peerDependencies: packageJson.peerDependencies,
	};
}

function rewriteSideEffects(value: PackageJsonShape['sideEffects']): PackageJsonShape['sideEffects'] {
	if (!Array.isArray(value)) {
		return value;
	}

	return value.map((entry) => stripDistPrefix(entry));
}

function runPackageScript(script: string): void {
	const result = spawnSync('pnpm', ['run', script], {
		cwd: packageRoot,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const packageRoot = import.meta.dirname;
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as PackageJsonShape;

if (!packageJson.exports) {
	throw new Error('[@ecopages/radiant] package.json must define exports for the dist build.');
}

const { browserSubpathEntrypoints, serverEntrypoints } = deriveEntrypoints(packageRoot, packageJson.exports);

const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*', '@ecopages/signals', '@ecopages/signals/*'];
const watchMode = process.argv.includes('--watch');
const minify = !watchMode;

async function runEsbuild(label: string, options: esbuild.BuildOptions): Promise<boolean> {
	try {
		await esbuild.build({
			absWorkingDir: packageRoot,
			bundle: true,
			format: 'esm',
			logLevel: 'silent',
			minify,
			sourcemap: true,
			...options,
		});

		return true;
	} catch (error) {
		console.log(`[@ecopages/radiant] ${label}`, error);
		process.exitCode = 1;

		return false;
	}
}

async function buildBrowserEntrypoints(): Promise<boolean> {
	const entryPoints = [
		path.join(packageRoot, 'src/index.ts'),
		...browserSubpathEntrypoints.map((entry) => path.join(packageRoot, entry)),
	];

	return runEsbuild('browser build', {
		entryPoints,
		external: externalPackages,
		outbase: path.join(packageRoot, 'src'),
		outdir: path.join(packageRoot, 'dist'),
		platform: 'browser',
	});
}

async function buildServerEntrypoints(): Promise<boolean> {
	if (serverEntrypoints.length === 0) {
		return true;
	}

	return runEsbuild('server build', {
		entryPoints: serverEntrypoints.map((entry) => path.join(packageRoot, entry)),
		external: [...externalPackages, 'node:async_hooks'],
		outbase: path.join(packageRoot, 'src'),
		outdir: path.join(packageRoot, 'dist'),
		platform: 'node',
		splitting: true,
	});
}

function runVerifyExports(): void {
	const verifyIndexScript = path.join(packageRoot, 'scripts', 'verify-dist-exports.ts');
	const verifyServerScript = path.join(packageRoot, 'scripts', 'verify-server-shared-chunks.ts');

	for (const verifyScript of [verifyIndexScript, verifyServerScript]) {
		const result = spawnSync(process.execPath, ['--import', 'tsx', verifyScript], {
			cwd: packageRoot,
			stdio: 'inherit',
		});

		if (result.status !== 0) {
			process.exit(result.status ?? 1);
		}
	}
}

const browserOk = await buildBrowserEntrypoints();
const serverOk = await buildServerEntrypoints();

if (browserOk && serverOk) {
	runVerifyExports();

	copyFile(path.join(packageRoot, 'LICENSE'), path.join(packageRoot, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/radiant]', error);
		process.exitCode = 1;
	});

	copyFile(path.join(packageRoot, 'README.md'), path.join(packageRoot, 'dist', 'README.md'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/radiant]', error);
		process.exitCode = 1;
	});

	writeFileSync(
		path.join(packageRoot, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);
}

if (watchMode) {
	console.log('Watching for changes...');
	const watcher = watch(path.resolve(packageRoot, 'src'), { recursive: true }, () => {
		runPackageScript('build:lib');
	});

	process.on('SIGINT', () => {
		console.log('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
