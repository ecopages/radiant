import { beforeEach, describe, expect, test } from 'vitest';
import { createRoot } from '../src/index.ts';
import { jsx, jsxs } from '../src/jsx-runtime.ts';

const SVG = 'http://www.w3.org/2000/svg';
const HTML = 'http://www.w3.org/1999/xhtml';

describe('nested templates mounted from one tree', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('a nested child that changes shape is replaced alone; its siblings and parent keep their nodes', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const row = (editing: boolean) =>
			jsxs('tr', {
				children: [
					jsx('td', { class: 'id', children: '1' }),
					jsx('td', {
						class: 'cell',
						children: editing ? jsx('input', { value: 'a' }) : jsx('span', { children: 'a' }),
					}),
				],
			});

		root.render(row(false));
		const tr = container.querySelector('tr');
		const idCell = container.querySelector('.id');
		expect(container.querySelector('.cell span')?.textContent).toBe('a');

		root.render(row(true));

		expect(container.querySelector('tr')).toBe(tr);
		expect(container.querySelector('.id')).toBe(idCell);
		expect(container.querySelector('.cell input')).not.toBeNull();
		expect(container.querySelector('.cell span')).toBeNull();
	});

	test('different templates with the same nested shapes, mounted in the same place, never share a tree', () => {
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render([
			jsx('p', { key: 'p', children: jsx('b', { children: 'one' }) }),
			jsx('section', { key: 'section', children: jsx('b', { children: 'two' }) }),
			jsx('p', { key: 'p2', children: jsx('i', { children: 'three' }) }),
		]);

		expect(Array.from(container.children, (element) => element.outerHTML)).toEqual([
			'<p><b>one</b></p>',
			'<section><b>two</b></section>',
			'<p><i>three</i></p>',
		]);
	});

	test('every mount clones its own nodes, and a keyed list built in one batch keeps its order and nodes', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const rows = (labels: string[]) =>
			jsx('table', {
				children: jsx('tbody', {
					children: labels.map((label) =>
						jsx('tr', {
							key: label,
							children: jsx('td', { children: jsx('a', { class: 'lbl', children: label }) }),
						}),
					),
				}),
			});
		const labels = () => Array.from(container.querySelectorAll('.lbl'), (link) => link.textContent);

		root.render(rows(['a', 'b', 'c']));
		const links = Array.from(container.querySelectorAll('.lbl'));
		expect(labels()).toEqual(['a', 'b', 'c']);
		expect(new Set(links).size).toBe(3);

		root.render(rows(['x', 'a', 'y', 'z', 'c']));
		expect(labels()).toEqual(['x', 'a', 'y', 'z', 'c']);
		expect(container.querySelectorAll('.lbl')[1]).toBe(links[0]);
		expect(container.querySelectorAll('.lbl')[4]).toBe(links[2]);

		root.render(rows(['c', 'a']));
		expect(labels()).toEqual(['c', 'a']);
		expect(container.querySelectorAll('.lbl')[0]).toBe(links[2]);
	});

	test('elements nested under svg are created in the SVG namespace', () => {
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx('div', {
				children: jsx('svg', {
					viewBox: '0 0 10 10',
					children: jsx('g', { children: jsx('circle', { r: '1' }) }),
				}),
			}),
		);

		expect(container.querySelector('g')?.namespaceURI).toBe(SVG);
		expect(container.querySelector('circle')?.namespaceURI).toBe(SVG);
	});

	test('a template mounted inside svg after an HTML mount of the same shape gets the SVG namespace', () => {
		const html = document.createElement('div');
		const svgHost = document.createElement('div');
		const shape = () => jsx('a', { href: '#x', children: jsx('title', { children: 't' }) });

		createRoot(html).render(jsx('div', { children: shape() }));
		createRoot(svgHost).render(jsx('svg', { children: shape() }));

		expect(html.querySelector('a')?.namespaceURI).toBe(HTML);
		expect(svgHost.querySelector('a')?.namespaceURI).toBe(SVG);
		expect(svgHost.querySelector('title')?.namespaceURI).toBe(SVG);
	});

	test('a keyed list inside svg creates its items in the SVG namespace', () => {
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			jsx('svg', {
				children: ['a', 'b'].map((id) => jsx('g', { key: id, children: jsx('circle', { id }) })),
			}),
		);

		expect(Array.from(container.querySelectorAll('circle'), (circle) => circle.namespaceURI)).toEqual([SVG, SVG]);
	});
});
