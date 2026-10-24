import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RuiTooltip } from './tooltip';
import './tooltip.script';

describe('RuiTooltip', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it.fails('renders one trigger and one tooltip surface that the trigger describes', async () => {
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
});
