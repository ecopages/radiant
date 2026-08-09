import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from './tabs';

describe('RuiTabs SSR', () => {
	it('renders only the selected panel as visible', () => {
		const html = renderToString(
			<RuiTabs value="pnpm">
				<RuiTabList aria-label="Package managers">
					<RuiTab id="npm" selected={false}>npm</RuiTab>
					<RuiTab id="pnpm" selected>pnpm</RuiTab>
					<RuiTab id="bun" selected={false}>bun</RuiTab>
				</RuiTabList>
				<RuiTabPanels>
					<RuiTabPanel id="npm" selected={false}>npm command</RuiTabPanel>
					<RuiTabPanel id="pnpm" selected>pnpm command</RuiTabPanel>
					<RuiTabPanel id="bun" selected={false}>bun command</RuiTabPanel>
				</RuiTabPanels>
			</RuiTabs>,
		);

		expect(html).toMatch(/id="panel-npm"[^>]* hidden>/);
		expect(html).toMatch(/id="panel-pnpm"[^>]* tabindex="0">/);
		expect(html).toMatch(/id="panel-bun"[^>]* hidden>/);
	});
});
