import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiTooltip } from './tooltip';
import { RuiTooltip as RuiTooltipScript } from './tooltip.script';
import { RuiMenuButton } from '../menu-button';
import { RuiMenuButton as RuiMenuButtonScript } from '../menu-button/menu-button.script';
void RuiTooltipScript;
void RuiMenuButtonScript;

const rendered = (host: Element) => (host as Element & { updateComplete: Promise<void> }).updateComplete;

describe('RuiTooltip', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		vi.useRealTimers();
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

		await rendered(container.querySelector('rui-tooltip')!);
		expect(button?.getAttribute('aria-describedby')).toBeTruthy();

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

		await rendered(host);
		expect(surface?.textContent).toBe('Saved');
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
		await rendered(container.querySelector('rui-tooltip')!);
		expect(button.getAttribute('aria-describedby')).toBeTruthy();

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		button.focus();
		vi.advanceTimersByTime(200);
		expect(surface.hidden).toBe(false);

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(surface.hidden).toBe(true);
	});

	it('shows on keyboard focus of a wrapped host that owns its own trigger part', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		createRoot(container).render(
			<RuiTooltip content="More">
				<RuiMenuButton trigger="Menu" items={[{ value: 'alpha', label: 'Alpha' }]} />
			</RuiTooltip>,
		);
		const surface = container.querySelector('rui-tooltip > .rui-tooltip > [role="tooltip"]') as HTMLElement;
		expect(surface).toBeTruthy();

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		(container.querySelector('rui-menu-button [data-ref="trigger"]') as HTMLElement).dispatchEvent(
			new FocusEvent('focusin', { bubbles: true }),
		);

		vi.advanceTimersByTime(200);
		expect(surface.hidden).toBe(false);
	});
});
