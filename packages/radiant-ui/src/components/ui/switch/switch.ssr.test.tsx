import { describe, expect, it } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import { RuiSwitch } from './switch';

describe('RuiSwitch SSR', () => {
	it('renders track, thumb, and label markup before hydration', () => {
		const html = renderToString(
			<RuiSwitch checked={false} disabled={false}>
				Email notifications
			</RuiSwitch>,
		);

		expect(html).toContain('rui-switch__track');
		expect(html).toContain('rui-switch__thumb');
		expect(html).toContain('role="switch"');
		expect(html).toContain('Email notifications');
	});

	it('renders checked state on the host and native control', () => {
		const html = renderToString(
			<RuiSwitch checked disabled name="notifications">
				Notifications
			</RuiSwitch>,
		);

		expect(html).toMatch(/<rui-switch[^>]*checked/);
		expect(html).toMatch(/<input[^>]*checked/);
		expect(html).toMatch(/<input[^>]*disabled/);
		expect(html).toMatch(/<input[^>]*name="notifications"/);
	});

	it('renders a single chrome shell for the view composition', () => {
		const html = renderToString(
			<RuiSwitch checked={false} disabled={false}>
				Disabled
			</RuiSwitch>,
		);

		expect(html).toContain('rui-switch');
		expect(html).toContain('Disabled');
		expect(html.match(/rui-switch__track/g)?.length ?? 0).toBe(1);
	});
});
