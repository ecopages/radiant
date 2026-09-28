import { describe, expect, test } from 'vitest';
import { debounce } from '../../src/decorators/debounce';

describe('@debounce', () => {
	test('decorator debounces a method correctly', async () => {
		class Test {
			callCount = 0;
			@debounce(5)
			method(): void {
				this.callCount++;
			}
		}

		const test = new Test();
		Array.from({ length: 3 }, () => test.method());
		await new Promise((resolve) => setTimeout(resolve, 10));
		Array.from({ length: 3 }, () => test.method());
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(test.callCount).toBe(2);
	});

	test('decorator keeps debounce state isolated per instance', async () => {
		class Test {
			callCount = 0;

			@debounce(5)
			method(): void {
				this.callCount++;
			}
		}

		const first = new Test();
		const second = new Test();

		first.method();
		second.method();

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(first.callCount).toBe(1);
		expect(second.callCount).toBe(1);
	});
});
