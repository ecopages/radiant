import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiCycleToggle, RuiCycleToggleItem } from './cycle-toggle';

describe('RuiCycleToggle SSR', () => {
	it('renders only the selected item as visible', () => {
		const html = renderToString(
			<RuiCycleToggle value="system" label="Theme">
				<RuiCycleToggleItem id="system" selected>
					System
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="light" selected={false}>
					Light
				</RuiCycleToggleItem>
				<RuiCycleToggleItem id="dark" selected={false}>
					Dark
				</RuiCycleToggleItem>
			</RuiCycleToggle>,
		);

		expect(html).toMatch(/data-cycle-value="light"[^>]* hidden/);
		expect(html).toMatch(/data-cycle-value="system"[^>]*>System</);
		expect(html).toMatch(/data-cycle-value="dark"[^>]* hidden/);
	});
});
