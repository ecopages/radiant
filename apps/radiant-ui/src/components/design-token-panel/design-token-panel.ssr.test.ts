import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { expect, it } from 'vitest';
import { DesignTokenPanel } from './design-token-panel';

it('renders the design token panel host for hydration', async () => {
	const html = withRadiantServerCustomElementRenderBridge(() => renderToString(DesignTokenPanel({})));

	expect(html).toContain('<radiant-design-token-panel');
	await expect(html).toMatchFileSnapshot('./__snapshots__/design-token-panel.html');
});
