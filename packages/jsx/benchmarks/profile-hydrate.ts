import { jsx } from '../jsx-runtime.ts';
import { renderToString } from '../server-render.ts';
import { collectHydrationBindings } from '../hydration-bindings.ts';
import { createBenchmarkProps, RealWorldPage } from './realworld-page.tsx';

type ProfileCase = {
	label: string;
	value: unknown;
};

type ProfileResult = {
	avgUs: number;
	bindings: number;
	hydrate: boolean;
	label: string;
	ratioVsPlain?: number;
	size: number;
};

const cases: ProfileCase[] = [
	{
		label: 'smallText',
		value: jsx('div', { children: 'hello world' }),
	},
	{
		label: 'attrsOnly',
		value: jsx('div', {
			class: 'panel',
			hidden: true,
			title: 'ready',
			'aria-label': 'demo',
			'data-id': '42',
			children: 'x',
		}),
	},
	{
		label: 'manyAttrs',
		value: jsx('section', {
			class: 'panel',
			hidden: true,
			title: 'ready',
			'aria-label': 'demo',
			'data-a': '1',
			'data-b': '2',
			'data-c': '3',
			children: Array.from({ length: 200 }, (_, index) =>
				jsx('div', {
					class: 'row',
					title: 'row',
					'data-i': String(index),
					children: 'row',
				}),
			),
		}),
	},
	{
		label: 'realWorldPage',
		value: jsx(RealWorldPage, createBenchmarkProps()),
	},
];

const runtimeLabel = getRuntimeLabel();

console.log(`Hydrate profile runtime: ${runtimeLabel}`);

const rows = cases.flatMap((testCase) => {
	const plain = profile(testCase.label, testCase.value, false);
	const hydrate = profile(testCase.label, testCase.value, true);

	hydrate.ratioVsPlain = Number((hydrate.avgUs / plain.avgUs).toFixed(2));

	return [plain, hydrate];
});

console.table(rows);

function profile(label: string, value: unknown, hydrate: boolean): ProfileResult {
	const options = hydrate ? { hydrate: true } : undefined;
	const warmupIterations = label === 'realWorldPage' ? 200 : 500;
	const iterations = label === 'realWorldPage' ? 1_000 : 2_000;

	for (let index = 0; index < warmupIterations; index += 1) {
		renderToString(value as never, options);
	}

	let checksum = 0;
	const start = performance.now();

	for (let index = 0; index < iterations; index += 1) {
		checksum += renderToString(value as never, options).length;
	}

	const elapsed = performance.now() - start;
	const rendered = renderToString(value as never, options);

	if (checksum === 0) {
		throw new Error('checksum should not be zero');
	}

	return {
		avgUs: Number(((elapsed * 1_000) / iterations).toFixed(2)),
		bindings: collectHydrationBindings(value as never).size,
		hydrate,
		label,
		size: rendered.length,
	};
}

function getRuntimeLabel(): string {
	if (typeof Bun !== 'undefined') {
		return `Bun ${Bun.version}`;
	}

	if (typeof process !== 'undefined' && process.versions?.node) {
		return `Node ${process.versions.node}`;
	}

	return 'unknown runtime';
}
