import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import { RuiCycleToggle, RuiCycleToggleItem } from './cycle-toggle';

function themeItems(value: string) {
	return (
		<>
			<RuiCycleToggleItem id="system" selected={value === 'system'}>
				System
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="light" selected={value === 'light'}>
				Light
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="dark" selected={value === 'dark'}>
				Dark
			</RuiCycleToggleItem>
		</>
	);
}

describe('RuiCycleToggle SSR', () => {
	it('renders only the selected item as visible', () => {
		const html = renderToString(
			<RuiCycleToggle value="system" label="Theme">
				{themeItems('system')}
			</RuiCycleToggle>,
		);

		expect(html).toMatch(/data-cycle-value="light"[^>]* hidden/);
		expect(html).toMatch(/data-cycle-value="system"[^>]*>System</);
		expect(html).toMatch(/data-cycle-value="dark"[^>]* hidden/);
	});

	it('serializes host props through the Radiant SSR bridge', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiCycleToggle value="system" label="Theme" variant="ghost" size="sm">
					{themeItems('system')}
				</RuiCycleToggle>,
			),
		);

		expect(html).toMatch(/<rui-cycle-toggle[^>]*variant="ghost"/);
	});

	it('serializes variant on the host so nested SSR hydrates ghost instead of filled', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiAlert>
					<RuiCycleToggle value="system" label="Theme" variant="ghost" size="sm">
						{themeItems('system')}
					</RuiCycleToggle>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-cycle-toggle[^>]*variant="ghost"/);
		expect(html).toContain('rui-button--ghost');
		expect(html).not.toContain('rui-button--filled');
	});
});
