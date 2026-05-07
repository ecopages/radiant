import { copyFile, readFileSync, watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';

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
		readFileSync(path.join(import.meta.dir, 'package.json'), 'utf8'),
	) as PackageJsonShape;

	return {
		name: packageJson.name,
		version: packageJson.version,
		license: packageJson.license,
		main: packageJson.main ? stripDistPrefix(packageJson.main) : undefined,
		module: packageJson.module ? stripDistPrefix(packageJson.module) : undefined,
		types: packageJson.types ? stripDistPrefix(packageJson.types) : undefined,
		type: packageJson.type,
		files: ['**/*'],
		exports: packageJson.exports
			? Object.fromEntries(Object.entries(packageJson.exports).map(([key, value]) => [key, rewriteExport(value)]))
			: undefined,
		peerDependencies: packageJson.peerDependencies,
		sideEffects: packageJson.sideEffects,
	};
}

const watchMode = process.argv.includes('--watch');

const browserBuild = await Bun.build({
	entrypoints: [...prodBrowserEntrypoints, ...devBrowserEntrypoints],
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'browser',
});

const serverBuild = await Bun.build({
	entrypoints: serverEntrypoints,
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'node',
});

for (const build of [browserBuild, serverBuild]) {
	if (build.success) {
		continue;
	}

	for (const log of build.logs) {
		console.log('[@ecopages/jsx]', log);
	}

	process.exitCode = 1;
}

if (browserBuild.success && serverBuild.success) {
	copyFile(path.join(import.meta.dir, 'LICENSE'), path.join(import.meta.dir, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/jsx]', error);
		process.exitCode = 1;
	});

	await Bun.write(
		path.join(import.meta.dir, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);
}

if (watchMode) {
	console.log('Watching for changes...');
	const watcher = watch(path.resolve(import.meta.dir), async (_eventType, filename) => {
		const normalizedFilename = filename?.replaceAll(path.sep, '/');

		if (!normalizedFilename || !shouldRebuild(normalizedFilename)) {
			return;
		}

		await $`bun run build:lib`;
	});

	process.on('SIGINT', () => {
		console.log('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
