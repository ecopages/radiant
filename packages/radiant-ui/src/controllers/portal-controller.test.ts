import { afterEach, describe, expect, it } from 'vitest';
import type { ControllerHost } from './controller';
import { PortalController, createPortalController } from './portal-controller';

describe('PortalController', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function setup(origin: HTMLElement = document.createElement('div')) {
		const before = document.createElement('span');
		const node = document.createElement('div');
		const after = document.createElement('span');
		origin.append(before, node, after);
		document.body.append(origin);
		return { origin, before, node, after };
	}

	it('moves the node to the container on attach and back to its place on destroy', () => {
		const { origin, before, node, after } = setup();
		const portal = new PortalController({ getNode: () => node });

		portal.attach();
		expect(node.parentNode).toBe(document.body);
		expect([...origin.children]).toEqual([before, after]);

		portal.destroy();
		expect([...origin.children]).toEqual([before, node, after]);
		expect(origin.childNodes).toHaveLength(3);
	});

	it('mounts into the container the getter returns', () => {
		const { node } = setup();
		const container = document.createElement('section');
		document.body.append(container);

		new PortalController({ getNode: () => node, getContainer: () => container }).attach();

		expect(node.parentNode).toBe(container);
	});

	it('is idempotent, and can attach again after destroy', () => {
		const { origin, node } = setup();
		const portal = new PortalController({ getNode: () => node });

		portal.attach();
		portal.attach();
		portal.destroy();
		portal.destroy();
		expect(node.parentNode).toBe(origin);
		expect(origin.childNodes).toHaveLength(3);

		portal.attach();
		expect(node.parentNode).toBe(document.body);
		portal.destroy();
		expect(node.parentNode).toBe(origin);
	});

	it('mounts nothing while the getter has no node yet', () => {
		const portal = new PortalController({ getNode: () => null });

		portal.attach();
		portal.destroy();

		expect(document.body.childNodes).toHaveLength(0);
	});

	it('is bound to a host through createPortalController', () => {
		const { origin, node } = setup();
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};

		const portal = createPortalController(host, { getNode: () => node });
		expect(portal).toBeInstanceOf(PortalController);
		expect(node.parentNode).toBe(origin);

		connected.forEach((callback) => callback());
		expect(node.parentNode).toBe(document.body);

		cleanup.forEach((callback) => callback());
		expect(node.parentNode).toBe(origin);
	});

	describe('theme carried to the portaled node', () => {
		it('keeps the --rui-* values, dark scope and data-theme of the origin, and removes them on destroy', () => {
			const themed = document.createElement('section');
			themed.classList.add('dark');
			themed.setAttribute('data-theme', 'ocean');
			themed.style.setProperty('--rui-popover-surface', 'rgb(1, 2, 3)');
			const { node } = setup(themed);
			node.classList.add('rui-popover');
			const portal = new PortalController({ getNode: () => node });

			expect(getComputedStyle(node).getPropertyValue('--rui-popover-surface')).toBe('rgb(1, 2, 3)');

			portal.attach();
			expect(node.parentNode).toBe(document.body);
			expect(getComputedStyle(node).getPropertyValue('--rui-popover-surface')).toBe('rgb(1, 2, 3)');
			expect(node.classList.contains('dark')).toBe(true);
			expect(node.getAttribute('data-theme')).toBe('ocean');

			portal.destroy();
			expect(node.classList.contains('dark')).toBe(false);
			expect(node.hasAttribute('data-theme')).toBe(false);
			expect(node.style.getPropertyValue('--rui-popover-surface')).toBe('');
			expect(node.className).toBe('rui-popover');
		});

		it('takes each --rui-* value from the nearest ancestor that sets it', () => {
			const outer = document.createElement('div');
			outer.style.setProperty('--rui-a', 'outer');
			outer.style.setProperty('--rui-b', 'outer');
			const inner = document.createElement('div');
			inner.style.setProperty('--rui-a', 'inner');
			const node = document.createElement('div');
			inner.append(node);
			outer.append(inner);
			document.body.append(outer);

			new PortalController({ getNode: () => node }).attach();

			expect(node.style.getPropertyValue('--rui-a')).toBe('inner');
			expect(node.style.getPropertyValue('--rui-b')).toBe('outer');
		});

		it('leaves a --rui-* value the node already sets, and the theme it already has', () => {
			const origin = document.createElement('div');
			origin.classList.add('dark');
			origin.style.setProperty('--rui-a', 'origin');
			const { node } = setup(origin);
			node.classList.add('dark');
			node.style.setProperty('--rui-a', 'own');
			const portal = new PortalController({ getNode: () => node });

			portal.attach();
			portal.destroy();

			expect(node.style.getPropertyValue('--rui-a')).toBe('own');
			expect(node.classList.contains('dark')).toBe(true);
		});

		it('does not carry properties outside the --rui-* namespace', () => {
			const origin = document.createElement('div');
			origin.style.setProperty('--other', 'x');
			origin.style.color = 'red';
			const { node } = setup(origin);

			new PortalController({ getNode: () => node }).attach();

			expect(node.style.getPropertyValue('--other')).toBe('');
			expect(node.style.color).toBe('');
		});
	});
});
