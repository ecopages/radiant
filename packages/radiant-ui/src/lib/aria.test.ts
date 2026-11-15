import { describe, expect, it } from 'vitest';
import { withDefaultAriaLabel } from './aria';

describe('withDefaultAriaLabel', () => {
	it('adds a structured label fallback without replacing consumer ARIA', () => {
		expect(withDefaultAriaLabel(undefined, 'fallback')).toEqual({ label: 'fallback' });
		expect(withDefaultAriaLabel({ expanded: true }, 'fallback')).toEqual({
			expanded: true,
			label: 'fallback',
		});
		expect(withDefaultAriaLabel({ labelledby: 'heading' }, 'fallback')).toEqual({
			label: 'fallback',
			labelledby: 'heading',
		});
		expect(withDefaultAriaLabel({ label: 'structured' }, 'fallback')).toEqual({ label: 'structured' });
	});
});
