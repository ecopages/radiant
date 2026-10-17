import { afterEach, describe, expect, it } from 'vitest';
import { DOCS_DEFAULT_THEME_IMPORT } from '@/lib/docs-theme-preview';
import type { RadiantCodeTabs } from './code-tabs.script';
import './code-tabs.script';

const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 0));

const tabs = [
	{
		id: 'styles',
		label: 'styles.css',
		html: `<pre><code>@import '${DOCS_DEFAULT_THEME_IMPORT}';</code></pre>`,
		content: `@import '${DOCS_DEFAULT_THEME_IMPORT}';`,
		themeImport: true,
	},
	{
		id: 'plain',
		label: 'plain.css',
		html: `<pre><code>@import '${DOCS_DEFAULT_THEME_IMPORT}';</code></pre>`,
		content: `@import '${DOCS_DEFAULT_THEME_IMPORT}';`,
	},
];

async function createCodeTabs(): Promise<RadiantCodeTabs> {
	const element = document.createElement('radiant-code-tabs') as RadiantCodeTabs;
	element.tabs = tabs;
	document.body.append(element);
	await waitForUpdate();
	return element;
}

describe('RadiantCodeTabs theme import', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		delete document.documentElement.dataset.ruiTheme;
	});

	it('shows the import for the selected docs theme and follows later changes', async () => {
		document.documentElement.dataset.ruiTheme = 'github';
		const element = await createCodeTabs();
		const code = () => element.querySelector('[role="tabpanel"]')?.textContent ?? '';
		expect(code()).toContain("@import '@ecopages/radiant-themes/github';");

		document.documentElement.dataset.ruiTheme = 'rui-default';
		await waitForUpdate();
		await waitForUpdate();
		expect(code()).toContain(`@import '${DOCS_DEFAULT_THEME_IMPORT}';`);
	});

	it('leaves tabs without a theme import untouched', async () => {
		document.documentElement.dataset.ruiTheme = 'github';
		const element = await createCodeTabs();
		const plain = [...element.querySelectorAll('[role="tabpanel"]')].find((panel) => panel.id.endsWith('plain'));
		expect(plain?.textContent ?? '').toContain(DOCS_DEFAULT_THEME_IMPORT);
	});
});
