import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createDemoStore } from './demo-form-store';

function squash(source: string): string {
	return source.replace(/\s+/g, '');
}

describe('createDemoStore', () => {
	it('keeps the fact of a required field missing from the initial values', async () => {
		const store = createDemoStore({ initial: {} });

		store.reportNative({ email: { type: 'valueMissing' } });

		expect(await store.validate()).toBe(false);
		expect(store.getSnapshot().errors.email?.type).toBe('valueMissing');
	});

	it('ignores a fact for a removed row and clears a fact reported null', async () => {
		const store = createDemoStore({ initial: { rows: [{ x: 'a' }] } });

		store.reportNative({ 'rows.3.x': { type: 'valueMissing' }, 'rows.0.x': { type: 'tooShort' } });
		expect(await store.validate()).toBe(false);
		expect(Object.keys(store.getSnapshot().errors)).toEqual(['rows.0.x']);

		store.reportNative({ 'rows.0.x': null });
		expect(await store.validate()).toBe(true);
	});

	it('shows an error only for a path the user changed or left', () => {
		const store = createDemoStore({
			initial: { a: '' },
			rules: { a: (value) => (value ? undefined : 'Required') },
		});
		expect(store.getSnapshot().errors).toEqual({});

		store.blur('a');

		expect(store.getSnapshot().errors.a?.message).toBe('Required');
	});

	it('mirrors the source in the store guide', () => {
		const guide = readFileSync(
			new URL('../components/getting-started/write-a-form-state-store.mdx', import.meta.url),
			'utf8',
		);
		const block = guide.slice(guide.indexOf('## A minimal store')).match(/```ts\n([\s\S]*?)```/)?.[1] ?? '';
		const source = readFileSync(new URL('./demo-form-store.ts', import.meta.url), 'utf8');

		expect(squash(block)).toBe(squash(source));
	});
});
