import { bench, do_not_optimize, run, summary } from 'mitata';
import { jsx } from '../jsx-runtime.ts';
import { renderToString } from '../server-render.ts';
import { createBenchmarkProps, RealWorldPage } from './realworld-page.tsx';

const props = createBenchmarkProps();
const page = jsx(RealWorldPage, props);
const warmHtml = renderToString(page);

console.log(`RealWorldPage output size: ${(warmHtml.length / 1024).toFixed(1)} KiB`);
console.log(
	'The non-hydrate task matches the published Kita RealWorldPage shape; the hydrate task is Radiant-specific.',
);

summary(() => {
	bench('renderToString', () => {
		do_not_optimize(renderToString(page));
	});

	bench('renderToString hydrate', () => {
		do_not_optimize(renderToString(page, { hydrate: true }));
	});
});

await run({
	format: { mitata: { name: 'fixed' } },
	throw: true,
});
