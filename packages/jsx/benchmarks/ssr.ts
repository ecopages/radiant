/** @jsxImportSource @ecopages/jsx */
import { writeFileSync } from 'node:fs';
import { bench, do_not_optimize, run, summary } from 'mitata';
import { jsx } from '../jsx-runtime.ts';
import { renderToString } from '../server-render.ts';
import { createBenchmarkProps, RealWorldPage } from './realworld-page.tsx';

const props = createBenchmarkProps();
const warmHtml = renderToString(jsx(RealWorldPage, props));

console.log(`RealWorldPage output size: ${(warmHtml.length / 1024).toFixed(1)} KiB`);
console.log(
	'renderToString hydrate includes Radiant SSR markers — treat it as an internal regression signal, not a Kita-comparable number.',
);

summary(() => {
	bench('renderToString', () => {
		do_not_optimize(renderToString(jsx(RealWorldPage, props)));
	});

	bench('renderToString hydrate', () => {
		do_not_optimize(renderToString(jsx(RealWorldPage, props), { hydrate: true }));
	});
});

const result = await run({ throw: true });

const jsonOut = process.env.BENCH_JSON_OUT;
if (jsonOut) {
	writeFileSync(jsonOut, JSON.stringify(result));
}
