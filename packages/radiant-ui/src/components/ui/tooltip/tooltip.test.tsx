import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiTooltip } from './tooltip';
import { RuiTooltip as RuiTooltipScript } from './tooltip.script';
void RuiTooltipScript;

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
});
