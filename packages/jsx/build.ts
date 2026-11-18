import { copyFile, readFileSync, watch, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'rolldown';


type PackageJsonExport = string | { import?: string; types?: string };

type PackageJsonShape = {
	name: string;
	version: string;
	license: string;
	repository?: {
		type: string;
		url: string;
		directory?: string;
	};
	main?: string;
	module?: string;
	types?: string;
	type?: string;
	publishConfig?: { access?: string; directory?: string };
	files?: string[];
	exports?: Record<string, PackageJsonExport>;
	peerDependencies?: Record<string, string>;
	sideEffects?: boolean | string[];
};

function shouldRebuild(filename: string): boolean {
	return (
		filename.endsWith('.ts') &&
		!filename.startsWith('benchmarks/') &&
		!filename.startsWith('dist/') &&
		!filename.startsWith('test/')
	);
}

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
		license: packageJson.license,
		repository: packageJson.repository,
		main: packageJson.main ? stripDistPrefix(packageJson.main) : undefined,
		module: packageJson.module ? stripDistPrefix(packageJson.module) : undefined,
		types: packageJson.types ? stripDistPrefix(packageJson.types) : undefined,
		type: packageJson.type,
		publishConfig: packageJson.publishConfig?.access ? { access: packageJson.publishConfig.access } : undefined,
		files: ['**/*'],
		exports: packageJson.exports
			? Object.fromEntries(Object.entries(packageJson.exports).map(([key, value]) => [key, rewriteExport(value)]))
			: undefined,
		peerDependencies: packageJson.peerDependencies,
		sideEffects: Array.isArray(packageJson.sideEffects)
			? packageJson.sideEffects.map(stripDistPrefix)
			: packageJson.sideEffects,
	};
}

const packageRoot = import.meta.dirname;
const watchMode = process.argv.includes('--watch');
const sourceRoot = path.join(packageRoot, 'src');
const entrypoints = ['index', 'client', 'server', 'jsx-runtime', 'jsx-dev-runtime'];
const sideEffectModules = new Set(['jsx-runtime', 'jsx-dev-runtime'].map((name) => path.join(sourceRoot, `${name}.ts`)));

/**
 * @remarks
 * One output file per source module, so the app's bundler drops whole unused modules under `sideEffects` instead
 * of guessing statement by statement inside one pre-bundled file. The runtime entries install the DOM renderer on
 * import, so they are the only modules marked as having side effects, here and in `package.json`. Rolldown's
 * minifier keeps the `@__PURE__` annotations that the remaining statement-level tree-shaking relies on.
 */
async function buildModules(): Promise<boolean> {
	try {
		await build({
			cwd: packageRoot,
			input: Object.fromEntries(entrypoints.map((name) => [name, path.join(sourceRoot, `${name}.ts`)])),
			platform: 'neutral',
			logLevel: 'warn',
			optimization: { inlineConst: false },
			external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
			treeshake: { moduleSideEffects: (id, external) => external || sideEffectModules.has(id) },
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
		console.log('[@ecopages/jsx]', error);
		process.exitCode = 1;

		return false;
	}
}

const buildOk = await buildModules();

if (buildOk) {
	copyFile(path.join(packageRoot, 'LICENSE'), path.join(packageRoot, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/jsx]', error);
		process.exitCode = 1;
	});

	copyFile(path.join(packageRoot, 'README.md'), path.join(packageRoot, 'dist', 'README.md'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/jsx]', error);
		process.exitCode = 1;
	});

	writeFileSync(
		path.join(packageRoot, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);
}

if (watchMode) {
	console.log('Watching for changes...');
	const watcher = watch(path.resolve(packageRoot), (_eventType, filename) => {
		const normalizedFilename = filename?.replaceAll(path.sep, '/');

		if (!normalizedFilename || !shouldRebuild(normalizedFilename)) {
			return;
		}

		spawnSync('pnpm', ['run', 'build:lib'], { cwd: packageRoot, stdio: 'inherit' });
	});

	process.on('SIGINT', () => {
		console.log('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
