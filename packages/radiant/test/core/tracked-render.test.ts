import { state } from '@ecopages/signals';
import { expect, test } from 'vitest';
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
