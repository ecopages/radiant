import { State, state, subtle } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { TrackedRender } from '../../src/core/tracked-render';

test('tracks render dependencies only while connected', () => {
	const source = state(1);
	let updates = 0;
	const render = new TrackedRender<number>(() => {
		updates += 1;
	});
	expect(render.evaluate(() => source.get(), false)).toBe(1);
	source.set(2);
	expect(updates).toBe(0);
	expect(render.evaluate(() => source.get(), true)).toBe(2);
	source.set(3);
	expect(updates).toBe(1);
	render.disconnect();
	source.set(4);
	expect(updates).toBe(1);
});

function hookedState<Value>(value: Value) {
	const counts = { watched: 0, unwatched: 0 };
	const source = new State(value, {
		[subtle.watched]() {
			counts.watched += 1;
		},
		[subtle.unwatched]() {
			counts.unwatched += 1;
		},
	});
	return { source, counts };
}

function createTracked() {
	const calls = { updates: 0 };
	const render = new TrackedRender<number>(() => {
		calls.updates += 1;
	});
	return { render, calls };
}

describe('TrackedRender watch order', () => {
	test('keeps a shared dependency watched across re-renders', () => {
		const { source, counts } = hookedState(0);
		const { render } = createTracked();
		for (let index = 0; index < 5; index += 1) {
			render.evaluate(() => source.get(), true);
		}
		expect(counts).toEqual({ watched: 1, unwatched: 0 });
		render.disconnect();
		expect(counts).toEqual({ watched: 1, unwatched: 1 });
	});

	test('requests exactly one update for a write after a re-render', () => {
		const { source } = hookedState(0);
		const { render, calls } = createTracked();
		render.evaluate(() => source.get(), true);
		render.evaluate(() => source.get(), true);
		source.set(1);
		expect(calls.updates).toBe(1);
	});

	test('stops watching the dependencies a later render no longer reads', () => {
		const first = hookedState(0);
		const second = hookedState(0);
		const { render, calls } = createTracked();
		render.evaluate(() => first.source.get(), true);
		render.evaluate(() => second.source.get(), true);
		expect(first.counts).toEqual({ watched: 1, unwatched: 1 });
		expect(second.counts).toEqual({ watched: 1, unwatched: 0 });
		first.source.set(1);
		expect(calls.updates).toBe(0);
		second.source.set(1);
		expect(calls.updates).toBe(1);
	});

	test('reconnect re-watches after a re-render and a disconnect', () => {
		const { source, counts } = hookedState(0);
		const { render, calls } = createTracked();
		render.evaluate(() => source.get(), true);
		render.evaluate(() => source.get(), true);
		render.disconnect();
		render.disconnect();
		expect(counts).toEqual({ watched: 1, unwatched: 1 });
		render.reconnect();
		expect(counts).toEqual({ watched: 2, unwatched: 1 });
		source.set(1);
		expect(calls.updates).toBe(1);
	});

	test('a disconnected evaluate does not watch or unwatch anything', () => {
		const { source, counts } = hookedState(0);
		const { render } = createTracked();
		render.evaluate(() => source.get(), true);
		render.disconnect();
		render.evaluate(() => source.get(), false);
		render.reconnect();
		expect(counts).toEqual({ watched: 2, unwatched: 1 });
	});

	test('a render that throws keeps the previous watch', () => {
		const { source, counts } = hookedState(0);
		const { render, calls } = createTracked();
		render.evaluate(() => source.get(), true);
		expect(() =>
			render.evaluate(() => {
				throw new Error('render failed');
			}, true),
		).toThrow('render failed');
		expect(counts).toEqual({ watched: 1, unwatched: 0 });
		source.set(1);
		expect(calls.updates).toBe(1);
	});

	test('a throwing watched hook keeps the previous watch', () => {
		const { source } = hookedState(0);
		const broken = new State(0, {
			[subtle.watched]() {
				throw new Error('watched failed');
			},
		});
		const { render, calls } = createTracked();
		render.evaluate(() => source.get(), true);
		expect(() => render.evaluate(() => broken.get(), true)).toThrow('watched failed');
		source.set(1);
		expect(calls.updates).toBe(1);
		render.disconnect();
		source.set(2);
		expect(calls.updates).toBe(1);
	});
});
