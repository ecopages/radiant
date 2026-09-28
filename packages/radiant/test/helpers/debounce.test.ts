import { describe, expect, test } from 'vitest';
import { debounce } from '../../src/helpers/debounce';

describe('helpers/debounce', () => {
	test('debounces repeated calls', async () => {
		let callCount = 0;
		const debounced = debounce(() => {
			callCount += 1;
		}, 5);

		debounced();
		debounced();
		debounced();

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(callCount).toBe(1);
	});

	test('exposes pending, flush, and cancel', async () => {
		let value = 0;
		const debounced = debounce((nextValue: number) => {
			value = nextValue;
			return value;
		}, 5);

		debounced(2);
		expect(debounced.pending()).toBe(true);
		expect(debounced.flush()).toBe(2);
		expect(debounced.pending()).toBe(false);
		expect(value).toBe(2);

		debounced(4);
		debounced.cancel();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(value).toBe(2);
		expect(debounced.pending()).toBe(false);
	});

	test('preserves the callback context', () => {
		const state = {
			value: 0,
			update: debounce(function (this: { value: number }, nextValue: number) {
				this.value = nextValue;
				return this.value;
			}, 5),
		};

		state.update(3);

		expect(state.update.flush()).toBe(3);
		expect(state.value).toBe(3);
	});
});
