import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { afterEach, describe, expect, it } from 'vitest';
import { DOCS_APPEARANCE_STORAGE_KEY, DOCS_DEFAULT_THEME_TUNING, DOCS_THEME_QUERY_KEY } from '@/lib/docs-theme-preview';
import { DesignTokenPanel } from './design-token-panel';
import type { DesignTokenPanelElement } from './design-token-panel.script';

async function createPanel(): Promise<DesignTokenPanelElement> {
	const markup = withRadiantServerCustomElementRenderBridge(() => renderToString(DesignTokenPanel({})));
	const container = document.createElement('div');
	container.innerHTML = markup;
	const element = container.querySelector('radiant-design-token-panel') as DesignTokenPanelElement | null;
	if (!element) throw new Error('The rendered design token panel custom element is missing');
	document.body.append(element);
	await Promise.resolve();
	return element;
}

describe('DesignTokenPanelElement', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		localStorage.removeItem(DOCS_APPEARANCE_STORAGE_KEY);
		history.replaceState(history.state, '', '/');
		delete document.documentElement.dataset.ruiTheme;
		document.documentElement.style.removeProperty('--rui-primary');
	});

	it('applies shared URL overrides without saving them as personal preferences on connect', async () => {
		const savedAppearance = {
			colors: 'github',
			tuning: { ...DOCS_DEFAULT_THEME_TUNING, primaryHue: 285 },
		};
		localStorage.setItem(DOCS_APPEARANCE_STORAGE_KEY, JSON.stringify(savedAppearance));
		history.replaceState(
			history.state,
			'',
			`/docs/getting-started/tokens?${DOCS_THEME_QUERY_KEY}=rui-default&rui-primary-hue=310`,
		);

		await createPanel();

		expect(document.documentElement.dataset.ruiTheme).toBe('rui-default');
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 310)');
		expect(JSON.parse(localStorage.getItem(DOCS_APPEARANCE_STORAGE_KEY) ?? '')).toEqual(savedAppearance);
	});
});
