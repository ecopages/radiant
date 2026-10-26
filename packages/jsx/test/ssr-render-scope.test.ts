import { describe, expect, test } from 'vitest';
import { jsx } from '../src/jsx-runtime.ts';
import { createLazyNodeAsyncLocalStorage } from '../src/ssr/lazy-async-local-storage.ts';
import {
	createServerHydrationBindingState,
	getActiveSsrScopeValue,
	renderToString,
	withActiveSsrScopeValue,
	withServerHydrationBindingState,
} from '../src/server.ts';

const SCOPE_KEY = Symbol.for('@ecopages/jsx.test.ssr-render-scope');

function clickView() {
	return jsx('button', {
		'on:click': () => undefined,
		children: 'go',
	});
}

describe('SSR render scope (async-local)', () => {
	test('createLazyNodeAsyncLocalStorage keeps one module-owned ALS per factory', () => {
		const getAls = createLazyNodeAsyncLocalStorage<{ id: number }>();

		expect(getAls()).toBe(getAls());

		const value = getAls().run({ id: 7 }, () => getAls().getStore()?.id);
		expect(value).toBe(7);
	});

	test('inherits nested scope values within one async tree', async () => {
		const outer = { frames: [1] };
		const inner = { frames: [1, 2] };

		await withActiveSsrScopeValue(SCOPE_KEY, outer, async () => {
			expect(getActiveSsrScopeValue(SCOPE_KEY)).toBe(outer);

			await withActiveSsrScopeValue(SCOPE_KEY, inner, async () => {
				await Promise.resolve();
				expect(getActiveSsrScopeValue(SCOPE_KEY)).toBe(inner);
			});

			expect(getActiveSsrScopeValue(SCOPE_KEY)).toBe(outer);
		});

		expect(getActiveSsrScopeValue(SCOPE_KEY)).toBeUndefined();
	});

	test('isolates concurrent SSR scope trees', async () => {
		const [first, second] = await Promise.all([
			withActiveSsrScopeValue(SCOPE_KEY, { id: 1 }, async () => {
				await Promise.resolve();
				return getActiveSsrScopeValue<{ id: number }>(SCOPE_KEY)?.id;
			}),
			withActiveSsrScopeValue(SCOPE_KEY, { id: 2 }, async () => {
				await Promise.resolve();
				return getActiveSsrScopeValue<{ id: number }>(SCOPE_KEY)?.id;
			}),
		]);

		expect(first).toBe(1);
		expect(second).toBe(2);
		expect(getActiveSsrScopeValue(SCOPE_KEY)).toBeUndefined();
	});

	test('does not leak scope from abandoned async renders into sibling work', async () => {
		void withActiveSsrScopeValue(SCOPE_KEY, { frames: [1] }, async () => {
			await new Promise(() => {});
		});

		await Promise.resolve();

		expect(getActiveSsrScopeValue(SCOPE_KEY)).toBeUndefined();
	});

	test('Independent hydrate roots each start at marker index 0 inside a render scope', () => {
		const [first, second] = withActiveSsrScopeValue(SCOPE_KEY, { unrelated: true }, () => [
			renderToString(clickView(), { mode: 'hydrate' }),
			renderToString(clickView(), { mode: 'hydrate' }),
		]);

		expect(first).toBe('<button data-radiant-jsx-bind-0="event:click">go</button>');
		expect(second).toBe('<button data-radiant-jsx-bind-0="event:click">go</button>');
	});

	test('two hydrate roots inside withServerHydrationBindingState share one namespace', () => {
		const [first, second] = withServerHydrationBindingState(createServerHydrationBindingState(), () => [
			renderToString(clickView(), { mode: 'hydrate' }),
			renderToString(clickView(), { mode: 'hydrate' }),
		]);

		expect(first).toBe('<button data-radiant-jsx-bind-0="event:click">go</button>');
		expect(second).toBe('<button data-radiant-jsx-bind-1="event:click">go</button>');
	});
});
