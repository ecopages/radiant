import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

type BundleBudget = {
	entrypoint: string;
	/**
	 * Replaces the default JSX and signals externals when set.
	 *
	 * @remarks
	 * A signals measurement lists only JSX here so `@ecopages/signals` is bundled.
	 */
	external?: string[];
	label: string;
	maxBytes: number;
	maxGzipBytes: number;
	platform?: 'browser' | 'node';
	/**
	 * Metafile input that must appear in this bundle.
	 *
	 * @remarks
	 * Use this when a measurement is supposed to include a workspace package that
	 * the default externals would leave out. Keys are esbuild paths relative to
	 * this package, such as `../signals/dist/index.js`.
	 */
	mustInclude?: string;
	/**
	 * Label of another bundle this one must be strictly larger than.
	 *
	 * @remarks
	 * Stops a "with signals" measurement from matching the plain client bundle
	 * when signals stay external.
	 */
	mustExceedLabel?: string;
};

type SizeBudgetFile = {
	bundles: BundleBudget[];
};

type SizeResult = {
	bytes: number;
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
		const build = await esbuild.build({
			absWorkingDir: packageRoot,
			bundle: true,
			define: { 'process.env.NODE_ENV': '"production"' },
			entryPoints: [path.resolve(packageRoot, bundle.entrypoint)],
			external: bundle.external ?? externalPackages,
			format: 'esm',
			logLevel: 'silent',
			minify: true,
			metafile: true,
			outfile,
			platform: bundle.platform ?? 'browser',
		});
		if (bundle.mustInclude && !Object.keys(build.metafile.inputs).includes(bundle.mustInclude)) {
			throw new Error(`${bundle.label} did not include ${bundle.mustInclude}`);
		}
	} catch (error) {
		console.error('[size-audit]', error);
		rmSync(outputRoot, { force: true, recursive: true });
		process.exit(1);
	}

	const bytes = readFileSync(outfile);
	const gzipBytes = gzipSync(bytes).length;

	results.push({
		bytes: bytes.length,
		entrypoint: bundle.entrypoint,
		gzipBytes,
		label: bundle.label,
		maxBytes: bundle.maxBytes,
		maxGzipBytes: bundle.maxGzipBytes,
		withinBudget: bytes.length <= bundle.maxBytes && gzipBytes <= bundle.maxGzipBytes,
	});
}

rmSync(outputRoot, { force: true, recursive: true });

for (const bundle of budgetFile.bundles) {
	if (!bundle.mustExceedLabel) {
		continue;
	}

	const current = results.find((result) => result.label === bundle.label);
	const other = results.find((result) => result.label === bundle.mustExceedLabel);

	if (!current || !other) {
		console.error(
			'[size-audit]',
			new Error(`${bundle.label} must exceed ${bundle.mustExceedLabel}, but one of those bundles is missing`),
		);
		process.exit(1);
	}

	if (current.bytes <= other.bytes) {
		console.error(
			'[size-audit]',
			new Error(
				`${bundle.label} (${current.bytes} bytes) did not exceed ${bundle.mustExceedLabel} (${other.bytes} bytes)`,
			),
		);
		process.exit(1);
	}
}

console.log('Bundle size audit (minified bundles)');

for (const result of results) {
	const rawKb = (result.bytes / 1024).toFixed(2);
	const gzipKb = (result.gzipBytes / 1024).toFixed(2);
	const rawBudgetKb = (result.maxBytes / 1024).toFixed(2);
	const gzipBudgetKb = (result.maxGzipBytes / 1024).toFixed(2);
	const status = result.withinBudget ? styleText('green', 'PASS') : styleText('red', 'FAIL');

	console.log(
		`${status} ${result.label} (${result.entrypoint}) raw ${rawKb} KB / ${rawBudgetKb} KB, gzip ${styleText('blue', `${gzipKb} KB`)} / ${gzipBudgetKb} KB`,
	);
}

if (!reportOnly && results.some((result) => !result.withinBudget)) {
	process.exit(1);
}
