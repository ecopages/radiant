import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsx } from '../jsx-runtime.ts';
import { renderToString } from '../server-render.ts';
import { createBenchmarkProps, RealWorldPage } from './realworld-page.tsx';

type MitataStats = {
	/** nanoseconds */
	avg: number;
	/** nanoseconds */
	min: number;
	/** nanoseconds */
	max: number;
	/** nanoseconds */
	p75: number;
	/** nanoseconds */
	p99: number;
};

type MitataBenchmarkEntry = {
	alias: string;
	baseline: boolean;
	runs: Array<{ stats: MitataStats }>;
};

type MitataResult = {
	context: {
		runtime: string;
		version: string;
	};
	benchmarks: MitataBenchmarkEntry[];
};

const BENCHMARK_NAMES = ['renderToString', 'renderToString hydrate'] as const;

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

console.log('\nComparison (avg / p75, in µs)');
console.log('Lower avgUs is better.');
console.log('');

const rows = BENCHMARK_NAMES.map((name) => {
	const bunStats = getStats(bunResult, name);
	const nodeStats = getStats(nodeResult, name);
	const bunAvgUs = bunStats.avg / 1_000;
	const nodeAvgUs = nodeStats.avg / 1_000;

	return {
		benchmark: name,
		bun: `${bunAvgUs.toFixed(0)} / ${(bunStats.p75 / 1_000).toFixed(0)}`,
		node: `${nodeAvgUs.toFixed(0)} / ${(nodeStats.p75 / 1_000).toFixed(0)}`,
		delta: formatDelta(bunAvgUs, nodeAvgUs),
	};
});

printTable(rows);

function getStats(result: MitataResult, name: string): MitataStats {
	const entry = result.benchmarks.find((b) => b.alias === name);

	if (!entry?.runs?.[0]?.stats) {
		throw new Error(`missing benchmark stats for '${name}' in ${result.context.runtime} ${result.context.version}`);
	}

	return entry.runs[0].stats;
}

function formatDelta(bunAvgUs: number, nodeAvgUs: number): string {
	if (bunAvgUs === nodeAvgUs) return 'same';

	if (bunAvgUs < nodeAvgUs) {
		return `Bun ${(nodeAvgUs / bunAvgUs).toFixed(2)}x`;
	}

	return `Node ${(bunAvgUs / nodeAvgUs).toFixed(2)}x`;
}

function printTable(rows: Array<{ benchmark: string; bun: string; node: string; delta: string }>): void {
	const headers = {
		benchmark: 'benchmark',
		bun: 'bun avg/p75',
		node: 'node avg/p75',
		delta: 'delta',
	};

	const benchmarkWidth = Math.max(headers.benchmark.length, ...rows.map((row) => row.benchmark.length));
	const bunWidth = Math.max(headers.bun.length, ...rows.map((row) => row.bun.length));
	const nodeWidth = Math.max(headers.node.length, ...rows.map((row) => row.node.length));

	const formatRow = (columns: [string, string, string, string]) =>
		[
			columns[0].padEnd(benchmarkWidth),
			columns[1].padStart(bunWidth),
			columns[2].padStart(nodeWidth),
			columns[3],
		].join('  ');

	console.log(formatRow([headers.benchmark, headers.bun, headers.node, headers.delta]));
	console.log(
		formatRow([
			'-'.repeat(benchmarkWidth),
			'-'.repeat(bunWidth),
			'-'.repeat(nodeWidth),
			'-'.repeat(headers.delta.length),
		]),
	);

	for (const row of rows) {
		console.log(formatRow([row.benchmark, row.bun, row.node, row.delta]));
	}
}

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
