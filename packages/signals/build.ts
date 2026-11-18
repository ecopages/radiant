import { copyFile, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'rolldown';

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
	const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as PackageJsonShape;

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

const packageRoot = import.meta.dirname;
const watchMode = process.argv.includes('--watch');

let buildOk = false;

/**
 * @remarks
 * One output file per source module, so the app's bundler drops whole unused modules under `sideEffects: false`
 * instead of guessing statement by statement inside one pre-bundled file. Rolldown's minifier keeps the
 * `@__PURE__` annotations that the remaining statement-level tree-shaking relies on.
 */
try {
	await build({
		cwd: packageRoot,
		input: { index: path.join(packageRoot, 'index.ts') },
		platform: 'neutral',
		logLevel: 'warn',
		optimization: { inlineConst: false },
		external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
		output: {
			dir: path.join(packageRoot, 'dist'),
			format: 'esm',
			preserveModules: true,
			preserveModulesRoot: packageRoot,
			entryFileNames: '[name].js',
			minify: !watchMode,
			sourcemap: true,
		},
	});
	buildOk = true;
} catch (error) {
	console.log('[@ecopages/signals]', error);
	process.exitCode = 1;
}

if (buildOk) {
	copyFile(path.join(packageRoot, 'LICENSE'), path.join(packageRoot, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/signals]', error);
		process.exitCode = 1;
	});

	copyFile(path.join(packageRoot, 'README.md'), path.join(packageRoot, 'dist', 'README.md'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/signals]', error);
		process.exitCode = 1;
	});

	writeFileSync(
		path.join(packageRoot, 'dist', 'package.json'),
		`${JSON.stringify(createDistPackageJson(), null, '\t')}\n`,
	);
}

if (watchMode) {
	console.warn('[@ecopages/signals] --watch is not implemented for the build yet.');
}
