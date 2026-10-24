/// <reference types="vite/client" />
import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { installRadiantHydrator, uninstallRadiantHydrator } from '../../src/client/hydrator';
import {
	type DeferredHydratedCard,
	type HydratedArrayPropCard,
	type HydratedComplexSlotCard,
	type HydratedCounter,
	type HydratedCounterBinding,
	type HydratedFragmentSlotParent,
	type HydratedMarkerSlotChild,
	type HydratedMarkerSlotParent,
	type HydratedRegionParent,
	type HydratedRootSlotParent,
	type HydratedStaticView,
	type HydratedSlotCard,
	type NonHydratedCounter,
} from '../fixtures/ssr-hydration/components';
import '../fixtures/ssr-hydration/components';

const fixtures = import.meta.glob<string>('../fixtures/ssr-hydration/__snapshots__/*.html', {
	query: '?raw',
	import: 'default',
	eager: true,
});

/**
 * Server markup written by `test/server/ssr-hydration-fixtures.test.tsx`, rendered on the minimal DOM.
 */
function serverMarkup(name: string): string {
	const markup = fixtures[`../fixtures/ssr-hydration/__snapshots__/${name}.html`];

	if (markup === undefined) {
		throw new Error(`Missing SSR fixture "${name}". Run the node project with -u to write it.`);
	}

	return markup;
}

function mount<T extends Element>(name: string, selector: string): T {
	document.body.innerHTML = serverMarkup(name);
	return document.querySelector(selector) as T;
}

function hasHydrationMarkers(element: Element): boolean {
	return element.innerHTML.includes('data-radiant-jsx-bind-');
}

describe('hydrating server-rendered markup', () => {
	beforeEach(() => {
		uninstallRadiantHydrator();
		document.body.innerHTML = '';
	});

	test('hydrates SSR markup in place on connect', async () => {
		installRadiantHydrator();
		const element = mount<HydratedCounter>('counter', 'hydrated-counter-test');
		const button = element.querySelector('button');

		expect(button).not.toBeNull();
		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => expect(element.querySelector('button')?.textContent).toBe('Count 1'));
		expect(element.querySelector('button')).toBe(button);
	});

	test('hydrates SSR markup that uses slot projection payloads', async () => {
		installRadiantHydrator();
		const element = mount<HydratedSlotCard>('slot-card', 'hydrated-slot-card-test');

		await waitFor(() => {
			expect(element.querySelector('header > h2')?.textContent).toBe('SSR header');
			expect(element.querySelector('div > p')?.textContent).toBe('SSR body');
			expect(hasHydrationMarkers(element)).toBe(false);
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => expect(element.querySelector('button')?.textContent).toBe('Count 1'));
	});

	test('hydrates parent bindings that follow a nested host with reactive JSX children', async () => {
		installRadiantHydrator();
		const element = mount<HydratedMarkerSlotParent>('marker-slot-parent', 'hydrated-marker-slot-parent-test');
		const serverTrailing = element.querySelector('i');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelector('i')).toBe(serverTrailing);

		element.trailing = 'after-1';
		element.inside = 'inside-1';

		await waitFor(() => {
			expect(element.querySelector('i')?.getAttribute('title')).toBe('after-1');
			expect(element.querySelector('b')?.getAttribute('title')).toBe('inside-1');
		});
	});

	test('hydrates a parent whose view is a nested host with reactive JSX children', async () => {
		installRadiantHydrator();
		const element = mount<HydratedRootSlotParent>('root-slot-parent', 'hydrated-root-slot-parent-test');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelectorAll('.child > b')).toHaveLength(1);

		element.inside = 'inside-1';

		await waitFor(() => expect(element.querySelector('.child > b')?.getAttribute('title')).toBe('inside-1'));
		expect(element.querySelectorAll('hydrated-marker-slot-child-test')).toHaveLength(1);
	});

	test('reports server-rendered hosts through isServerRendered even when the view has no markers', async () => {
		installRadiantHydrator();
		const rendered = mount<HydratedStaticView>('static-view', 'hydrated-static-view-test');
		const created = document.createElement('hydrated-static-view-test') as HydratedStaticView;

		expect(hasHydrationMarkers(rendered)).toBe(false);
		expect(rendered.isServerRendered).toBe(true);
		expect(rendered.hasAttribute('data-radiant-ssr')).toBe(false);
		expect((rendered.cloneNode(true) as Element).hasAttribute('data-radiant-ssr')).toBe(false);
		expect(created.isServerRendered).toBe(false);

		document.body.append(created);
		await waitFor(() => expect(created.querySelector('p')).not.toBeNull());
		expect(created.isServerRendered).toBe(false);

		rendered.remove();
		document.body.append(rendered);
		await waitFor(() => expect(rendered.isConnected).toBe(true));
		expect(rendered.isServerRendered).toBe(true);
	});

	test('hydrates reactive JSX children of a nested host under a fragment root', async () => {
		installRadiantHydrator();
		const element = mount<HydratedFragmentSlotParent>('fragment-slot-parent', 'hydrated-fragment-slot-parent-test');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		element.leading = 'before-1';
		element.inside = 'inside-1';

		await waitFor(() => {
			expect(element.querySelector('i')?.getAttribute('title')).toBe('before-1');
			expect(element.querySelector('b')?.getAttribute('title')).toBe('inside-1');
		});
	});

	test('hydrates slot projection payloads with multiple projected roots and quoted attributes', async () => {
		installRadiantHydrator();
		const element = mount<HydratedComplexSlotCard>('complex-slot-card', 'hydrated-complex-slot-card-test');

		await waitFor(() => {
			expect(element.querySelector('header > h2')?.getAttribute('data-note')).toBe('1 > 0');
			expect(element.querySelector('[data-ref="body"] > article > p')?.textContent).toBe('SSR body');
			expect(element.querySelector('[data-ref="body"] > radiant-component-counter')?.getAttribute('count')).toBe(
				'4',
			);
			expect(element.querySelector('footer > p')?.textContent).toBe('SSR footer');
			expect(hasHydrationMarkers(element)).toBe(false);
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => expect(element.querySelector('button')?.textContent).toBe('Count 1'));
	});

	test('SSR hosts fall back to a fresh client render when the explicit hydrator is not installed', async () => {
		const element = mount<NonHydratedCounter>('non-hydrated-counter', 'non-hydrated-counter-test');
		const initialButton = element.querySelector('button');

		expect(initialButton).not.toBeNull();

		await waitFor(() => {
			expect(element.querySelector('button')).not.toBe(initialButton);
			expect(hasHydrationMarkers(element)).toBe(false);
		});
	});

	test('first-connect hydration ignores stale pre-connect update requests', async () => {
		installRadiantHydrator();
		const element = mount<DeferredHydratedCard>('deferred-card', 'deferred-hydrated-card-test');

		await waitFor(() => {
			expect(element.querySelectorAll('button')).toHaveLength(1);
			expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Count: 2');
			expect(hasHydrationMarkers(element)).toBe(false);
		});

		element.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await waitFor(() => expect(element.querySelector('[data-ref="count"]')?.textContent).toBe('Count: 3'));
	});

	test('this.$ bindings update after hydration', async () => {
		installRadiantHydrator();
		const element = mount<HydratedCounterBinding>('counter-binding', 'hydrated-counter-binding-test');

		await waitFor(() => expect(element.querySelector('[data-testid="binding"]')?.textContent).toBe('0'));

		(element.querySelector('[data-testid="inc-binding"]') as HTMLButtonElement).click();

		await waitFor(() => expect(element.querySelector('[data-testid="binding"]')?.textContent).toBe('1'));
	});

	test('hydrates array @prop values from host attributes before the first client render', async () => {
		installRadiantHydrator();
		const element = mount<HydratedArrayPropCard>('array-prop', 'hydrated-array-prop-card-test');

		await waitFor(() => {
			expect(element.items).toEqual([{ label: 'first' }, { label: 'second' }]);
			expect(element.querySelector('p')?.textContent).toBe('first, second');
		});
	});

	test('updates parent bindings in JSX passed to a nested host through a property after hydration', async () => {
		installRadiantHydrator();
		const element = mount<HydratedRegionParent>('region-parent', 'hydrated-region-parent-test');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		element.label = 'two';
		element.showBadge = true;

		await waitFor(() => {
			expect(element.querySelector('main > .label')?.textContent).toBe('two');
			expect(element.querySelectorAll('main > .badge')).toHaveLength(1);
		});
	});

	test.fails('keeps the server-rendered node of a nested host when its parent hydrates', async () => {
		installRadiantHydrator();
		const element = mount<HydratedMarkerSlotParent>('marker-slot-parent', 'hydrated-marker-slot-parent-test');
		const serverChild = element.querySelector('hydrated-marker-slot-child-test');
		const serverProjected = element.querySelector('b');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		const child = element.querySelector('hydrated-marker-slot-child-test') as HydratedMarkerSlotChild | null;
		expect(child).toBe(serverChild);
		expect(child?.isServerRendered).toBe(true);
		expect(element.querySelector('b')).toBe(serverProjected);
	});

	test.fails(
		'keeps the server-rendered nodes of JSX passed to a nested host through a property when the parent hydrates',
		async () => {
			installRadiantHydrator();
			const element = mount<HydratedRegionParent>('region-parent', 'hydrated-region-parent-test');
			const serverCard = element.querySelector('hydrated-region-card-test');
			const serverLabel = element.querySelector('.label');

			await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

			expect(element.querySelector('hydrated-region-card-test')).toBe(serverCard);
			expect(element.querySelector('.label')).toBe(serverLabel);
		},
	);
});
