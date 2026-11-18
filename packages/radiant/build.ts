/**
 * `@ecopages/radiant` dist build (Rolldown).
 *
 * **One output file per source module** (Rolldown `preserveModules`): the `exports` targets are the inputs, and every
 * module they reach is emitted once, at the path that mirrors its source. The root barrel, subpaths and server
 * entries share each module, which keeps module-local state, such as SSR registries, a single instance, and lets
 * the app's bundler drop whole unused modules under `sideEffects`.
 *
 * **Hard boundary (asymmetric):** server code must never ship in client bundles. A module outside `src/server/`
 * that imports one inside it fails the build (see `serverBoundary`). Server modules may import client and core modules; that is
 * expected for SSR.
 *
 * **Development warnings:** `process.env.NODE_ENV` stays in the dist, so the app's bundler,
 * not this build, decides whether development warnings ship (see `buildModules`).
 */
import { copyFile, readFileSync, watch, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build, type Plugin } from 'rolldown';

type PackageJsonExport = string | { [condition: string]: PackageJsonExport };

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

/**
 * @remarks
 * Conditions match in key order, so the source order is part of the contract: a runtime
 * condition such as `node` must stay ahead of `import`, or Node resolves the `import` target.
 */
function rewriteExport(value: PackageJsonExport): PackageJsonExport {
	if (typeof value === 'string') {
		return stripDistPrefix(value);
	}

	return Object.fromEntries(Object.entries(value).map(([condition, target]) => [condition, rewriteExport(target)]));
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

const watchMode = process.argv.includes('--watch');
const sourceRoot = path.join(packageRoot, 'src');
const serverRoot = path.join(sourceRoot, 'server');
const installHydratorModule = path.join(sourceRoot, 'client', 'install-hydrator.ts');

function exportTargets(value: PackageJsonExport): string[] {
	return typeof value === 'string' ? [value] : Object.values(value).flatMap(exportTargets);
}

/** Every JavaScript `exports` target, mapped from `./dist/<name>.js` to its source module. */
function exportInputs(): Record<string, string> {
	const targets = Object.values(packageJson.exports ?? {})
		.flatMap(exportTargets)
		.filter((target) => target.startsWith('./dist/') && target.endsWith('.js'));

	return Object.fromEntries(
		targets.map((target) => {
			const name = target.slice('./dist/'.length, -'.js'.length);
			return [name, path.join(sourceRoot, `${name}.ts`)];
		}),
	);
}

/** Fails the build when a module outside `src/server/` imports one inside it. */
function serverBoundary(): Plugin {
	return {
		name: 'radiant:server-boundary',
		generateBundle() {
			for (const id of this.getModuleIds()) {
				if (id.startsWith(serverRoot)) continue;

				const serverImport = this.getModuleInfo(id)?.importedIds.find((imported) => imported.startsWith(serverRoot));

				if (serverImport) {
					this.error(
						`${path.relative(packageRoot, id)} imports server module ${path.relative(packageRoot, serverImport)}: server code must not ship in client bundles.`,
					);
				}
			}
		},
	};
}

/**
 * @remarks
 * `process.env.NODE_ENV` is left as written, so the app's bundler, not this build, decides whether development
 * warnings ship. Rolldown's minifier keeps the `@__PURE__` annotations that the remaining statement-level
 * tree-shaking relies on. Server modules and the hydrator installer run code on import, so they are the only
 * internal modules marked as having side effects, here and in `package.json`.
 */
async function buildModules(): Promise<boolean> {
	try {
		await build({
			cwd: packageRoot,
			input: exportInputs(),
			platform: 'neutral',
			logLevel: 'warn',
			optimization: { inlineConst: false },
			external: (id) => !id.startsWith('.') && !id.startsWith('@/') && !path.isAbsolute(id),
			resolve: { alias: { '@': sourceRoot } },
			treeshake: {
				moduleSideEffects: (id, external) => external || id.startsWith(serverRoot) || id === installHydratorModule,
			},
			plugins: [serverBoundary()],
			output: {
				dir: path.join(packageRoot, 'dist'),
				format: 'esm',
				preserveModules: true,
				preserveModulesRoot: sourceRoot,
				entryFileNames: '[name].js',
				minify: !watchMode,
				sourcemap: true,
			},
		});

		return true;
	} catch (error) {
		console.log('[@ecopages/radiant] build', error);
		process.exitCode = 1;

		return false;
	}
}

/**
 * @remarks
 * Runs after `dist/package.json` is written, because the verifier resolves exports through it.
 */
function runVerifyExports(): void {
	const signalsBuild = spawnSync('pnpm', ['--filter', '@ecopages/signals', 'run', 'build:files'], {
		cwd: packageRoot,
		stdio: 'inherit',
	});

	if (signalsBuild.status !== 0) {
		process.exit(signalsBuild.status ?? 1);
	}

	const verifyIndexScript = path.join(packageRoot, 'scripts', 'verify-dist-exports.ts');
	const verifyModulesScript = path.join(packageRoot, 'scripts', 'verify-dist-modules.ts');

	for (const verifyScript of [verifyIndexScript, verifyModulesScript]) {
		const result = spawnSync(process.execPath, ['--import', 'tsx', verifyScript], {
			cwd: packageRoot,
			stdio: 'inherit',
		});

		if (result.status !== 0) {
			process.exit(result.status ?? 1);
		}
	}
}

if (await buildModules()) {
	writeFileSync(
		path.join(packageRoot, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);

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
