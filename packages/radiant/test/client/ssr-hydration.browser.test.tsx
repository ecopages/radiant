/// <reference types="vite/client" />
/** @jsxImportSource @ecopages/jsx */
import { waitFor } from '@testing-library/dom';
import { CUSTOM_ELEMENT_CHILDREN_SYMBOL } from '@ecopages/jsx';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { installRadiantHydrator, uninstallRadiantHydrator } from '../../src/client/hydrator';
import {
	type DeferredHydratedCard,
	type HydratedArrayPropCard,
	type HydratedComplexSlotCard,
	type HydratedCounter,
	type HydratedCounterBinding,
	type HydratedFragmentSlotParent,
	type HydratedKeyedHostsParent,
	type HydratedLateChildParent,
	type HydratedMarkerSlotChild,
	type HydratedMarkerSlotParent,
	type HydratedNestedCounter,
	type HydratedNestedHostParent,
	type HydratedRegionCard,
	type HydratedRegionParent,
	type HydratedRootSlotParent,
	type HydratedStaticView,
	type HydratedSlotCard,
	type HydratedThirdPartyParent,
	type NonHydratedCounter,
} from '../fixtures/ssr-hydration/components';
import '../fixtures/ssr-hydration/components';
import {
	LIFECYCLE_PREFIX,
	defineLifecycleChild,
	defineLifecycleParent,
	type LifecycleChild,
} from '../fixtures/ssr-hydration/lifecycle-pair';

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

/** Waits two macrotask turns, so first-connect work and the update cycles it schedules have run. */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 2; turn += 1) {
		await new Promise((resolve) => setTimeout(resolve));
	}
}

let lifecycleRun = 0;

/** Mounts the `lifecycle-parent` server markup under tags no other test has defined. */
function mountLifecycle(): { prefix: string; log: string[] } {
	lifecycleRun += 1;
	const prefix = `lifecycle-run${lifecycleRun}`;
	document.body.innerHTML = serverMarkup('lifecycle-parent').replaceAll(LIFECYCLE_PREFIX, prefix);
	return { prefix, log: [] };
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
		const serverChild = element.querySelector('hydrated-marker-slot-child-test');
		const serverProjected = element.querySelector('b');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelector('hydrated-marker-slot-child-test')).toBe(serverChild);
		expect(element.querySelector('b')).toBe(serverProjected);
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
		const serverChild = element.querySelector('hydrated-marker-slot-child-test');
		const serverProjected = element.querySelector('b');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelector('hydrated-marker-slot-child-test')).toBe(serverChild);
		expect(element.querySelector('b')).toBe(serverProjected);

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

	test('keeps the server-rendered node of a nested host when its parent hydrates', async () => {
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

	test('keeps the server-rendered nodes of JSX passed to a nested host through a property when the parent hydrates', async () => {
		installRadiantHydrator();
		const element = mount<HydratedRegionParent>('region-parent', 'hydrated-region-parent-test');
		const serverCard = element.querySelector('hydrated-region-card-test');
		const serverLabel = element.querySelector('.label');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		expect(element.querySelector('hydrated-region-card-test')).toBe(serverCard);
		expect(element.querySelector('.label')).toBe(serverLabel);
	});

	test('hydrates a nested host that takes no children without waiting for a children value', async () => {
		installRadiantHydrator();
		expect(serverMarkup('region-parent')).toContain('<hydrated-region-card-test data-radiant-ssr>');
		const element = mount<HydratedRegionParent>('region-parent', 'hydrated-region-parent-test');
		const card = element.querySelector('hydrated-region-card-test') as HydratedRegionCard;

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		expect(element.querySelector('hydrated-region-card-test')).toBe(card);
		expect(card.isServerRendered).toBe(true);
		await card.updateComplete;
	});

	test('keeps focus and input typed into a nested host before its parent hydrates', async () => {
		installRadiantHydrator();
		const element = mount<HydratedNestedHostParent>('nested-host-parent', 'hydrated-nested-host-parent-test');
		const serverChild = element.querySelector('hydrated-nested-counter-test') as HydratedNestedCounter;
		const input = element.querySelector('input') as HTMLInputElement;

		input.focus();
		input.value = 'typed';

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		expect(element.querySelector('hydrated-nested-counter-test')).toBe(serverChild);
		expect(serverChild.isServerRendered).toBe(true);
		expect(element.querySelector('input')).toBe(input);
		expect(input.value).toBe('typed');
		expect(document.activeElement).toBe(input);
	});

	test('updates a nested host and its parent after the parent adopted it', async () => {
		installRadiantHydrator();
		const element = mount<HydratedNestedHostParent>('nested-host-parent', 'hydrated-nested-host-parent-test');
		const serverChild = element.querySelector('hydrated-nested-counter-test');
		const button = element.querySelector('button');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));

		button?.click();
		element.label = 'two';

		await waitFor(() => {
			expect(element.querySelector('button')?.textContent).toBe('1');
			expect(element.querySelector('.label')?.textContent).toBe('two');
			expect(serverChild?.getAttribute('data-label')).toBe('two');
		});
		expect(element.querySelector('button')).toBe(button);
		expect(element.querySelector('hydrated-nested-counter-test')).toBe(serverChild);
	});

	test('keeps keyed nested hosts through hydration and a reorder', async () => {
		installRadiantHydrator();
		const element = mount<HydratedKeyedHostsParent>('keyed-hosts-parent', 'hydrated-keyed-hosts-parent-test');
		const [first, second] = Array.from(element.querySelectorAll('hydrated-marker-slot-child-test'));

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(Array.from(element.querySelectorAll('hydrated-marker-slot-child-test'))).toEqual([first, second]);
		expect((first as HydratedMarkerSlotChild).isServerRendered).toBe(true);

		element.items = ['b', 'a'];

		await waitFor(() =>
			expect(Array.from(element.querySelectorAll('hydrated-marker-slot-child-test'))).toEqual([second, first]),
		);
		expect(Array.from(element.querySelectorAll('.child > b'), (node) => node.textContent)).toEqual(['b', 'a']);
	});

	test('rebuilds a nested host whose server markup does not match the view', async () => {
		installRadiantHydrator();
		document.body.innerHTML = serverMarkup('marker-slot-parent').replaceAll(
			'hydrated-marker-slot-child-test',
			'hydrated-static-view-test',
		);
		const element = document.querySelector('hydrated-marker-slot-parent-test') as HydratedMarkerSlotParent;
		const serverTrailing = element.querySelector('i');

		await waitFor(() =>
			expect(element.querySelectorAll('hydrated-marker-slot-child-test .child > b')).toHaveLength(1),
		);
		expect(element.querySelector('hydrated-static-view-test')).toBeNull();
		expect(element.querySelector('i')).toBe(serverTrailing);

		element.inside = 'inside-1';

		await waitFor(() => expect(element.querySelector('.child > b')?.getAttribute('title')).toBe('inside-1'));
	});

	test('rebuilds a custom element that is not a Radiant host, keeping its children bound', async () => {
		installRadiantHydrator();
		const element = mount<HydratedThirdPartyParent>('third-party-parent', 'hydrated-third-party-parent-test');
		const serverTrailing = element.querySelector('i');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelector('i')).toBe(serverTrailing);
		expect(element.querySelectorAll('hydrated-third-party-box-test > b')).toHaveLength(1);

		element.inside = 'inside-1';

		await waitFor(() =>
			expect(element.querySelector('hydrated-third-party-box-test > b')?.getAttribute('title')).toBe('inside-1'),
		);
	});

	test('keeps a nested host whose tag is defined before its parent over parsed markup', async () => {
		installRadiantHydrator();
		document.body.innerHTML = serverMarkup('define-order-parent');
		const serverChild = document.querySelector('hydrated-order-child-test');
		const serverProjected = document.querySelector('b');

		const { HydratedOrderParent } = await import('../fixtures/ssr-hydration/define-order');
		const element = document.querySelector('hydrated-order-parent-test') as InstanceType<
			typeof HydratedOrderParent
		>;

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelector('hydrated-order-child-test')).toBe(serverChild);
		expect(element.querySelectorAll('b')).toHaveLength(1);
		expect(element.querySelector('b')).toBe(serverProjected);

		element.inside = 'inside-1';

		await waitFor(() => expect(element.querySelector('b')?.getAttribute('title')).toBe('inside-1'));
		expect(element.querySelectorAll('b')).toHaveLength(1);
	});

	test('rebuilds a nested host whose tag is defined only after its parent hydrated', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		installRadiantHydrator();
		const element = mount<HydratedLateChildParent>('late-child-parent', 'hydrated-late-child-parent-test');
		const serverTrailing = element.querySelector('i');

		await waitFor(() => expect(hasHydrationMarkers(element)).toBe(false));
		expect(element.querySelector('i')).toBe(serverTrailing);

		await import('../fixtures/ssr-hydration/late-child');

		await waitFor(() => expect(element.querySelectorAll('hydrated-late-child-test .child > b')).toHaveLength(1));

		element.inside = 'inside-1';

		await waitFor(() => expect(element.querySelector('.child > b')?.getAttribute('title')).toBe('inside-1'));
		vi.restoreAllMocks();
	});
});

describe('a nested host that waits for its children', () => {
	beforeEach(() => {
		uninstallRadiantHydrator();
		document.body.innerHTML = '';
	});

	test('runs onConnected after it hydrates when its tag is defined before its parent', async () => {
		installRadiantHydrator();
		const { prefix, log } = mountLifecycle();
		const serverChild = document.querySelector(`${prefix}-child`);
		const serverProjected = document.querySelector('b');

		defineLifecycleChild(prefix, log);
		await settle();

		expect(log).toEqual(['child:connected']);

		defineLifecycleParent(prefix, log);
		await waitFor(() => expect(hasHydrationMarkers(document.body)).toBe(false));
		await settle();

		expect(document.querySelector(`${prefix}-child`)).toBe(serverChild);
		expect(document.querySelector('b')).toBe(serverProjected);
		expect(log.filter((entry) => entry.startsWith('child:onConnected'))).not.toContain(
			'child:onConnected hydrated=false',
		);
		expect(log.indexOf('child:onConnected hydrated=true')).toBeGreaterThan(log.indexOf('parent:render'));
	});

	/**
	 * @remarks The child is already connected before the parent receives its children value. Hydration and the first
	 * parent reconciliation preserve that host in place, so neither phase should produce another lifecycle callback.
	 */
	test('renders and connects once when its tag is defined before its parent', async () => {
		installRadiantHydrator();
		const { prefix, log } = mountLifecycle();

		defineLifecycleChild(prefix, log);
		await settle();
		const connectedBeforeParent = log.filter((entry) => entry === 'child:connected').length;
		defineLifecycleParent(prefix, log);
		await waitFor(() => expect(hasHydrationMarkers(document.body)).toBe(false));
		await settle();

		expect(log.filter((entry) => entry === 'child:render')).toHaveLength(1);
		expect(log.filter((entry) => entry === 'child:connected')).toHaveLength(connectedBeforeParent);
	});

	test('renders once when its parent is defined first', async () => {
		installRadiantHydrator();
		const { prefix, log } = mountLifecycle();

		defineLifecycleParent(prefix, log);
		defineLifecycleChild(prefix, log);
		await waitFor(() => expect(hasHydrationMarkers(document.body)).toBe(false));
		await settle();

		expect(log.filter((entry) => entry === 'child:render')).toHaveLength(1);
		expect(log).toContain('child:onConnected hydrated=true');
	});

	test('keeps its server nodes when it requests a render while it waits', async () => {
		installRadiantHydrator();
		const { prefix, log } = mountLifecycle();
		const serverProjected = document.querySelector('b');

		defineLifecycleChild(prefix, log);
		await settle();
		const child = document.querySelector(`${prefix}-child`) as LifecycleChild;
		child.flag = 'f1';
		child.requestUpdate();
		await settle();

		expect(log).toEqual(['child:connected']);
		expect(document.querySelector('b')).toBe(serverProjected);

		defineLifecycleParent(prefix, log);
		await waitFor(() => expect(child.querySelector('em')?.textContent).toBe('f1'));
		expect(document.querySelector('b')).toBe(serverProjected);
		expect(document.querySelectorAll('b')).toHaveLength(1);
	});

	test('stays inert server markup while its parent never renders on the client', async () => {
		installRadiantHydrator();
		const { prefix, log } = mountLifecycle();

		defineLifecycleChild(prefix, log);
		await settle();
		const child = document.querySelector(`${prefix}-child`) as LifecycleChild;

		expect(log).toEqual(['child:connected']);
		expect(child.isServerRendered).toBe(true);
		expect(hasHydrationMarkers(child)).toBe(true);
	});

	test('hydrates after a disconnect and reconnect while it waits', async () => {
		installRadiantHydrator();
		const { prefix, log } = mountLifecycle();
		const serverChild = document.querySelector(`${prefix}-child`);
		const serverProjected = document.querySelector('b');

		defineLifecycleChild(prefix, log);
		await settle();
		const parent = document.querySelector(`${prefix}-parent`) as Element;
		parent.remove();
		document.body.append(parent);
		await settle();

		const Parent = defineLifecycleParent(prefix, log);
		await waitFor(() => expect(hasHydrationMarkers(document.body)).toBe(false));

		expect(document.querySelector(`${prefix}-child`)).toBe(serverChild);
		expect(document.querySelector('b')).toBe(serverProjected);
		expect(log).toContain('child:onConnected hydrated=true');

		(document.querySelector(`${prefix}-parent`) as InstanceType<typeof Parent>).inside = 'inside-1';
		await waitFor(() => expect(serverProjected?.getAttribute('title')).toBe('inside-1'));
	});

	test('does not render again when assigned the children value it already holds', async () => {
		lifecycleRun += 1;
		const prefix = `lifecycle-run${lifecycleRun}`;
		const log: string[] = [];
		defineLifecycleChild(prefix, log);
		const child = document.body.appendChild(document.createElement(`${prefix}-child`));
		const children = <b>B</b>;

		Reflect.set(child, CUSTOM_ELEMENT_CHILDREN_SYMBOL, children);
		await settle();
		Reflect.set(child, CUSTOM_ELEMENT_CHILDREN_SYMBOL, children);
		await settle();

		expect(child.querySelectorAll('b')).toHaveLength(1);
		expect(log.filter((entry) => entry === 'child:render')).toHaveLength(1);
	});

	test('renders fresh from hydrate-mode markup when the hydrator is not installed', async () => {
		const { prefix, log } = mountLifecycle();

		defineLifecycleChild(prefix, log);
		defineLifecycleParent(prefix, log);
		await settle();

		expect(hasHydrationMarkers(document.body)).toBe(false);
		expect(document.querySelectorAll(`${prefix}-child .child > b`)).toHaveLength(1);
		expect((document.querySelector(`${prefix}-child`) as LifecycleChild).isServerRendered).toBe(false);
	});
});

describe('a nested host rendered in plain mode', () => {
	beforeEach(() => {
		uninstallRadiantHydrator();
		document.body.innerHTML = '';
	});

	for (const hydrator of [false, true]) {
		test(`renders its server-rendered children once when its parent is not defined on the client${hydrator ? ', with the hydrator' : ''}`, async () => {
			if (hydrator) {
				installRadiantHydrator();
			}

			document.body.innerHTML = serverMarkup('root-slot-parent-plain').replaceAll(
				'hydrated-root-slot-parent-test',
				'undefined-plain-parent-test',
			);
			const child = document.querySelector('hydrated-marker-slot-child-test') as HydratedMarkerSlotChild;

			await child.updateComplete;
			await settle();

			expect(child.querySelectorAll('.child')).toHaveLength(1);
			expect(child.querySelectorAll('.child > b')).toHaveLength(1);
			expect(child.querySelector('script[data-radiant-slot-projection]')).toBeNull();
		});

		test(`renders its children once and updates them when its parent is defined${hydrator ? ', with the hydrator' : ''}`, async () => {
			if (hydrator) {
				installRadiantHydrator();
			}

			const element = mount<HydratedRootSlotParent>('root-slot-parent-plain', 'hydrated-root-slot-parent-test');

			await element.updateComplete;
			await settle();

			expect(element.querySelectorAll('.child > b')).toHaveLength(1);
			expect(element.querySelector('script[data-radiant-slot-projection]')).toBeNull();

			element.inside = 'inside-1';

			await waitFor(() => expect(element.querySelector('.child > b')?.getAttribute('title')).toBe('inside-1'));
			expect(element.querySelectorAll('.child > b')).toHaveLength(1);
		});
	}
});
