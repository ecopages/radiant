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
