import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

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

const packageRoot = import.meta.dirname;
const externalPackages = ['@ecopages/jsx', '@ecopages/jsx/*', '@ecopages/signals', '@ecopages/signals/*'];

const reportOnly = process.argv.includes('--report-only');
const budgetPath = path.resolve(packageRoot, 'size-budget.json');
const budgetFile = JSON.parse(readFileSync(budgetPath, 'utf8')) as SizeBudgetFile;
const outputRoot = path.resolve(packageRoot, '.tmp-size-audit');

rmSync(outputRoot, { force: true, recursive: true });

const results: SizeResult[] = [];

for (const bundle of budgetFile.bundles) {
	const outfile = path.join(outputRoot, bundle.label, 'bundle.js');
	mkdirSync(path.dirname(outfile), { recursive: true });

	try {
		await esbuild.build({
			absWorkingDir: packageRoot,
			bundle: true,
			entryPoints: [path.resolve(packageRoot, bundle.entrypoint)],
			external: [...externalPackages, ...(bundle.external ?? [])],
			format: 'esm',
			logLevel: 'silent',
			minify: true,
			outfile,
			platform: 'browser',
		});
	} catch (error) {
		console.error('[size-audit]', error);
		process.exit(1);
	}

	const bytes = readFileSync(outfile);
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

rmSync(outputRoot, { force: true, recursive: true });

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
