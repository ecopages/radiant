import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const indexPath = path.join(import.meta.dirname, '..', 'dist', 'index.js');
const distRoot = path.join(import.meta.dirname, '..', 'dist');

const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*'];

try {
	await esbuild.build({
		absWorkingDir: path.join(import.meta.dirname, '..'),
		bundle: true,
		entryPoints: [indexPath],
		external: externalPackages,
		format: 'esm',
		logLevel: 'silent',
		platform: 'browser',
		write: false,
	});
} catch (error) {
	console.error('[@ecopages/radiant] dist/index.js failed export verification (esbuild bundle):');
	console.error(error);
	process.exit(1);
}

const RUNTIME_CONDITIONS = new Set(['node', 'deno', 'bun', 'workerd', 'edge-light', 'browser']);
const GENERIC_MODULE_CONDITIONS = new Set(['import', 'require']);

function findShadowedRuntimeConditions(exportPath: string, value: unknown): string[] {
	if (typeof value !== 'object' || value === null) {
		return [];
	}

	const keys = Object.keys(value);
	const problems: string[] = [];
	const firstGeneric = keys.findIndex((key) => GENERIC_MODULE_CONDITIONS.has(key));

	if (firstGeneric !== -1) {
		for (const key of keys.slice(firstGeneric + 1)) {
			if (RUNTIME_CONDITIONS.has(key)) {
				problems.push(`${exportPath}: "${key}" is listed after "${keys[firstGeneric]}" and can never match`);
			}
		}
	}

	for (const [key, nested] of Object.entries(value)) {
		problems.push(...findShadowedRuntimeConditions(`${exportPath} > ${key}`, nested));
	}

	return problems;
}

const distPackageJson = JSON.parse(readFileSync(path.join(distRoot, 'package.json'), 'utf8')) as {
	exports?: Record<string, unknown>;
};
const orderProblems = Object.entries(distPackageJson.exports ?? {}).flatMap(([exportPath, value]) =>
	findShadowedRuntimeConditions(exportPath, value),
);

if (orderProblems.length > 0) {
	console.error('[@ecopages/radiant] dist/package.json lists a generic condition before a runtime condition:');
	for (const problem of orderProblems) {
		console.error(`  ${problem}`);
	}
	process.exit(1);
}

/**
 * @remarks
 * Runs with `cwd` set to `dist` so the specifier resolves through `dist/package.json`
 * (package self-reference), the manifest that is published, instead of the source one.
 */
function readIsServerAsConsumer(nodeArgs: string[]): string {
	const result = spawnSync(
		process.execPath,
		[
			...nodeArgs,
			'--input-type=module',
			'-e',
			`import { isServer } from '@ecopages/radiant/is-server'; console.log(isServer);`,
		],
		{ cwd: distRoot, encoding: 'utf8' },
	);

	if (result.status !== 0) {
		console.error(result.stderr);
		return 'error';
	}

	return result.stdout.trim();
}

const nodeIsServer = readIsServerAsConsumer([]);
const browserIsServer = readIsServerAsConsumer(['--conditions=browser']);

if (nodeIsServer !== 'true' || browserIsServer !== 'false') {
	console.error(
		`[@ecopages/radiant] is-server conditional export verification failed (node: ${nodeIsServer}, browser: ${browserIsServer}).`,
	);
	process.exit(1);
}
