import { describe, it } from 'vitest';
import { expectGroupFollowsCheckbox } from './checkbox-group.fixture';

/** Reverse-order twin of `checkbox-before-group.test.ts`; a separate file because vitest isolates module graphs per file. */
describe('checkbox group over built entries, reverse order', () => {
	it('reports the value of a checked checkbox when checkbox-group loads before checkbox', async () => {
		await import('../../dist/components/ui/checkbox-group/index.js');
		await import('../../dist/components/ui/checkbox/index.js');
		await expectGroupFollowsCheckbox();
	});
});
