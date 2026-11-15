import { afterEach, describe, expect, it } from 'vitest';
import { applyFloatingPosition, attachFloating } from './floating-position';

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

describe('floating position inside a containing block for fixed elements', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(containerStyle: string) {
		const container = document.createElement('div');
		container.style.cssText = `position: fixed; left: 120px; top: 90px; width: 300px; height: 300px; ${containerStyle}`;
		const anchor = document.createElement('button');
		anchor.style.cssText = 'position: absolute; left: 20px; top: 20px; width: 80px; height: 30px;';
		const floating = document.createElement('div');
		floating.style.cssText = 'width: 100px; height: 40px;';
		container.append(anchor, floating);
		document.body.append(container);
		return { container, anchor, floating };
	}

	it('places the surface under the anchor when an ancestor is transformed', () => {
		const { anchor, floating } = mount('transform: translate(30px, 10px);');

		applyFloatingPosition(anchor, floating, 'bottom-start', 8);

		const anchorRect = anchor.getBoundingClientRect();
		const rect = floating.getBoundingClientRect();
		expect(rect.top).toBeCloseTo(anchorRect.bottom + 8, 0);
		expect(rect.left).toBeCloseTo(anchorRect.left, 0);
	});

	it('follows an ancestor that is scaled, as a dialog surface is during its enter transition', () => {
		const { anchor, floating } = mount('transform: scale(0.8); transform-origin: top left;');

		applyFloatingPosition(anchor, floating, 'bottom-start', 8);

		const anchorRect = anchor.getBoundingClientRect();
		const rect = floating.getBoundingClientRect();
		expect(rect.top).toBeCloseTo(anchorRect.bottom + 8, 0);
		expect(rect.left).toBeCloseTo(anchorRect.left, 0);
	});

	it('is unchanged when no ancestor is a containing block', () => {
		const { anchor, floating } = mount('');

		applyFloatingPosition(anchor, floating, 'bottom-start', 8);

		expect(floating.getBoundingClientRect().top).toBeCloseTo(anchor.getBoundingClientRect().bottom + 8, 0);
	});

	it('positions again when a real transition ends on an ancestor and the containing block is gone', async () => {
		const { container, anchor, floating } = mount(
			'transform: translate(30px, 10px); transition: transform 60ms linear;',
		);
		const cleanup = attachFloating({ anchor, floating, getPlacement: () => 'bottom-start', gap: 8 });
		const ended = new Promise((resolve) => container.addEventListener('transitionend', resolve, { once: true }));

		container.style.transform = 'none';
		await ended;

		expect(floating.getBoundingClientRect().top).toBeCloseTo(anchor.getBoundingClientRect().bottom + 8, 0);
		cleanup();
	});
});
