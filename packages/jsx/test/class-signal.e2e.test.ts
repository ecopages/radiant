import { state } from '@ecopages/signals';
import { beforeEach, describe, expect, test } from 'vitest';
import { createRoot } from '../src/index.ts';
import { jsx } from '../src/jsx-runtime.ts';
import { renderToString } from '../src/ssr/server-render.ts';

describe('a signal in class, classes or style', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('class binds the signal value on the server', () => {
		expect(renderToString(jsx('tr', { class: state('danger') }))).toBe('<tr class="danger"></tr>');
	});

	test('class binds the signal value and follows it on the client', () => {
		const cls = state('danger');
		const container = document.createElement('div');
		createRoot(container).render(jsx('tr', { class: cls }));
		const row = container.querySelector('tr')!;

		expect(row.getAttribute('class')).toBe('danger');
		cls.set('active');
		expect(row.getAttribute('class')).toBe('active');
		cls.set('');
		expect(row.hasAttribute('class')).toBe(false);
	});

	test('a signal holding a class map or list is normalized like a static one', () => {
		const cls = state<Record<string, boolean> | string[]>({ on: true, off: false });
		const container = document.createElement('div');
		createRoot(container).render(jsx('p', { class: cls }));

		expect(container.querySelector('p')?.getAttribute('class')).toBe('on');
		cls.set(['a', 'b']);
		expect(container.querySelector('p')?.getAttribute('class')).toBe('a b');
	});

	test('classes merges a signal with a static class, on the server and the client', () => {
		const flags = state<Record<string, boolean>>({ selected: true });
		expect(renderToString(jsx('li', { class: 'item', classes: flags }))).toBe('<li class="item selected"></li>');

		const container = document.createElement('div');
		createRoot(container).render(jsx('li', { class: 'item', classes: flags }));
		const item = container.querySelector('li')!;

		expect(item.getAttribute('class')).toBe('item selected');
		flags.set({ selected: false });
		expect(item.getAttribute('class')).toBe('item');
	});

	test('style binds a signal holding a style object', () => {
		const style = state<Record<string, string>>({ color: 'red' });
		const container = document.createElement('div');
		createRoot(container).render(jsx('p', { style }));
		const paragraph = container.querySelector('p')!;

		expect(paragraph.getAttribute('style')).toBe('color: red');
		style.set({ fontSize: '12px' });
		expect(paragraph.getAttribute('style')).toBe('font-size: 12px');
	});

	test('a style signal that holds a function drops it, and the next value takes over', () => {
		const fn = () => 'secret source';
		const style = state<unknown>({ color: 'red' });
		const container = document.createElement('div');
		createRoot(container).render(jsx('p', { style: style as never }));
		const paragraph = container.querySelector('p')!;

		style.set(fn);
		expect(paragraph.hasAttribute('style')).toBe(false);
		style.set({ color: fn, top: '1px' });
		expect(paragraph.getAttribute('style')).toBe('top: 1px');
		style.set({ color: 'blue' });
		expect(paragraph.getAttribute('style')).toBe('color: blue');
		expect(container.innerHTML).not.toContain('secret');
	});

	test('a class signal that holds a function, or a list with one, keeps only the other tokens', () => {
		const fn = () => 'secret source';
		const cls = state<unknown>(['a', fn]);
		const container = document.createElement('div');
		createRoot(container).render(jsx('p', { class: cls as never }));
		const paragraph = container.querySelector('p')!;

		expect(paragraph.getAttribute('class')).toBe('a');
		cls.set(fn);
		expect(paragraph.hasAttribute('class')).toBe(false);
		cls.set(['b', fn, { c: true }]);
		expect(paragraph.getAttribute('class')).toBe('b c');
		expect(container.innerHTML).not.toContain('secret');
	});

	test('re-rendering with the same class signal keeps one subscription', () => {
		const cls = state('a');
		const container = document.createElement('div');
		const root = createRoot(container);
		let subscriptions = 0;
		const counted = {
			get: () => cls.get(),
			subscribe: (notify: (value: string) => void) => {
				subscriptions += 1;
				return cls.subscribe(notify);
			},
		};

		root.render(jsx('p', { class: counted }));
		root.render(jsx('p', { class: counted }));
		root.render(jsx('p', { class: counted }));

		expect(subscriptions).toBe(1);
	});
});
