import { jsx } from '@ecopages/jsx';
import { describe, expect, test, vi } from 'vitest';
import { prepareRadiantApp } from '../../src/client/app-bootstrap';

describe('prepareRadiantApp', () => {
	test('returns the rendered app when no bootstrap is provided', async () => {
		const rendered = await prepareRadiantApp({
			app: () => jsx('main', { children: 'ready' }),
			context: {
				documentRoot: document,
				rootElement: document.body,
				shouldHydrate: true,
			},
		});

		expect(rendered.app).toEqual(jsx('main', { children: 'ready' }));
		expect(rendered.onStarted).toBeUndefined();
	});

	test('passes bootstrap props and exposes onStarted work', async () => {
		const onStarted = vi.fn();
		const rendered = await prepareRadiantApp({
			app: ({ label }: { label: string }) => jsx('main', { children: label }),
			bootstrap: ({ rootElement, shouldHydrate }) => ({
				appProps: {
					label: `${rootElement.tagName.toLowerCase()}:${shouldHydrate ? 'hydrate' : 'render'}`,
				},
				onStarted,
			}),
			context: {
				documentRoot: document,
				rootElement: document.body,
				shouldHydrate: true,
			},
		});

		expect(rendered.app).toEqual(jsx('main', { children: 'body:hydrate' }));
		await rendered.onStarted?.();
		expect(onStarted).toHaveBeenCalledTimes(1);
	});
});
