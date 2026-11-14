import { describe, expect, it } from 'vitest';
import { mountPortal } from './portal';

describe('mountPortal', () => {
	it('moves a node to the container and restores it on unmount', () => {
		const parent = document.createElement('div');
		const node = document.createElement('div');
		node.textContent = 'popover';
		parent.append(node);
		document.body.append(parent);

		const handle = mountPortal(node);
		expect(parent.contains(node)).toBe(false);
		expect(document.body.contains(node)).toBe(true);

		handle.unmount();
		expect(parent.contains(node)).toBe(true);
		expect(node.parentNode).toBe(parent);

		parent.remove();
	});
});
