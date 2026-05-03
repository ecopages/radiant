export type MitataStats = {
	/** nanoseconds */
	avg: number;
	/** nanoseconds */
	max: number;
	/** nanoseconds */
	min: number;
	/** nanoseconds */
	p75: number;
	/** nanoseconds */
	p99: number;
};

export type MitataBenchmarkEntry = {
	alias: string;
	baseline: boolean;
	runs: Array<{ stats: MitataStats }>;
};

export type MitataResult = {
	context: {
		runtime: string;
		version: string;
	};
	benchmarks: MitataBenchmarkEntry[];
};

export const BENCHMARK_NAMES = ['renderToString', 'renderToString hydrate'] as const;

export function getStats(result: MitataResult, name: string): MitataStats {
	const entry = result.benchmarks.find((benchmark) => benchmark.alias === name);

	if (!entry?.runs?.[0]?.stats) {
		throw new Error(`missing benchmark stats for '${name}' in ${result.context.runtime} ${result.context.version}`);
	}

	return entry.runs[0].stats;
}

export function printComparisonReport(bunResult: MitataResult, nodeResult: MitataResult): void {
	console.log('Individual runtime recap (µs per iteration)');
	printRuntimeRecap(bunResult);
	console.log('');
	printRuntimeRecap(nodeResult);

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
			delta: formatDelta(bunAvgUs, nodeAvgUs),
			node: `${nodeAvgUs.toFixed(0)} / ${(nodeStats.p75 / 1_000).toFixed(0)}`,
		};
	});

	printTable(rows);

	console.log('');
	console.log(
		'Metric guide: avg is the mean per iteration, min/max are the fastest and slowest observed iterations,',
	);
	console.log('p75 is the 75th-percentile latency, and p99 is the 99th-percentile tail latency.');
}

export function printRuntimeRecap(result: MitataResult): void {
	console.log(`${result.context.runtime} ${result.context.version}`);

	const rows = BENCHMARK_NAMES.map((name) => {
		const stats = getStats(result, name);

		return {
			avg: formatMicros(stats.avg),
			benchmark: name,
			max: formatMicros(stats.max),
			min: formatMicros(stats.min),
			p75: formatMicros(stats.p75),
			p99: formatMicros(stats.p99),
		};
	});

	printStatsTable(rows);
}

function formatDelta(bunAvgUs: number, nodeAvgUs: number): string {
	if (bunAvgUs === nodeAvgUs) return 'same';

	if (bunAvgUs < nodeAvgUs) {
		return `Bun ${(nodeAvgUs / bunAvgUs).toFixed(2)}x`;
	}

	return `Node ${(bunAvgUs / nodeAvgUs).toFixed(2)}x`;
}

function formatMicros(nanoseconds: number): string {
	return (nanoseconds / 1_000).toFixed(0);
}

function printTable(rows: Array<{ benchmark: string; bun: string; node: string; delta: string }>): void {
	const headers = {
		benchmark: 'benchmark',
		bun: 'bun avg/p75',
		delta: 'delta',
		node: 'node avg/p75',
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

function printStatsTable(
	rows: Array<{
		avg: string;
		benchmark: string;
		max: string;
		min: string;
		p75: string;
		p99: string;
	}>,
): void {
	const headers = {
		avg: 'avg',
		benchmark: 'benchmark',
		max: 'max',
		min: 'min',
		p75: 'p75',
		p99: 'p99',
	};

	const benchmarkWidth = Math.max(headers.benchmark.length, ...rows.map((row) => row.benchmark.length));
	const avgWidth = Math.max(headers.avg.length, ...rows.map((row) => row.avg.length));
	const minWidth = Math.max(headers.min.length, ...rows.map((row) => row.min.length));
	const p75Width = Math.max(headers.p75.length, ...rows.map((row) => row.p75.length));
	const p99Width = Math.max(headers.p99.length, ...rows.map((row) => row.p99.length));
	const maxWidth = Math.max(headers.max.length, ...rows.map((row) => row.max.length));

	const formatRow = (columns: [string, string, string, string, string, string]) =>
		[
			columns[0].padEnd(benchmarkWidth),
			columns[1].padStart(avgWidth),
			columns[2].padStart(minWidth),
			columns[3].padStart(p75Width),
			columns[4].padStart(p99Width),
			columns[5].padStart(maxWidth),
		].join('  ');

	console.log(formatRow([headers.benchmark, headers.avg, headers.min, headers.p75, headers.p99, headers.max]));
	console.log(
		formatRow([
			'-'.repeat(benchmarkWidth),
			'-'.repeat(avgWidth),
			'-'.repeat(minWidth),
			'-'.repeat(p75Width),
			'-'.repeat(p99Width),
			'-'.repeat(maxWidth),
		]),
	);

	for (const row of rows) {
		console.log(formatRow([row.benchmark, row.avg, row.min, row.p75, row.p99, row.max]));
	}
}
