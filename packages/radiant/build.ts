import { copyFile, readFileSync, watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';

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
	const packageJson = JSON.parse(
		readFileSync(path.join(import.meta.dir, 'package.json'), 'utf8'),
	) as PackageJsonShape;

	return {
		name: packageJson.name,
		version: packageJson.version,
		repository: packageJson.repository,
		author: packageJson.author,
		license: packageJson.license,
		type: packageJson.type,
		main: packageJson.main ? stripDistPrefix(packageJson.main) : undefined,
		module: packageJson.module ? stripDistPrefix(packageJson.module) : undefined,
		types: packageJson.types ? stripDistPrefix(packageJson.types) : undefined,
		files: ['**/*'],
		sideEffects: packageJson.sideEffects,
		exports: packageJson.exports
			? Object.fromEntries(Object.entries(packageJson.exports).map(([key, value]) => [key, rewriteExport(value)]))
			: undefined,
		peerDependencies: packageJson.peerDependencies,
	};
}

const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*', '@ecopages/signals', '@ecopages/signals/*'];

const glob = new Bun.Glob('src/**/*.ts');
const files = await Array.fromAsync(glob.scan({ cwd: '.' }));

const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
	entrypoints: files,
	outdir: 'dist',
	root: './src',
	target: 'browser',
	minify: !watchMode,
	format: 'esm',
	external: externalPackages,
	sourcemap: 'external',
});

if (!build.success) {
	for (const log of build.logs) {
		console.log('[@ecopages/radiant]', log);
	}
}

if (build.success) {
	copyFile(path.join(import.meta.dir, 'LICENSE'), path.join(import.meta.dir, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/radiant]', error);
		process.exitCode = 1;
	});

	await Bun.write(
		path.join(import.meta.dir, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);
}

if (process.argv.includes('--watch')) {
	console.log('Watching for changes...');
	const watcher = watch(path.resolve(__dirname, 'src'), { recursive: true }, async () => {
		await $`bun run build:lib`;
	});

	process.on('SIGINT', () => {
		console.log('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
