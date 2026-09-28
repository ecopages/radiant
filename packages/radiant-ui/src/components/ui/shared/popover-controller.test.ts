import { describe, expect, it } from 'vitest';
import {
	PopoverController,
	popoverContains,
	shouldDismissPopoverFocus,
	shouldDismissPopoverPointer,
} from './popover-controller';

describe('popover-controller helpers', () => {
	it('popoverContains returns true for anchor and floating descendants', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		const child = document.createElement('span');
		floating.append(child);
		document.body.append(anchor, floating);

		expect(popoverContains(anchor, floating, anchor)).toBe(true);
		expect(popoverContains(anchor, floating, child)).toBe(true);
		expect(popoverContains(anchor, floating, document.body)).toBe(false);

		anchor.remove();
		floating.remove();
	});

	it('shouldDismissPopoverFocus ignores focus moves inside the tree', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		const item = document.createElement('button');
		floating.append(item);
		document.body.append(anchor, floating);

		expect(shouldDismissPopoverFocus(anchor, floating, item)).toBe(false);
		expect(shouldDismissPopoverFocus(anchor, floating, document.body)).toBe(true);

		anchor.remove();
		floating.remove();
	});

	it('shouldDismissPopoverPointer ignores clicks inside the tree', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		document.body.append(anchor, floating);

		expect(shouldDismissPopoverPointer(anchor, floating, anchor)).toBe(false);
		expect(shouldDismissPopoverPointer(anchor, floating, floating)).toBe(false);
		expect(shouldDismissPopoverPointer(anchor, floating, document.body)).toBe(true);

		anchor.remove();
		floating.remove();
	});

	it('retains a portaled surface until teardown', () => {
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		let open = true;
		let configuredFloating: HTMLElement | null = floating;
		const controller = new PopoverController({
			getAnchor: () => anchor,
			getFloating: () => configuredFloating,
			getOpen: () => open,
			getPlacement: () => 'bottom',
			portal: true,
		});
		document.body.append(anchor, floating);

		controller.sync();
		configuredFloating = null;
		expect(controller.getFloatingElement()).toBe(floating);

		open = false;
		controller.sync();
		expect(floating.hidden).toBe(true);
		expect(floating.parentNode).toBe(document.body);
		controller.destroy();
		expect(floating.parentNode).toBe(document.body);

		anchor.remove();
		floating.remove();
	});
});
