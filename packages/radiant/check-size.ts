import path from 'node:path';
import { styleText } from 'node:util';
import { gzipSync } from 'node:zlib';
import { $ } from 'bun';

type BundleBudget = {
	control?: 'strict' | 'advisory';
	entrypoint: string;
	external?: string[];
	label: string;
	maxBytes: number;
	maxGzipBytes: number;
};

type SizeBudgetFile = {
	bundles: BundleBudget[];
};

type SizeResult = {
	bytes: number;
	control: 'strict' | 'advisory';
	entrypoint: string;
	gzipBytes: number;
	label: string;
	maxBytes: number;
	maxGzipBytes: number;
	withinBudget: boolean;
};

const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*', '@ecopages/signals', '@ecopages/signals/*'];

const reportOnly = process.argv.includes('--report-only');
const budgetPath = path.resolve(import.meta.dir, 'size-budget.json');
const budgetFile = (await Bun.file(budgetPath).json()) as SizeBudgetFile;
const outputRoot = path.resolve(import.meta.dir, '.tmp-size-audit');

await $`rm -rf ${outputRoot}`;

const results: SizeResult[] = [];

for (const bundle of budgetFile.bundles) {
	const bundleDir = path.join(outputRoot, bundle.label);
	const build = await Bun.build({
		entrypoints: [path.resolve(import.meta.dir, bundle.entrypoint)],
		external: [...externalPackages, ...(bundle.external ?? [])],
		format: 'esm',
		minify: true,
		outdir: bundleDir,
		target: 'browser',
	});

	if (!build.success) {
		for (const log of build.logs) {
			console.error('[size-audit]', log);
		}

		process.exit(1);
	}

	const outputFile = build.outputs.find((output) => output.path.endsWith('.js'));

	if (!outputFile) {
		console.error(`[size-audit] No JavaScript output generated for ${bundle.label}.`);
		process.exit(1);
	}

	const bytes = Buffer.from(await Bun.file(outputFile.path).arrayBuffer());
	const gzipBytes = gzipSync(bytes).length;
	const control = bundle.control ?? 'strict';

	results.push({
		bytes: bytes.length,
		control,
		entrypoint: bundle.entrypoint,
		gzipBytes,
		label: bundle.label,
		maxBytes: bundle.maxBytes,
		maxGzipBytes: bundle.maxGzipBytes,
		withinBudget: bytes.length <= bundle.maxBytes && gzipBytes <= bundle.maxGzipBytes,
	});
}

await $`rm -rf ${outputRoot}`;

console.log('Bundle size audit (minified browser bundles)');

for (const result of results) {
	const rawKb = (result.bytes / 1024).toFixed(2);
	const gzipKb = (result.gzipBytes / 1024).toFixed(2);
	const rawBudgetKb = (result.maxBytes / 1024).toFixed(2);
	const gzipBudgetKb = (result.maxGzipBytes / 1024).toFixed(2);
	const status = result.withinBudget
		? styleText('green', 'PASS')
		: result.control === 'advisory'
			? styleText('yellow', 'WARN')
			: styleText('red', 'FAIL');
	const controlLabel = result.control === 'advisory' ? 'advisory' : 'strict';

	console.log(
		`${status} [${controlLabel}] ${result.label} (${result.entrypoint}) raw ${rawKb} KB / ${rawBudgetKb} KB, gzip ${styleText('blue', `${gzipKb} KB`)} / ${gzipBudgetKb} KB`,
	);
}

if (!reportOnly && results.some((result) => !result.withinBudget && result.control === 'strict')) {
	process.exit(1);
}
