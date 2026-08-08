import { createRoot } from '../src/dom-render.ts';
import { HYDRATE_SCENARIOS } from './hydrate-scenarios.tsx';

export type HydrateScenarioResult = {
	drift: number;
	medianMs: number;
	minMs: number;
	name: string;
	reconnected: boolean;
	rounds: number[];
};

type RunOptions = {
	measuredRounds: number;
	warmupRounds: number;
};

function median(values: readonly number[]): number {
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);

	return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
}

/**
 * Times one `hydrate(...)` call per round against a freshly parsed copy of the
 * SSR markup.
 *
 * Only the hydrate call is measured; parsing and teardown sit outside the timer.
 * Each round gets its own container and is unmounted afterwards, so state that
 * survives teardown shows up as a rising series rather than being averaged away.
 */
function measureScenario(html: string, build: () => unknown, options: RunOptions): Omit<HydrateScenarioResult, 'name'> {
	const samples: number[] = [];
	let reconnected = false;

	for (let round = 0; round < options.warmupRounds + options.measuredRounds; round += 1) {
		const container = document.createElement('div');
		document.body.append(container);
		container.innerHTML = html;

		const probe = container.querySelector('.card, .row');
		const root = createRoot(container);
		const startedAt = performance.now();

		root.hydrate(build() as never);

		const elapsed = performance.now() - startedAt;

		if (round === 0) {
			reconnected = probe !== null && probe.isConnected;
		}

		if (round >= options.warmupRounds) {
			samples.push(elapsed);
		}

		root.unmount();
		container.remove();
	}

	// Half-vs-half medians rather than last-vs-first: a single unlucky round would
	// otherwise dominate the ratio.
	const midpoint = Math.floor(samples.length / 2);
	const earlyMedian = median(samples.slice(0, midpoint));
	const lateMedian = median(samples.slice(midpoint));

	return {
		// Rising cost across identical rounds means hydration left something behind.
		drift: earlyMedian === 0 ? 0 : Number((lateMedian / earlyMedian).toFixed(2)),
		medianMs: Number(median(samples).toFixed(3)),
		minMs: Number(Math.min(...samples).toFixed(3)),
		reconnected,
		rounds: samples.map((sample) => Number(sample.toFixed(1))),
	};
}

declare global {
	// eslint-disable-next-line no-var
	var __runHydrateBench: (name: string, html: string, options: RunOptions) => HydrateScenarioResult;
}

/**
 * Measures a single scenario.
 *
 * One scenario per page load, because a shape that leaks leaves memory pressure
 * behind and would otherwise be charged to whichever scenario ran after it.
 */
globalThis.__runHydrateBench = (name, html, options) => {
	const scenario = HYDRATE_SCENARIOS.find((candidate) => candidate.name === name);

	if (!scenario) {
		throw new Error(`Unknown hydration scenario: ${name}`);
	}

	return { name, ...measureScenario(html, scenario.build, options) };
};
