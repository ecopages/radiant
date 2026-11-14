import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiPopover } from './popover';
import { RuiPopover as RuiPopoverElement } from './popover.script';
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
		await vi.waitFor(() => expect(host.querySelector('[data-popover-trigger] button')).toBeTruthy());
		host.setOpen(true);
		const surface = document.querySelector('[data-ref="surface"]') as HTMLElement;
		await vi.waitFor(() => expect(surface.parentElement).toBe(document.body));
		return { host, surface, outside, inside: surface.querySelector('[data-inside]') as HTMLElement };
	}

	it('closes when focus leaves a portaled surface, which sits outside the host element', async () => {
		const { host, inside, outside } = await mountOpen();

		inside.focus();
		expect(host.open).toBe(true);
		outside.focus();

		await vi.waitFor(() => expect(host.open).toBe(false));
	});

	it('stays open while focus moves within the portaled surface and its trigger', async () => {
		const { host, inside } = await mountOpen();
		const trigger = host.querySelector('[data-popover-trigger] button') as HTMLElement;

		inside.focus();
		trigger.focus();
		await new Promise((resolve) => setTimeout(resolve, 20));

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
		await vi.waitFor(() => expect(host.isConnected).toBe(true));
		await new Promise((resolve) => setTimeout(resolve, 20));

		const fresh = anchor.cloneNode(true) as HTMLElement;
		if (change === 'replaced') {
			anchor.replaceWith(fresh);
		} else {
			anchor.remove();
			await new Promise((resolve) => setTimeout(resolve, 20));
			document.body.append(fresh);
		}
		fresh.click();

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
		await vi.waitFor(() => expect(host.querySelector('[data-popover-trigger] button')).toBeTruthy());
		const surface = host.querySelector('[data-ref="surface"]') as HTMLElement;
		return { host, surface, frame };
	}

	it('mounts the surface in the element a selector names, and back in the host on close', async () => {
		const { host, surface, frame } = await mountPopover({ portalContainer: '#frame' });

		host.setOpen(true);
		await vi.waitFor(() => expect(surface.parentElement).toBe(frame));

		host.setOpen(false);
		await vi.waitFor(() => expect(host.contains(surface)).toBe(true));
	});

	it('honors a container property changed between opens', async () => {
		const { host, surface, frame } = await mountPopover();
		const other = document.createElement('div');
		document.body.append(other);

		host.portalContainer = frame;
		host.setOpen(true);
		await vi.waitFor(() => expect(surface.parentElement).toBe(frame));
		host.setOpen(false);
		await vi.waitFor(() => expect(host.contains(surface)).toBe(true));

		host.portalContainer = () => other;
		host.setOpen(true);
		await vi.waitFor(() => expect(surface.parentElement).toBe(other));
	});
});
