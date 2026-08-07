import { describe, expect, it } from 'vitest';
import { renderToString } from '@ecopages/jsx/server';
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderRadiantElementHostToString } from '@ecopages/radiant/server/radiant-element-ssr';
import { RuiSwitch as RuiSwitchView } from './switch';
import { RuiSwitch } from './switch.script';

describe('RuiSwitch SSR', () => {
	it('renders track, thumb, and label markup before hydration', () => {
		const element = document.createElement('rui-switch') as RuiSwitch;
		element.checked = false;
		element.innerHTML = 'Email notifications';

		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('rui-switch__track');
		expect(html).toContain('rui-switch__thumb');
		expect(html).toContain('role="switch"');
		expect(html).toContain('Email notifications');
	});

	it('reflects checked state in SSR markup', () => {
		const element = document.createElement('rui-switch') as RuiSwitch;
		element.checked = true;

		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('checked');
	});

	it('view shell renders switch chrome without custom element upgrade', () => {
		const html = renderToString(
			<RuiSwitchView checked={false} disabled={false}>
				Disabled
			</RuiSwitchView>,
		);

		expect(html).toContain('rui-switch__track');
		expect(html).toContain('rui-switch__thumb');
		expect(html).toContain('role="switch"');
		expect(html).toContain('Disabled');
	});
});
