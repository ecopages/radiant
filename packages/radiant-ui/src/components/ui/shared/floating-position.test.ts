import { describe, expect, it } from 'vitest';
import { applyFloatingPosition, computeFloatingCoords } from './floating-position';
import type { RuiPlacement } from './placement';

function rect(left: number, top: number, width: number, height: number): DOMRect {
	return {
		left,
		top,
		right: left + width,
		bottom: top + height,
		width,
		height,
		x: left,
		y: top,
		toJSON: () => ({}),
	};
}

const viewport = { width: 800, height: 600, padding: 8 };
const size = { width: 120, height: 28 };
const gap = 8;

describe('computeFloatingCoords', () => {
	it('places top centered above the anchor', () => {
		const coords = computeFloatingCoords(rect(200, 200, 80, 32), size, 'top', gap, viewport);
		expect(coords.y).toBe(200 - size.height - gap);
		expect(coords.x).toBe(200 + 40 - size.width / 2);
	});

	it('flips top to bottom near the top edge', () => {
		const coords = computeFloatingCoords(rect(200, 20, 80, 32), size, 'top', gap, viewport);
		expect(coords.y).toBe(20 + 32 + gap);
		expect(coords.y).toBeGreaterThan(20);
	});

	it('shifts a top tooltip right when centered would clip the left edge', () => {
		const coords = computeFloatingCoords(rect(12, 200, 80, 32), size, 'top', gap, viewport);
		expect(coords.x).toBe(8);
		expect(coords.y).toBe(200 - size.height - gap);
	});

	it('keeps bottom-start left-aligned under the anchor', () => {
		const coords = computeFloatingCoords(rect(100, 100, 80, 32), size, 'bottom-start', gap, viewport);
		expect(coords.x).toBe(100);
		expect(coords.y).toBe(100 + 32 + gap);
	});

	it('flips bottom-start above near the bottom edge', () => {
		const coords = computeFloatingCoords(
			rect(100, 560, 80, 32),
			size,
			'bottom-start' satisfies RuiPlacement,
			gap,
			viewport,
		);
		expect(coords.y).toBe(560 - size.height - gap);
		expect(coords.x).toBe(100);
	});

	it('does not clamp the primary axis onto the anchor after a top flip', () => {
		const coords = computeFloatingCoords(rect(200, 16, 80, 32), size, 'top', gap, viewport);
		expect(coords.y).toBeGreaterThanOrEqual(16 + 32);
	});

	it('does not clear author width styles when matchAnchorWidth is false', () => {
		const anchor = document.createElement('div');
		const floating = document.createElement('div');
		floating.style.width = '240px';
		document.body.append(anchor, floating);
		anchor.getBoundingClientRect = () => rect(0, 0, 100, 32);

		applyFloatingPosition(anchor, floating, 'bottom-start', 4, { matchAnchorWidth: false });

		expect(floating.style.width).toBe('240px');
		anchor.remove();
		floating.remove();
	});

	it('clamps vertical coords within viewport padding when flipped above with limited space', () => {
		const tallSize = { width: 280, height: 400 };
		const coords = computeFloatingCoords(
			rect(100, 300, 80, 32),
			tallSize,
			'bottom-start' satisfies RuiPlacement,
			gap,
			viewport,
		);
		expect(coords.y).toBe(viewport.padding);
	});
});
