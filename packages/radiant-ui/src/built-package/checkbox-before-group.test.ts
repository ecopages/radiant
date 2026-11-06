import { describe, it } from 'vitest';
import { expectGroupFollowsCheckbox } from './checkbox-group.fixture';

/** Imports the built package (`dist/`) with the checkbox entry first, the order the docs use. */
describe('checkbox group over built entries', () => {
	it('reports the value of a checked checkbox when checkbox loads before checkbox-group', async () => {
		await import('../../dist/components/ui/checkbox/index.js');
		await import('../../dist/components/ui/checkbox-group/index.js');
		await expectGroupFollowsCheckbox();
	});
});
