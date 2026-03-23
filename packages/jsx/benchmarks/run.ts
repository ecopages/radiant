import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log('\n=== Bun ===');
const bunResult = runBenchmark('bun', ['run', ssrScriptPath]);

console.log('\n=== Node ===');
const nodeResult = runBenchmark('node', ['--import', 'tsx', ssrScriptPath]);

console.log('\n=== Comparison (avg / p75, in µs) ===');
console.table(
	BENCHMARK_NAMES.map((name) => {
		const bunStats = getStats(bunResult, name);
		const nodeStats = getStats(nodeResult, name);
		const bunAvgUs = bunStats.avg / 1_000;
		const nodeAvgUs = nodeStats.avg / 1_000;

		return {
			benchmark: name,
			bunAvgUs: bunAvgUs.toFixed(0),
			nodeAvgUs: nodeAvgUs.toFixed(0),
			bunP75Us: (bunStats.p75 / 1_000).toFixed(0),
			nodeP75Us: (nodeStats.p75 / 1_000).toFixed(0),
			winner: getWinner(bunAvgUs, nodeAvgUs),
			delta: formatDelta(bunAvgUs, nodeAvgUs),
		};
	}),
);

function getStats(result: MitataResult, name: string): MitataStats {
	const entry = result.benchmarks.find((b) => b.alias === name);

	if (!entry?.runs?.[0]?.stats) {
		throw new Error(`missing benchmark stats for '${name}' in ${result.context.runtime} ${result.context.version}`);
	}

	return entry.runs[0].stats;
}

function getWinner(bunAvgUs: number, nodeAvgUs: number): string {
	if (bunAvgUs === nodeAvgUs) return 'tie';
	return bunAvgUs < nodeAvgUs ? 'Bun' : 'Node';
}

function formatDelta(bunAvgUs: number, nodeAvgUs: number): string {
	if (bunAvgUs === nodeAvgUs) return 'same';

	if (bunAvgUs < nodeAvgUs) {
		const pct = (((nodeAvgUs - bunAvgUs) / nodeAvgUs) * 100).toFixed(1);
		return `Bun ${(nodeAvgUs / bunAvgUs).toFixed(2)}x faster (${pct}% less)`;
	}

	const pct = (((bunAvgUs - nodeAvgUs) / bunAvgUs) * 100).toFixed(1);
	return `Node ${(bunAvgUs / nodeAvgUs).toFixed(2)}x faster (${pct}% less)`;
}

function runBenchmark(command: string, args: string[]): MitataResult {
	const jsonOut = join(tmpdir(), `bench-ssr-${command}-${Date.now()}.json`);

	const result = spawnSync(command, [...args], {
		cwd: packageRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'inherit', 'inherit'],
		env: { ...process.env, BENCH_JSON_OUT: jsonOut },
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
