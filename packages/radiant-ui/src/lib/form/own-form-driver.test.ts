import { describe, expect, it } from 'vitest';
import { FormStore } from './form-store';
import { OwnFormDriver } from './own-form-driver';

describe('OwnFormDriver', () => {
	it('drives the store it wraps and reports no warnings', async () => {
		const store = new FormStore<{ a: string }>({ defaultValues: { a: 'x' } });
		const driver = new OwnFormDriver(store);
		const handle = driver.register({
			element: document.createElement('div'),
			name: 'a',
			getValue: () => 'x',
			setValue: () => {},
		});

		expect(driver.getRegisteredFieldNames()).toEqual(['a']);
		expect(driver.warnings).toEqual({});
		expect(() => driver.sync()).not.toThrow();
		const submitted: unknown[] = [];
		await driver.handleSubmit((values) => {
			submitted.push(values);
		});
		expect(submitted).toEqual([{ a: 'x' }]);
		handle.unregister();
		expect(driver.getRegisteredFieldNames()).toEqual([]);
	});

	it('leaves driver-only members off the store', () => {
		const store = new FormStore();

		expect('sync' in store).toBe(false);
		expect('warnings' in store).toBe(false);
		expect('focus' in store).toBe(false);
	});
});
