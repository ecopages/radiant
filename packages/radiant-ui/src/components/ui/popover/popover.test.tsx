import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it } from 'vitest';
import { RuiPopover } from './popover';
import { RuiPopover as RuiPopoverElement } from './popover.script';
import { expectPopupFoundAcrossPortalCycle } from '../../../controllers/exit-transition.fixture';
void RuiPopoverElement;

describe('rui-popover dismissal', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountOpen() {
		const container = document.createElement('div');
		const outside = document.createElement('button');
		document.body.append(container, outside);
		createRoot(container).render(
			<RuiPopover trigger={<button type="button">Open</button>}>
				<button type="button" data-inside>
					Inside
				</button>
			</RuiPopover>,
		);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		host.setOpen(true);
		const surface = document.querySelector('[data-ref="surface"]') as HTMLElement;
		await host.updateComplete;
		expect(surface.parentElement).toBe(document.body);
		return { host, surface, outside, inside: surface.querySelector('[data-inside]') as HTMLElement };
	}

	it('closes when focus leaves a portaled surface, which sits outside the host element', async () => {
		const { host, inside, outside } = await mountOpen();

		inside.focus();
		expect(host.open).toBe(true);
		outside.focus();

		await host.updateComplete;
		expect(host.open).toBe(false);
	});

	it('stays open while focus moves within the portaled surface and its trigger', async () => {
		const { host, inside } = await mountOpen();
		const trigger = host.querySelector('[data-popover-trigger] button') as HTMLElement;

		inside.focus();
		trigger.focus();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(host.open).toBe(true);
	});
});

describe('rui-popover external anchor', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it.each(['replaced', 'removed and added back later'])('toggles from an anchor that is %s', async (change) => {
		const container = document.createElement('div');
		document.body.append(container);
		const anchor = document.createElement('button');
		anchor.id = 'external-anchor';
		document.body.append(anchor);
		createRoot(container).render(<RuiPopover anchor="#external-anchor">Body</RuiPopover>);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		await new Promise((resolve) => setTimeout(resolve, 0));

		const fresh = anchor.cloneNode(true) as HTMLElement;
		if (change === 'replaced') {
			anchor.replaceWith(fresh);
		} else {
			anchor.remove();
			await new Promise((resolve) => setTimeout(resolve, 0));
			document.body.append(fresh);
		}
		fresh.click();

		expect(host.open).toBe(true);
	});
});

describe('rui-popover external anchor handlers', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('toggles from an anchor whose own click handler stops propagation', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		const anchor = document.createElement('button');
		anchor.id = 'external-anchor';
		anchor.addEventListener('click', (event) => event.stopPropagation());
		document.body.append(anchor);
		createRoot(container).render(<RuiPopover anchor="#external-anchor">Body</RuiPopover>);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		await new Promise((resolve) => setTimeout(resolve, 0));

		anchor.click();

		expect(host.open).toBe(true);
	});
});

describe('rui-popover portal container', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountPopover(attributes: { portalContainer?: string } = {}) {
		const container = document.createElement('div');
		const frame = document.createElement('div');
		frame.id = 'frame';
		document.body.append(container, frame);
		createRoot(container).render(
			<RuiPopover trigger={<button type="button">Open</button>} {...attributes}>
				Body
			</RuiPopover>,
		);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		const surface = host.querySelector('[data-ref="surface"]') as HTMLElement;
		return { host, surface, frame };
	}

	it('mounts the surface in the element a selector names, and back in the host on close', async () => {
		const { host, surface, frame } = await mountPopover({ portalContainer: '#frame' });

		host.setOpen(true);
		await host.updateComplete;
		expect(surface.parentElement).toBe(frame);

		host.setOpen(false);
		await host.updateComplete;
		expect(host.contains(surface)).toBe(true);
	});

	it('honors a container property changed between opens', async () => {
		const { host, surface, frame } = await mountPopover();
		const other = document.createElement('div');
		document.body.append(other);

		host.portalContainer = frame;
		host.setOpen(true);
		await host.updateComplete;
		expect(surface.parentElement).toBe(frame);
		host.setOpen(false);
		await host.updateComplete;
		expect(host.contains(surface)).toBe(true);

		host.portalContainer = () => other;
		host.setOpen(true);
		await host.updateComplete;
		expect(surface.parentElement).toBe(other);
	});
});

describe('rui-popover trigger wiring', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	async function mountPopover(declaresMenu = false) {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiPopover
				trigger={
					<button type="button" aria-haspopup={declaresMenu ? 'menu' : undefined}>
						Open
					</button>
				}
			>
				<span>Body</span>
			</RuiPopover>,
		);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		host.setOpen(true);
		return { host, trigger: host.querySelector('[data-popover-trigger] button') as HTMLElement };
	}

	it('declares aria-haspopup="dialog" with aria-controls and aria-expanded on the trigger', async () => {
		const { host, trigger } = await mountPopover();
		const surface = document.querySelector('[data-ref="surface"]') as HTMLElement;

		expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
		expect(trigger.getAttribute('aria-controls')).toBe(surface.id);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		host.setOpen(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
	});

	it('keeps an aria-haspopup the trigger already declares', async () => {
		const { host, trigger } = await mountPopover(true);
		expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
		host.remove();
		expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
	});

	it('takes the aria attributes it added off the trigger when the popover disconnects', async () => {
		const { host, trigger } = await mountPopover();
		expect(trigger.hasAttribute('aria-controls')).toBe(true);

		host.remove();

		expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
		expect(trigger.hasAttribute('aria-controls')).toBe(false);
		expect(trigger.hasAttribute('aria-expanded')).toBe(false);
	});

	it('moves the aria attributes to a new anchor when the anchor selector changes', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<>
				<button type="button" id="first">
					First
				</button>
				<button type="button" id="second">
					Second
				</button>
				<RuiPopover anchor="#first">
					<span>Body</span>
				</RuiPopover>
			</>,
		);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		const first = container.querySelector('#first') as HTMLElement;
		const second = container.querySelector('#second') as HTMLElement;
		await host.updateComplete;
		expect(first.getAttribute('aria-controls')).toBeTruthy();

		host.anchor = '#second';

		await host.updateComplete;
		expect(second.getAttribute('aria-controls')).toBeTruthy();
		expect(first.hasAttribute('aria-controls')).toBe(false);
		expect(first.hasAttribute('aria-haspopup')).toBe(false);
	});
});

describe('rui-popover reads its portaled surface from the popover controller', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('finds the current surface while open, during its exit, and after a reopen with a new node', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiPopover trigger={<button type="button">Open</button>}>
				<span>Inside</span>
			</RuiPopover>,
		);
		const host = container.querySelector('rui-popover') as RuiPopoverElement;
		await host.updateComplete;
		const surface = host.querySelector('[data-ref="surface"]') as HTMLElement;
		const controller = Reflect.get(host, 'controller') as { getFloatingElement(): HTMLElement | null };

		await expectPopupFoundAcrossPortalCycle({
			popup: surface,
			portaled: true,
			find: () => controller.getFloatingElement(),
			open: async () => {
				host.setOpen(true);
				await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
			},
			close: async () => {
				host.setOpen(false);
				await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
			},
		});
	});
});
