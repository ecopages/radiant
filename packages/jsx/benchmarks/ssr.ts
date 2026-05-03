/** @jsxImportSource ../src */
import { writeFileSync } from 'node:fs';
import { bench, do_not_optimize, run, summary } from 'mitata';
import { jsx } from '../src/jsx-runtime.ts';
import { renderToString } from '../src/server-render.ts';
import { createBenchmarkProps, RealWorldPage } from './realworld-page.tsx';

const props = createBenchmarkProps();
const warmHtml = renderToString(jsx(RealWorldPage, props));

if (process.env.BENCH_SUPPRESS_PREAMBLE !== '1') {
	console.log(`RealWorldPage output size: ${(warmHtml.length / 1024).toFixed(1)} KiB`);
	console.log(
		'renderToString hydrate includes Radiant SSR markers — treat it as an internal regression signal, not a baseline-comparable number.',
	);
}

summary(() => {
	bench('renderToString', () => {
		do_not_optimize(renderToString(jsx(RealWorldPage, props)));
	});

	bench('renderToString hydrate', () => {
		do_not_optimize(renderToString(jsx(RealWorldPage, props), { mode: 'hydrate' }));
	});
});

const result = await run({
	throw: true,
	...(process.env.BENCH_FORMAT === 'quiet' ? { format: 'quiet' as const } : {}),
});

const jsonOut = process.env.BENCH_JSON_OUT;
if (jsonOut) {
	writeFileSync(jsonOut, JSON.stringify(result));
}
