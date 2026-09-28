import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsx } from '../src/jsx-runtime.ts';
import { renderToString } from '../src/ssr/server-render.ts';
import { printComparisonReport, type MitataResult } from './report.ts';
import { createBenchmarkProps, RealWorldPage } from './realworld-page.tsx';

const ssrScriptPath = fileURLToPath(new URL('./ssr.ts', import.meta.url));
const packageRoot = dirname(dirname(ssrScriptPath));
const benchmarkProps = createBenchmarkProps();
const warmHtml = renderToString(jsx(RealWorldPage, benchmarkProps));

console.log(`RealWorldPage output size: ${(warmHtml.length / 1024).toFixed(1)} KiB`);
console.log(
	'renderToString hydrate includes Radiant SSR markers — treat it as an internal regression signal, not a baseline-comparable number.',
);
const bunResult = runBenchmark('bun', ['run', ssrScriptPath]);
const nodeResult = runBenchmark('node', ['--import', 'tsx', ssrScriptPath]);

printComparisonReport(bunResult, nodeResult);

function runBenchmark(command: string, args: string[]): MitataResult {
	const jsonOut = join(tmpdir(), `bench-ssr-${command}-${Date.now()}.json`);

	const result = spawnSync(command, [...args], {
		cwd: packageRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'inherit', 'inherit'],
		env: {
			...process.env,
			BENCH_JSON_OUT: jsonOut,
			BENCH_FORMAT: 'quiet',
			BENCH_SUPPRESS_PREAMBLE: '1',
		},
	});

	if (result.status !== 0) {
		throw new Error(`${command} benchmark failed (exit ${result.status})`);
	}

	try {
		const json = readFileSync(jsonOut, 'utf8');
		return JSON.parse(json) as MitataResult;
	} finally {
		try {
			rmSync(jsonOut);
		} catch {
			/* ignore */
		}
	}
}
