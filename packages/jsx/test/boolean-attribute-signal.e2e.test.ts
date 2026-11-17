import { computed, state } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { createRoot } from '../src/index.ts';
import { jsx } from '../src/jsx-runtime.ts';
import { renderToString } from '../src/ssr/server-render.ts';

describe('a signal on a standard boolean attribute', () => {
	test('sets presence for a boolean and the text for any other value, whatever its first value', () => {
		const hidden = state<boolean | string | undefined>(undefined);
		const disabled = state<boolean | undefined>(undefined);
		const container = document.createElement('div');
		createRoot(container).render(jsx('div', { children: [jsx('p', { hidden }), jsx('x-field', { disabled })] }));
		const paragraph = container.querySelector('p')!;
		const field = container.querySelector('x-field')!;

		expect(paragraph.hasAttribute('hidden')).toBe(false);
		expect(field.hasAttribute('disabled')).toBe(false);

		hidden.set(true);
		disabled.set(true);

		expect(paragraph.getAttribute('hidden')).toBe('');
		expect(field.getAttribute('disabled')).toBe('');

		hidden.set('until-found');

		expect(paragraph.getAttribute('hidden')).toBe('until-found');

		hidden.set(false);
		disabled.set(false);

		expect(paragraph.hasAttribute('hidden')).toBe(false);
		expect(field.hasAttribute('disabled')).toBe(false);
	});

	test('a computed that builds the element does not depend on the bound signal', () => {
		const hidden = state(true);
		let runs = 0;
		const view = computed(() => {
			runs += 1;
			return jsx('p', { hidden });
		});
		const container = document.createElement('div');
		createRoot(container).render(jsx('div', { children: view }));

		hidden.set(false);

		expect(container.querySelector('p')!.hasAttribute('hidden')).toBe(false);
		expect(runs).toBe(1);
	});

	test('the server writes a true signal as an empty attribute', () => {
		expect(renderToString(jsx('p', { hidden: state(true), inert: state(false) }))).toBe('<p hidden=""></p>');
	});
});
