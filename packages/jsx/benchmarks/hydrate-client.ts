import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';
import { renderToString } from '../src/ssr/server-render.ts';
import { HYDRATE_SCENARIOS } from './hydrate-scenarios.tsx';
import type { HydrateScenarioResult } from './hydrate-client-entry.ts';

/**
 * Client hydration benchmark.
 *
 * SSR needs Node and hydration needs a real DOM, so the run is split: fixtures are
 * rendered here, the measurement code is bundled for the browser, and Chromium
 * executes it. Numbers come back as structured results rather than console output.
 *
 * Run with `pnpm run bench:hydrate`.
 */

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const measuredRounds = Number(process.env.BENCH_ROUNDS ?? '15');
const warmupRounds = Number(process.env.BENCH_WARMUP ?? '5');

const fixtures = Object.fromEntries(
	HYDRATE_SCENARIOS.map((scenario) => [scenario.name, renderToString(scenario.build(), { mode: 'hydrate' })]),
);

const bundle = await esbuild.build({
	bundle: true,
	entryPoints: [join(packageRoot, 'benchmarks/hydrate-client-entry.ts')],
	format: 'iife',
	platform: 'browser',
	target: 'es2022',
	write: false,
});

const bundledCode = bundle.outputFiles[0]?.text;

if (!bundledCode) {
	throw new Error('Failed to bundle the hydration benchmark client entry.');
}

const browser = await chromium.launch();
const results: HydrateScenarioResult[] = [];

try {
	// A fresh context per scenario: a shape that leaks would otherwise leave memory
	// pressure behind and inflate whichever scenario ran next.
	for (const scenario of HYDRATE_SCENARIOS) {
		const context = await browser.newContext();
		const page = await context.newPage();

		await page.setContent('<!doctype html><html><body></body></html>');
		await page.addScriptTag({ content: bundledCode });

		results.push(
			await page.evaluate(
				([name, html, options]) =>
					globalThis.__runHydrateBench(
						name as string,
						html as string,
						options as { measuredRounds: number; warmupRounds: number },
					),
				[scenario.name, fixtures[scenario.name] ?? '', { measuredRounds, warmupRounds }] as const,
			),
		);

		await context.close();
	}
} finally {
	await browser.close();
}

const mismatched = HYDRATE_SCENARIOS.filter(
	(scenario) => scenario.reconnects !== results.find((result) => result.name === scenario.name)?.reconnected,
);

console.log(`Hydration profile: Chromium via Playwright (${measuredRounds} rounds, ${warmupRounds} warmup)\n`);
console.table(
	results.map((result) => ({
		name: result.name,
		medianMs: result.medianMs,
		minMs: result.minMs,
		drift: result.drift,
		reconnected: result.reconnected,
		sizeKiB: Number(((fixtures[result.name]?.length ?? 0) / 1024).toFixed(1)),
	})),
);

console.log(
	'\ndrift = median of the later rounds / median of the earlier rounds. Values meaningfully above 1 mean hydration left state behind.',
);

for (const scenario of HYDRATE_SCENARIOS) {
	console.log(`  ${scenario.name}: ${scenario.description}`);
}

if (process.env.BENCH_JSON_OUT) {
	writeFileSync(process.env.BENCH_JSON_OUT, JSON.stringify({ measuredRounds, results, warmupRounds }, null, 2));
}

if (mismatched.length > 0) {
	// A scenario that stops reconnecting still yields numbers, they just describe a
	// full client render instead of hydration. Fail rather than report them as-is.
	throw new Error(
		`Hydration expectation mismatch for: ${mismatched.map((scenario) => scenario.name).join(', ')}. ` +
			"Either the shape regressed, or the scenario's `reconnects` flag needs updating.",
	);
}
