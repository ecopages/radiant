import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { expect, it } from 'vitest';
import { ThemePalettePicker } from './theme-palette-picker';

/**
 * @remarks `rui-select` stamps a random id into its markup, so ids are renumbered in order of first
 * appearance to keep the snapshot stable while references to the same id still match.
 */
function stabilizeGeneratedIds(html: string): string {
	const ids = new Map<string, string>();
	return html.replace(/[0-9a-f]{32}/g, (id) => {
		if (!ids.has(id)) ids.set(id, `id${ids.size}`);
		return ids.get(id) as string;
	});
}

it('renders the theme picker host for hydration', async () => {
	const html = withRadiantServerCustomElementRenderBridge(() => renderToString(ThemePalettePicker({})));

	expect(html).toContain('<radiant-theme-palette-picker');
	await expect(stabilizeGeneratedIds(html)).toMatchFileSnapshot('./__snapshots__/theme-palette-picker.html');
});
