/**
 * Post-build check: every JavaScript `exports` target and every listed `sideEffects` file exists in `dist`.
 *
 * @remarks Declarations are emitted later by `build:types` and checked by `test:declarations`.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type ExportValue = string | { [condition: string]: ExportValue };

const distRoot = path.join(import.meta.dirname, '..', 'dist');
const distPackageJson = JSON.parse(readFileSync(path.join(distRoot, 'package.json'), 'utf8')) as {
	exports?: Record<string, ExportValue>;
	sideEffects?: boolean | string[];
};

function targets(value: ExportValue): string[] {
	return typeof value === 'string' ? [value] : Object.values(value).flatMap(targets);
}

const files = [
	...Object.values(distPackageJson.exports ?? {})
		.flatMap(targets)
		.filter((file) => file.endsWith('.js')),
	...(Array.isArray(distPackageJson.sideEffects) ? distPackageJson.sideEffects : []).filter(
		(entry) => !entry.includes('*'),
	),
];
const missing = [...new Set(files)].filter((file) => !existsSync(path.join(distRoot, file)));

if (missing.length > 0) {
	console.error(`[@ecopages/radiant] dist verification: missing ${missing.join(', ')}.`);
	process.exit(1);
}
