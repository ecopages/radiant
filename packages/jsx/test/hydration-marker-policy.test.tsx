import { describe, expect, test } from 'vitest';
import { isIterableRenderable, isTemplateResultLike } from '../src/types/renderable-guards.ts';
import type { TemplateResultLike } from '../src/jsx-runtime.ts';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

function expectTemplateChild(value: unknown): TemplateResultLike {
	expect(isTemplateResultLike(value)).toBe(true);
	if (!isTemplateResultLike(value)) {
		throw new Error('Expected fragment child to be a template result.');
	}

	return value;
}

function expectFragmentChildren(fragment: unknown): unknown[] {
	expect(isIterableRenderable(fragment)).toBe(true);
	if (!isIterableRenderable(fragment)) {
		throw new Error('Expected fragment to be iterable.');
	}

	return [...fragment];
}

const loadMarkerPolicy = async () =>
	loadModule<typeof import('../src/hydration/hydration-marker-policy.ts')>('../src/hydration/hydration-marker-policy.ts');
const loadHydrationBindings = async () =>
	loadModule<typeof import('../src/hydration/hydration-bindings.ts')>('../src/hydration/hydration-bindings.ts');
const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadServerRender = async () => loadModule<typeof import('../src/ssr/server-render.ts')>('../src/ssr/server-render.ts');

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
		const fragmentChildren = expectFragmentChildren(fragment);
		const firstButton = expectTemplateChild(fragmentChildren[0]);
		const span = expectTemplateChild(fragmentChildren[1]);

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

	test('renderToString hydrate markers match collectHydrationBindings for iterable roots', async () => {
		const [
			{ jsx, jsxs, Fragment },
			{ collectHydrationBindings, resolveHydrationMarkerAttributeName, serializeBindingDescriptor },
			{ renderToString },
		] = await Promise.all([loadJsxRuntime(), loadHydrationBindings(), loadServerRender()]);

		const fragment = jsxs(Fragment, {
			children: [
				jsx('button', { id: 'dec', 'on:click': () => undefined, children: '-' }),
				jsx('span', { id: 'metric', children: '2' }),
				jsx('button', { id: 'inc', children: '+' }),
			],
		});

		const html = renderToString(fragment, { mode: 'hydrate' });
		const bindings = collectHydrationBindings(fragment);

		expect(bindings.size).toBe(4);

		for (const [index, binding] of bindings) {
			const markerName = resolveHydrationMarkerAttributeName(index);
			const descriptor = serializeBindingDescriptor(binding.kind, binding.name);
			expect(html).toContain(`${markerName}="${descriptor}"`);
		}
	});

	test('renderToString hydrate markers match counter-shaped fragments with subscribable children', async () => {
		const [
			{ createSubscribableJsxValue, jsx, jsxs, Fragment },
			{
				collectHydrationBindings,
				collectTemplateAttributeMarkerIndices,
				resolveHydrationMarkerAttributeName,
				serializeBindingDescriptor,
			},
			{ renderToString },
		] = await Promise.all([loadJsxRuntime(), loadHydrationBindings(), loadServerRender()]);

		const boundCount = createSubscribableJsxValue({
			getValue: () => 2,
			subscribe: () => () => undefined,
		});
		const fragment = jsxs(Fragment, {
			children: [
				jsx('button', { id: 'dec', children: '-' }),
				jsx('span', { id: 'metric', children: boundCount }),
				jsx('button', { id: 'inc', children: '+' }),
			],
		});
		const fragmentChildren = expectFragmentChildren(fragment);
		const decButton = expectTemplateChild(fragmentChildren[0]);
		const metricSpan = expectTemplateChild(fragmentChildren[1]);
		const incButton = expectTemplateChild(fragmentChildren[2]);

		const html = renderToString(fragment, { mode: 'hydrate' });
		const bindings = collectHydrationBindings(fragment);

		expect(bindings.size).toBe(3);
		expect(bindings.get(0)?.name).toBe('id');
		expect(bindings.get(1)?.name).toBe('id');
		expect(bindings.get(2)?.name).toBe('id');

		for (const [index, binding] of bindings) {
			const markerName = resolveHydrationMarkerAttributeName(index);
			const descriptor = serializeBindingDescriptor(binding.kind, binding.name);
			expect(html).toContain(`${markerName}="${descriptor}"`);
		}

		const decIndices = collectTemplateAttributeMarkerIndices(decButton, 0);
		const spanIndices = collectTemplateAttributeMarkerIndices(metricSpan, decIndices.nextIndex);
		const incIndices = collectTemplateAttributeMarkerIndices(incButton, spanIndices.nextIndex);

		expect(decIndices.nextIndex).toBe(1);
		expect(spanIndices.nextIndex).toBe(2);
		expect(incIndices.nextIndex).toBe(3);
		expect(incIndices.nextIndex).toBe(bindings.size);
	});
});
