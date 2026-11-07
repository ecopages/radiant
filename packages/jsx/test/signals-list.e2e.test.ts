import { computed, state, type State } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { createRoot } from '../src/index.ts';
import { jsx, jsxs } from '../src/jsx-runtime.ts';

type Row = { id: number; label: State<string>; cls: State<string> };

describe('a computed keyed list with per-row signals, rendered once', () => {
	test("a row's own signals patch its text and class without rebuilding the list", () => {
		const rows = state<Row[]>([]);
		let builds = 0;
		const list = computed(() => {
			builds += 1;
			return rows
				.get()
				.map((row) =>
					jsxs('tr', {
						key: row.id,
						class: row.cls,
						children: [jsx('td', { children: row.id }), jsx('td', { children: row.label })],
					}),
				);
		});
		const container = document.createElement('div');
		createRoot(container).render(jsx('table', { children: jsx('tbody', { children: list }) }));

		rows.set([
			{ id: 1, label: state('first'), cls: state('') },
			{ id: 2, label: state('second'), cls: state('') },
		]);
		const firstRow = container.querySelector('tr');
		const buildsAfterSet = builds;

		rows.get()[0]!.label.set('renamed');
		rows.get()[1]!.cls.set('selected');

		expect(builds).toBe(buildsAfterSet);
		expect(container.querySelector('tr')).toBe(firstRow);
		expect(container.querySelectorAll('tr')[0]!.textContent).toBe('1renamed');
		expect(container.querySelectorAll('tr')[1]!.getAttribute('class')).toBe('selected');
	});

	test('changing the list keeps the nodes of rows whose keys stay', () => {
		const make = (id: number): Row => ({ id, label: state(`row ${id}`), cls: state('') });
		const rows = state<Row[]>([make(1), make(2), make(3)]);
		const list = computed(() =>
			rows.get().map((row) => jsx('li', { key: row.id, class: row.cls, children: row.label })),
		);
		const container = document.createElement('div');
		createRoot(container).render(jsx('ul', { children: list }));
		const [one, , three] = Array.from(container.querySelectorAll('li'));

		rows.set([rows.get()[2]!, rows.get()[0]!]);

		const items = Array.from(container.querySelectorAll('li'));
		expect(items.map((item) => item.textContent)).toEqual(['row 3', 'row 1']);
		expect(items[0]).toBe(three);
		expect(items[1]).toBe(one);
	});
});
