import '@ecopages/radiant/client/install-hydrator';
import { afterEach, describe, expect, it } from 'vitest';
import { DOCS_APPEARANCE_STORAGE_KEY, DOCS_APPEARANCE_VERSION, DOCS_THEME_QUERY_KEY } from '@/lib/docs-theme-preview';
import './design-token-panel.script';
import type { DesignTokenPanelElement } from './design-token-panel.script';

/** Real SSR output written by `design-token-panel.ssr.test.ts`. */
const fixtures = import.meta.glob<string>('./__snapshots__/design-token-panel.html', {
	query: '?raw',
	import: 'default',
	eager: true,
});

async function createPanel(): Promise<DesignTokenPanelElement> {
	const markup = fixtures['./__snapshots__/design-token-panel.html'];
	if (!markup) throw new Error('Missing SSR fixture. Run the node project to write it.');
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
			v: DOCS_APPEARANCE_VERSION,
			colors: 'github',
			tuning: { primaryHue: 285 },
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
