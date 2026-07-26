import { copyFile, readFileSync } from 'node:fs';
import path from 'node:path';

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
	type?: string;
	publishConfig?: { access?: string; directory?: string };
	sideEffects?: boolean | string[];
	keywords?: string[];
	peerDependencies?: Record<string, string>;
	main?: string;
	module?: string;
	types?: string;
	files?: string[];
	exports?: Record<string, { types?: string; import?: string } | string>;
};

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
		type: packageJson.type,
		publishConfig: packageJson.publishConfig?.access ? { access: packageJson.publishConfig.access } : undefined,
		sideEffects: packageJson.sideEffects,
		keywords: packageJson.keywords,
		peerDependencies: packageJson.peerDependencies,
		main: './index.js',
		module: './index.js',
		types: './index.d.ts',
		files: ['**/*'],
		exports: {
			'.': {
				types: './index.d.ts',
				import: './index.js',
			},
			'./package.json': './package.json',
		},
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
