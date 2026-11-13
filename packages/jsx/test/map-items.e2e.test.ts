import { state, type State } from '@ecopages/signals';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createRoot, Fragment, MapItems } from '../src/index.ts';
import { jsx, jsxs } from '../src/jsx-runtime.ts';

type Row = { id: number; label: State<string> };

const row = (id: number): Row => ({ id, label: state(`row ${id}`) });
const labels = (container: Element) => Array.from(container.querySelectorAll('li'), (item) => item.textContent);

describe('MapItems', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders each item once, and a swap moves the existing rows without rendering them again', () => {
		const rows = state<Row[]>([row(1), row(2), row(3)]);
		const render = vi.fn((item: Row) => jsx('li', { children: item.label }));
		const container = document.createElement('div');
		createRoot(container).render(jsx('ul', { children: jsx(MapItems<Row>, { each: rows, children: render }) }));
		const [one, two, three] = Array.from(container.querySelectorAll('li'));

		const [a, b, c] = rows.get();
		rows.set([c!, b!, a!]);

		expect(labels(container)).toEqual(['row 3', 'row 2', 'row 1']);
		expect(Array.from(container.querySelectorAll('li'))).toEqual([three, two, one]);
		expect(render).toHaveBeenCalledTimes(3);
	});

	test('renders only new items, keeps the signals in each row live, and drops removed rows', () => {
		const rows = state<Row[]>([row(1)]);
		const render = vi.fn((item: Row) => jsx('li', { children: item.label }));
		const container = document.createElement('div');
		createRoot(container).render(jsx('ul', { children: jsx(MapItems<Row>, { each: rows, children: render }) }));
		const first = rows.get()[0]!;

		rows.set([first, row(2)]);
		first.label.set('renamed');
		rows.set([rows.get()[1]!]);

		expect(labels(container)).toEqual(['row 2']);
		expect(render).toHaveBeenCalledTimes(2);
	});

	test('keeps its rows and subscription when the view around it renders again', () => {
		const rows = state<Row[]>([row(1), row(2)]);
		const render = vi.fn((item: Row) => jsx('li', { children: item.label }));
		const container = document.createElement('div');
		const root = createRoot(container);
		const view = (title: string) =>
			jsxs('section', {
				children: [
					jsx('h2', { children: title }),
					jsx('ul', { children: jsx(MapItems<Row>, { each: rows, children: render }) }),
				],
			});

		root.render(view('first'));
		const items = Array.from(container.querySelectorAll('li'));
		root.render(view('second'));
		rows.set([...rows.get(), row(3)]);

		expect(container.querySelector('h2')?.textContent).toBe('second');
		expect(Array.from(container.querySelectorAll('li')).slice(0, 2)).toEqual(items);
		expect(labels(container)).toEqual(['row 1', 'row 2', 'row 3']);
		expect(render).toHaveBeenCalledTimes(3);
	});

	test('keeps a key the row sets itself', () => {
		const rows = state<Row[]>([row(1), row(2)]);
		const container = document.createElement('div');
		createRoot(container).render(
			jsx('ul', {
				children: jsx(MapItems<Row>, {
					each: rows,
					children: (item: Row) => jsx('li', { children: item.label }, String(item.id)),
				}),
			}),
		);
		const [one, two] = Array.from(container.querySelectorAll('li'));

		rows.set([...rows.get()].reverse());

		expect(Array.from(container.querySelectorAll('li'))).toEqual([two, one]);
	});

	test('keys primitive items by value', () => {
		const items = state<string[]>(['a', 'b', 'c']);
		const container = document.createElement('div');
		createRoot(container).render(
			jsx('ul', {
				children: jsx(MapItems<string>, {
					each: items,
					children: (item: string) => jsx('li', { children: item }),
				}),
			}),
		);
		const [, b] = Array.from(container.querySelectorAll('li'));

		items.set(['b', 'c']);

		expect(labels(container)).toEqual(['b', 'c']);
		expect(container.querySelector('li')).toBe(b);
	});
});

describe('a keyed list that receives the same row object again', () => {
	test('skips that row, while a new row with equal values still applies its bindings', () => {
		const set = vi.fn();
		class Counted extends HTMLElement {
			set value(next: unknown) {
				set(next);
			}
		}
		customElements.define('map-items-counted-test', Counted);
		const container = document.createElement('div');
		document.body.append(container);
		const root = createRoot(container);
		const make = () => jsx('map-items-counted-test', { 'prop:value': 'x' }, 'only');

		const same = make();
		root.render(jsx('div', { children: [same] }));
		root.render(jsx('div', { children: [same] }));
		expect(set).toHaveBeenCalledTimes(1);

		root.render(jsx('div', { children: [make()] }));
		expect(set).toHaveBeenCalledTimes(2);
	});
});

describe('a keyed Fragment', () => {
	test('moves its whole group of nodes when the groups reorder', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const group = (id: string) =>
			jsxs(Fragment, { children: [jsx('dt', { children: id }), jsx('dd', { children: `${id} detail` })] }, id);

		root.render(jsx('dl', { children: [group('a'), group('b')] }));
		const [aTerm, , bTerm] = Array.from(container.querySelectorAll('dt, dd'));
		root.render(jsx('dl', { children: [group('b'), group('a')] }));

		const nodes = Array.from(container.querySelectorAll('dt, dd'));
		expect(nodes.map((node) => node.textContent)).toEqual(['b', 'b detail', 'a', 'a detail']);
		expect(nodes[0]).toBe(bTerm);
		expect(nodes[2]).toBe(aTerm);
	});
});
