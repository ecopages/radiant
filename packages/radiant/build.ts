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

/**
 * Bun's multi-entrypoint minify drops cross-entrypoint value re-exports from
 * `index.js` (emitting `H3 as createResource` with no local `H3`). Rewrite those
 * exports to a real `./signals/host-resource.js` re-export so the root entry stays
 * a single import path for docs/app bundlers.
 */
async function fixIndexHostResourceReexports(): Promise<void> {
	const indexPath = path.join(import.meta.dir, 'dist', 'index.js');
	const source = readFileSync(indexPath, 'utf8');

	if (source.includes('from"./signals/host-resource.js"') || source.includes("from'./signals/host-resource.js'")) {
		return;
	}

	const withoutBrokenExports = source
		.replace(/,?\w+ as createResource/g, '')
		.replace(/,?\w+ as createHostResource/g, '')
		.replace(/,?\w+ as HostResource(?=[,}])/g, '');

	const patched = `${withoutBrokenExports}\nexport{createResource,createHostResource,HostResource}from"./signals/host-resource.js";\n`;
	await Bun.write(indexPath, patched);
}

const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*', '@ecopages/signals', '@ecopages/signals/*'];

const glob = new Bun.Glob('src/**/*.ts');
const files = await Array.fromAsync(glob.scan({ cwd: '.' }));
const serverFiles = files.filter((file) => file.startsWith('src/server/') || file.includes('/server/'));
const browserFiles = files.filter((file) => !serverFiles.includes(file));

const watchMode = process.argv.includes('--watch');

const browserBuild = await Bun.build({
	entrypoints: browserFiles,
	outdir: 'dist',
	root: './src',
	target: 'browser',
	minify: !watchMode,
	format: 'esm',
	external: externalPackages,
	sourcemap: 'external',
});

const serverBuild = await Bun.build({
	entrypoints: serverFiles,
	outdir: 'dist',
	root: './src',
	target: 'node',
	minify: !watchMode,
	format: 'esm',
	external: [...externalPackages, 'node:async_hooks'],
	sourcemap: 'external',
});

for (const build of [browserBuild, serverBuild]) {
	if (build.success) {
		continue;
	}

	for (const log of build.logs) {
		console.log('[@ecopages/radiant]', log);
	}

	process.exitCode = 1;
}

if (browserBuild.success && serverBuild.success) {
	await fixIndexHostResourceReexports();

	copyFile(path.join(import.meta.dir, 'LICENSE'), path.join(import.meta.dir, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/radiant]', error);
		process.exitCode = 1;
	});

	copyFile(path.join(import.meta.dir, 'README.md'), path.join(import.meta.dir, 'dist', 'README.md'), (error) => {
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
