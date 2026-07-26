import { copyFile, readFileSync, watch, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const prodBrowserEntrypoints = ['src/index.ts', 'src/client.ts', 'src/jsx-runtime.ts'];
const devBrowserEntrypoints = ['src/jsx-dev-runtime.ts'];
const serverEntrypoints = ['src/server.ts'];

type PackageJsonExport = string | { import?: string; types?: string };

type PackageJsonShape = {
	name: string;
	version: string;
	license: string;
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
	const packageJson = JSON.parse(
		readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
	) as PackageJsonShape;

	return {
		name: packageJson.name,
		version: packageJson.version,
		license: packageJson.license,
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
		sideEffects: packageJson.sideEffects,
	};
}

const packageRoot = import.meta.dirname;
const externalPackages: string[] = [];
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
		console.log('[@ecopages/jsx]', label, error);
		process.exitCode = 1;

		return false;
	}
}

const browserOk = await runEsbuild('browser build', {
	entryPoints: [...prodBrowserEntrypoints, ...devBrowserEntrypoints].map((entry) => path.join(packageRoot, entry)),
	external: externalPackages,
	outbase: path.join(packageRoot, 'src'),
	outdir: path.join(packageRoot, 'dist'),
	platform: 'browser',
});

const serverOk = await runEsbuild('server build', {
	entryPoints: serverEntrypoints.map((entry) => path.join(packageRoot, entry)),
	external: externalPackages,
	outbase: path.join(packageRoot, 'src'),
	outdir: path.join(packageRoot, 'dist'),
	platform: 'node',
});

if (browserOk && serverOk) {
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
