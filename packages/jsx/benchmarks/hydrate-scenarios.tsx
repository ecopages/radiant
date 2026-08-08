/** @jsxImportSource ../src */
import type { JsxRenderable } from '../src/types/index.ts';

export type HydrateScenario = {
	/** Stable id used as the fixture key and in the report. */
	name: string;
	/** What this shape is meant to expose. */
	description: string;
	/**
	 * Whether hydration is expected to reconnect the SSR nodes in place.
	 *
	 * The runner asserts this: a scenario that silently starts falling back to a
	 * full client render would otherwise still produce plausible-looking numbers.
	 */
	reconnects: boolean;
	build: () => JsxRenderable;
};

type Item = {
	id: number;
	name: string;
	price: number;
};

const ITEM_COUNT = 500;

const items: Item[] = Array.from({ length: ITEM_COUNT }, (_, index) => ({
	id: index,
	name: `Purchase number ${index + 1}`,
	price: index,
}));

/**
 * Hydration benchmark shapes.
 *
 * Each entry is one structural case, not one page: the interesting differences
 * live in how a child range reconnects, so the shapes are deliberately minimal
 * apart from the property under test.
 */
export const HYDRATE_SCENARIOS: HydrateScenario[] = [
	{
		name: 'list-reconnect',
		description: 'Attribute-only list children; the static-range hydrator reconnects them in place.',
		reconnects: true,
		build: () => (
			<div class="list">
				{items.map((item) => (
					<article class="card" data-id={String(item.id)} title={item.name} lang="en" />
				))}
			</div>
		),
	},
	{
		name: 'list-dynamic-children',
		description:
			'List children carrying dynamic text as well as attributes. These reconnect through the same path as a root template; the gap against list-reconnect is the cost of the extra child ranges.',
		reconnects: true,
		build: () => (
			<div class="list">
				{items.map((item) => (
					<article class="card" data-id={String(item.id)}>
						<h3 class="card__title">{item.name}</h3>
						<p class="card__price">{item.price}</p>
					</article>
				))}
			</div>
		),
	},
	{
		name: 'list-keyed',
		description: 'Keyed attribute-only children, exercising the keyed range hydrator.',
		reconnects: true,
		build: () => (
			<div class="list">
				{items.map((item) => (
					<article key={item.id} class="card" data-id={String(item.id)} title={item.name} lang="en" />
				))}
			</div>
		),
	},
	{
		name: 'wide-attributes',
		description: 'One template with many attribute bindings, isolating per-binding reconnection cost.',
		reconnects: true,
		build: () => (
			<section class="panel" hidden title="ready" aria-label="demo" lang="en" dir="ltr">
				{items.slice(0, 200).map((item) => (
					<div
						class="row"
						title={item.name}
						lang="en"
						dir="ltr"
						data-a={String(item.id)}
						data-b={String(item.price)}
						data-c="c"
					/>
				))}
			</section>
		),
	},
];
