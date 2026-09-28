import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printComparisonReport, type MitataResult } from './report.ts';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const bunResult = runSection('Bun (Mitata)', 'bun', ['run', 'benchmarks/ssr.ts']);
const nodeResult = runSection('Node (Mitata)', 'node', ['--import', 'tsx', 'benchmarks/ssr.ts']);

console.log('\n=== Cross-runtime comparison ===\n');
printComparisonReport(bunResult, nodeResult);

function runSection(title: string, command: string, args: string[]): MitataResult {
	console.log(`\n=== ${title} ===\n`);
	const jsonOut = join(tmpdir(), `bench-ssr-${command}-${Date.now()}.json`);

	const result = spawnSync(command, args, {
		cwd: packageRoot,
		encoding: 'utf8',
		stdio: 'inherit',
		env: {
			...process.env,
			BENCH_JSON_OUT: jsonOut,
		},
	});

	if (result.status !== 0) {
		throw new Error(`${title} failed (exit ${result.status ?? 'unknown'})`);
	}

	try {
		return JSON.parse(readFileSync(jsonOut, 'utf8')) as MitataResult;
	} finally {
		try {
			rmSync(jsonOut);
		} catch {
			/* ignore */
		}
	}
}
