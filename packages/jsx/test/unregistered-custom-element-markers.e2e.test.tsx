import { beforeEach, describe, expect, test, vi } from 'vitest';
import { HYDRATE_UNREGISTERED_CUSTOM_ELEMENT_SIBLINGS_HTML } from './fixtures/hydrate-html.ts';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<typeof import('../src/jsx-runtime.ts')>('../src/jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../src/index.ts')>('../src/index.ts');

const REGISTERED_HOST_TAG = 'jsx-registered-marker-host';
const UNREGISTERED_WIDGET_TAG = 'third-party-widget';

class RegisteredMarkerHost extends HTMLElement {}

if (!customElements.get(REGISTERED_HOST_TAG)) {
	customElements.define(REGISTERED_HOST_TAG, RegisteredMarkerHost);
}

describe('unregistered custom-element hydration markers', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('hydrates mixed custom-element siblings so the button click listener fires', async () => {
		const [{ jsx, jsxs }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.body.appendChild(document.createElement('div'));
		const handleClick = vi.fn();
		const view = jsxs('div', {
			children: [
				jsx(REGISTERED_HOST_TAG, { label: 'registered' }),
				jsx(UNREGISTERED_WIDGET_TAG, {
					label: 'x',
					'on:change': () => undefined,
				}),
				jsx('button', { 'on:click': handleClick, children: 'go' }),
			],
		});

		container.innerHTML = HYDRATE_UNREGISTERED_CUSTOM_ELEMENT_SIBLINGS_HTML;
		const serverButton = container.querySelector('button');

		createRoot(container).hydrate(view);

		const hydratedButton = container.querySelector('button');
		expect(hydratedButton).toBe(serverButton);
		expect(container.innerHTML).not.toContain('data-radiant-jsx-bind-');

		hydratedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});
});
