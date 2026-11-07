import { describe, expect, test, vi } from 'vitest';
import { State, mapItems } from '../index';

type Row = { id: number; label: State<string> };

const row = (id: number): Row => ({ id, label: new State(`row ${id}`) });

describe('mapItems', () => {
	test('maps each item once and keeps its result object while it stays in the list', () => {
		const [a, b, c] = [row(1), row(2), row(3)];
		const rows = new State<Row[]>([a, b, c]);
		const project = vi.fn((item: Row) => ({ id: item.id }));
		const mapped = mapItems(rows, project);

		const first = mapped.get();
		rows.set([c, a, b]);
		const swapped = mapped.get();

		expect(project).toHaveBeenCalledTimes(3);
		expect(swapped.map((result) => result.id)).toEqual([3, 1, 2]);
		expect(swapped[0]).toBe(first[2]);
		expect(swapped[1]).toBe(first[0]);
	});

	test('projects only the items that are new, and drops the results of items that left', () => {
		const [a, b, c] = [row(1), row(2), row(3)];
		const rows = new State<Row[]>([a, b]);
		const project = vi.fn((item: Row) => ({ id: item.id }));
		const mapped = mapItems(rows, project);
		const [resultA] = mapped.get();

		rows.set([a, c]);
		expect(mapped.get()[0]).toBe(resultA);
		expect(project).toHaveBeenCalledTimes(3);

		rows.set([a, b]);
		mapped.get();
		expect(project).toHaveBeenCalledTimes(4);
		expect(project).toHaveBeenLastCalledWith(b);
	});

	test('runs project untracked, so a result that reads its item signals does not re-map the list', () => {
		const a = row(1);
		const rows = new State<Row[]>([a]);
		const project = vi.fn((item: Row) => item.label.get());
		const mapped = mapItems(rows, project);

		expect(mapped.get()).toEqual(['row 1']);
		a.label.set('renamed');
		expect(mapped.get()).toEqual(['row 1']);
		expect(project).toHaveBeenCalledTimes(1);
	});

	test('accepts a function that reads signals, and shares one result for an item listed twice', () => {
		const a = row(1);
		const rows = new State<Row[]>([a, a]);
		const mapped = mapItems(
			() => rows.get(),
			(item) => ({ id: item.id }),
		);
		const [first, second] = mapped.get();

		expect(first).toBe(second);
	});

	test('notifies subscribers when the list changes', () => {
		const rows = new State<Row[]>([row(1)]);
		const mapped = mapItems(rows, (item) => item.id);
		const notify = vi.fn();
		mapped.subscribe(notify);

		rows.set([row(2), row(3)]);

		expect(mapped.get()).toEqual([2, 3]);
		expect(notify).toHaveBeenCalled();
	});
});
