import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOCS_DEFAULT_THEME_IMPORT } from '@/lib/docs-theme-preview';
import type { RadiantCodeTabs } from './code-tabs.script';
import './code-tabs.script';
import { until } from '../../../test/until';

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

describe('RadiantCodeTabs line counts', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('shows the line count after the file name and names it for assistive technology', async () => {
		const element = document.createElement('radiant-code-tabs') as RadiantCodeTabs;
		element.tabs = [
			{ id: 'a', label: 'a.ts', html: '<pre><code>x</code></pre>', content: 'x', lines: 148 },
			{ id: 'b', label: 'b.css', html: '<pre><code>y</code></pre>', content: 'y' },
		];
		document.body.append(element);
		await waitForUpdate();

		const [first, second] = [...element.querySelectorAll<HTMLElement>('[role="tab"]')];
		const meta = first.querySelector<HTMLElement>('.code-tabs__tab-meta')!;

		expect(meta.textContent).toContain('148');
		expect(meta.title).toBe('148 lines');
		expect(meta.querySelector('[aria-hidden="true"]')!.textContent).toBe('148');
		expect(first.textContent).toContain('148 lines');
		expect(second.querySelector('.code-tabs__tab-meta')).toBeNull();
	});
});

describe('RadiantCodeTabs copy button', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('shows the copy and check icons and sets the copied state on its own tab, then clears it', async () => {
		vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
		const element = await createCodeTabs();
		const button = element.querySelector<HTMLElement>('[data-copy-button]')!;

		expect(button.textContent?.trim()).toBe('');
		expect(
			[...button.querySelectorAll('[data-copy-icon]')].map((icon) => icon.getAttribute('data-copy-icon')),
		).toEqual(['copy', 'check']);
		expect(button.hasAttribute('data-copy-state')).toBe(false);

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		button.click();

		await until(() => expect(button.getAttribute('data-copy-state')).toBe('copied'));
		const others = [...element.querySelectorAll<HTMLElement>('[data-copy-button]')].filter(
			(other) => other !== button,
		);
		expect(others.every((other) => !other.hasAttribute('data-copy-state'))).toBe(true);
		vi.advanceTimersByTime(2000);
		expect(button.hasAttribute('data-copy-state')).toBe(false);
	});

	it('sets the error state when the clipboard rejects', async () => {
		vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
		const element = await createCodeTabs();
		const button = element.querySelector<HTMLElement>('[data-copy-button]')!;

		button.click();

		await until(() => expect(button.getAttribute('data-copy-state')).toBe('error'));
	});
});
