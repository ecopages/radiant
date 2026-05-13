import { copyFile, readFileSync } from 'node:fs';
import path from 'node:path';

type PackageJsonExport = string | { import?: string; types?: string };

type PackageJsonShape = {
	name: string;
	version: string;
	license: string;
	description?: string;
	repository?: {
		type: string;
		url: string;
		directory?: string;
	};
	homepage?: string;
	bugs?: { url: string };
	author?: string;
	main?: string;
	module?: string;
	types?: string;
	type?: string;
	publishConfig?: { access?: string; directory?: string };
	sideEffects?: boolean | string[];
	keywords?: string[];
	files?: string[];
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
		description: packageJson.description,
		repository: packageJson.repository,
		homepage: packageJson.homepage,
		bugs: packageJson.bugs,
		author: packageJson.author,
		license: packageJson.license,
		main: packageJson.main ? stripDistPrefix(packageJson.main) : undefined,
		module: packageJson.module ? stripDistPrefix(packageJson.module) : undefined,
		types: packageJson.types ? stripDistPrefix(packageJson.types) : undefined,
		type: packageJson.type,
		publishConfig: packageJson.publishConfig?.access ? { access: packageJson.publishConfig.access } : undefined,
		sideEffects: packageJson.sideEffects,
		files: ['**/*'],
		keywords: packageJson.keywords,
		exports: packageJson.exports
			? Object.fromEntries(Object.entries(packageJson.exports).map(([key, value]) => [key, rewriteExport(value)]))
			: undefined,
		peerDependencies: packageJson.peerDependencies,
	};
}

const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
	entrypoints: ['index.ts'],
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'browser',
});

if (!build.success) {
	for (const log of build.logs) {
		console.log('[@ecopages/signals]', log);
	}

	process.exitCode = 1;
}

if (build.success) {
	copyFile(path.join(import.meta.dir, 'LICENSE'), path.join(import.meta.dir, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/signals]', error);
		process.exitCode = 1;
	});

	copyFile(path.join(import.meta.dir, 'README.md'), path.join(import.meta.dir, 'dist', 'README.md'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/signals]', error);
		process.exitCode = 1;
	});

	await Bun.write(
		path.join(import.meta.dir, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);
}
