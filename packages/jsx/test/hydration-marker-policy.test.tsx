import { describe, expect, test } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadMarkerPolicy = async () =>
	loadModule<typeof import('../src/hydration-marker-policy.ts')>('../src/hydration-marker-policy.ts');
const loadHydrationBindings = async () =>
	loadModule<typeof import('../src/hydration-bindings.ts')>('../src/hydration-bindings.ts');
const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadServerRender = async () => loadModule<typeof import('../src/server-render.ts')>('../src/server-render.ts');

describe('hydration marker policy', () => {
	test('events, native-events, and properties are client-only bindings', async () => {
		const { isClientOnlyBinding } = await loadMarkerPolicy();

		expect(isClientOnlyBinding('event')).toBe(true);
		expect(isClientOnlyBinding('native-event')).toBe(true);
		expect(isClientOnlyBinding('prop')).toBe(true);
	});

	test('attributes and booleans are not client-only bindings', async () => {
		const { isClientOnlyBinding } = await loadMarkerPolicy();

		expect(isClientOnlyBinding('attr')).toBe(false);
		expect(isClientOnlyBinding('bool')).toBe(false);
	});

	test('attributes and booleans emit serialized attribute values', async () => {
		const { shouldEmitAttributeValue } = await loadMarkerPolicy();

		expect(shouldEmitAttributeValue('attr')).toBe(true);
		expect(shouldEmitAttributeValue('bool')).toBe(true);
	});

	test('events, native-events, and properties do not emit serialized attribute values', async () => {
		const { shouldEmitAttributeValue } = await loadMarkerPolicy();

		expect(shouldEmitAttributeValue('event')).toBe(false);
		expect(shouldEmitAttributeValue('native-event')).toBe(false);
		expect(shouldEmitAttributeValue('prop')).toBe(false);
	});

	test('all binding kinds require SSR hydration markers', async () => {
		const { needsHydrationMarker } = await loadMarkerPolicy();

		expect(needsHydrationMarker('attr')).toBe(true);
		expect(needsHydrationMarker('bool')).toBe(true);
		expect(needsHydrationMarker('event')).toBe(true);
		expect(needsHydrationMarker('native-event')).toBe(true);
		expect(needsHydrationMarker('prop')).toBe(true);
	});

	test('isClientOnlyBinding is the exact inverse of shouldEmitAttributeValue', async () => {
		const { isClientOnlyBinding, shouldEmitAttributeValue } = await loadMarkerPolicy();
		const { getBindingKind } = await loadHydrationBindings();

		const prefixes = ['', '?', '@', '!', '.'] as const;
		for (const prefix of prefixes) {
			const kind = getBindingKind(prefix);
			expect(isClientOnlyBinding(kind)).toBe(!shouldEmitAttributeValue(kind));
		}
	});
});

describe('hydration marker policy integration with SSR output', () => {
	test('client-only bindings emit markers but no attribute values in hydrate mode', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('demo-card', {
			'on:click': () => undefined,
			'on-native:focus': () => undefined,
			'prop:payload': { count: 1 },
			title: 'Test',
		});

		const html = renderToString(template, { mode: 'hydrate' });

		// Markers are present for all binding kinds
		expect(html).toContain('data-radiant-jsx-bind-0="event:click"');
		expect(html).toContain('data-radiant-jsx-bind-1="native-event:focus"');
		expect(html).toContain('data-radiant-jsx-bind-2="prop:payload"');
		expect(html).toContain('data-radiant-jsx-bind-3="attr:title"');

		// Client-only bindings do not emit values
		expect(html).not.toContain('click=');
		expect(html).not.toContain('focus=');
		expect(html).not.toContain('payload=');

		// Attribute binding emits its value
		expect(html).toContain('title="Test"');
	});

	test('client-only bindings are completely absent from plain mode output', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('demo-card', {
			'on:click': () => undefined,
			'on-native:focus': () => undefined,
			'prop:payload': { count: 1 },
			title: 'Test',
		});

		const html = renderToString(template, { mode: 'plain' });

		// No markers in plain mode
		expect(html).not.toContain('data-radiant-jsx-bind');

		// Client-only binding values are still absent
		expect(html).not.toContain('click=');
		expect(html).not.toContain('focus=');
		expect(html).not.toContain('payload=');

		// Attribute value is present
		expect(html).toContain('title="Test"');
	});

	test('boolean bindings emit presence-based attributes and hydration markers', async () => {
		const [{ jsx }, { renderToString }] = await Promise.all([loadJsxRuntime(), loadServerRender()]);
		const template = jsx('button', {
			hidden: true,
			disabled: false,
		});

		const html = renderToString(template, { mode: 'hydrate' });

		// true boolean emits presence attribute + marker
		expect(html).toContain('data-radiant-jsx-bind-0="bool:hidden"');
		expect(html).toContain(' hidden');

		// false boolean emits marker but no attribute presence
		expect(html).toContain('data-radiant-jsx-bind-1="bool:disabled"');
		// 'disabled' only appears inside the marker value, not as a standalone attribute
		const htmlWithoutMarkers = html.replace(/data-radiant-jsx-bind-\d+="[^"]*"/g, '');
		expect(htmlWithoutMarkers).not.toContain('disabled');
	});
});

describe('template attribute marker index collection', () => {
	test('collectTemplateAttributeMarkerIndices matches collectHydrationBindings for iterable roots', async () => {
		const [{ jsx, jsxs, Fragment }, { collectHydrationBindings, collectTemplateAttributeMarkerIndices }] =
			await Promise.all([loadJsxRuntime(), loadHydrationBindings()]);

		const renderFragment = () =>
			jsxs(Fragment, {
				children: [
					jsx('button', { class: 'alpha', 'on:click': () => undefined, children: 'Alpha' }),
					jsx('span', { id: 'metric', children: '2' }),
				],
			});

		const fragment = renderFragment();
		const bindings = collectHydrationBindings(fragment);
		const firstButton = (fragment as unknown[])[0] as ReturnType<typeof jsx>;
		const span = (fragment as unknown[])[1] as ReturnType<typeof jsx>;

		const firstButtonIndices = collectTemplateAttributeMarkerIndices(firstButton, 0);
		expect(firstButtonIndices.nextIndex).toBe(2);
		expect(firstButtonIndices.indices.get(0)).toBe(0);
		expect(firstButtonIndices.indices.get(1)).toBe(1);

		const spanIndices = collectTemplateAttributeMarkerIndices(span, firstButtonIndices.nextIndex);
		expect(spanIndices.nextIndex).toBe(3);
		expect(spanIndices.indices.get(0)).toBe(2);

		expect(bindings.size).toBe(3);
		expect(bindings.get(0)?.kind).toBe('attr');
		expect(bindings.get(1)?.kind).toBe('event');
		expect(bindings.get(2)?.name).toBe('id');
	});
});
