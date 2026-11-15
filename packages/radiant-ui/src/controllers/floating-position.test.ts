import { describe, expect, it } from 'vitest';
import { applyFloatingPosition } from './floating-position';

describe('applyFloatingPosition', () => {
	it('does not clear author width styles when matchAnchorWidth is false', () => {
		const anchor = document.createElement('div');
		const floating = document.createElement('div');
		floating.style.width = '240px';
		document.body.append(anchor, floating);
		anchor.getBoundingClientRect = () => new DOMRect(0, 0, 100, 32);

		applyFloatingPosition(anchor, floating, 'bottom-start', 4, { matchAnchorWidth: false });

		expect(floating.style.width).toBe('240px');
		anchor.remove();
		floating.remove();
	});
});
