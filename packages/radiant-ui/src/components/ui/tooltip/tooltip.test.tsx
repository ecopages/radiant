import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiTooltip } from './tooltip';
import { RuiTooltip as RuiTooltipScript } from './tooltip.script';
import { RuiMenuButton } from '../menu-button';
import { RuiMenuButton as RuiMenuButtonScript } from '../menu-button/menu-button.script';
void RuiTooltipScript;
void RuiMenuButtonScript;

describe('RuiTooltip', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('renders one trigger and one tooltip surface that the trigger describes', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiTooltip content="Save your changes">
				<button type="button">Save</button>
			</RuiTooltip>,
		);
		const button = container.querySelector('button');

		await vi.waitFor(() => expect(button?.getAttribute('aria-describedby')).toBeTruthy());

		const surfaces = container.querySelectorAll('[role="tooltip"]');
		expect(container.querySelectorAll('[data-ref="trigger"]')).toHaveLength(1);
		expect(surfaces).toHaveLength(1);
		expect(surfaces[0]?.id).toBe(button?.getAttribute('aria-describedby'));
	});

	it('mirrors a changed content attribute into the tooltip surface', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiTooltip content="Save your changes">
				<button type="button">Save</button>
			</RuiTooltip>,
		);
		const host = container.querySelector('rui-tooltip') as HTMLElement;
		const surface = container.querySelector('[role="tooltip"]');

		host.setAttribute('content', 'Saved');

		await vi.waitFor(() => expect(surface?.textContent).toBe('Saved'));
	});

	it('closes an open tooltip on Escape', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiTooltip content="Save your changes">
				<button type="button">Save</button>
			</RuiTooltip>,
		);
		const button = container.querySelector('button') as HTMLButtonElement;
		const surface = container.querySelector('[role="tooltip"]') as HTMLElement;
		await vi.waitFor(() => expect(button.getAttribute('aria-describedby')).toBeTruthy());

		button.focus();
		await vi.waitFor(() => expect(surface.hidden).toBe(false));

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await vi.waitFor(() => expect(surface.hidden).toBe(true));
	});

	it('shows on keyboard focus of a wrapped host that owns its own trigger part', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiTooltip content="More">
				<RuiMenuButton trigger="Menu" items={[{ value: 'alpha', label: 'Alpha' }]} />
			</RuiTooltip>,
		);
		const surface = (await vi.waitFor(() => {
			const found = container.querySelector('rui-tooltip > .rui-tooltip > [role="tooltip"]');
			expect(found).toBeTruthy();
			return found;
		})) as HTMLElement;

		(container.querySelector('rui-menu-button [data-ref="trigger"]') as HTMLElement).dispatchEvent(
			new FocusEvent('focusin', { bubbles: true }),
		);

		await vi.waitFor(() => expect(surface.hidden).toBe(false));
	});
});
