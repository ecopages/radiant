import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import './sidebar.css';

/** Real SSR output written by `sidebar.prehydration.ssr.test.tsx`. */
const fixtures = import.meta.glob<string>('./__snapshots__/sidebar.prehydration/*.html', {
	query: '?raw',
	import: 'default',
	eager: true,
});

function paint(name: string): void {
	const html = fixtures[`./__snapshots__/sidebar.prehydration/${name}.html`];
	if (!html) {
		throw new Error(`Missing SSR fixture "${name}". Run the ssr project to write it.`);
	}
	document.body.innerHTML = html;
}

function hidden(testId: string): boolean {
	const trigger = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
	if (!trigger) {
		throw new Error(`Missing trigger "${testId}".`);
	}
	return getComputedStyle(trigger).display === 'none';
}

function visibility(testIds: readonly string[]): Record<string, boolean> {
	return Object.fromEntries(testIds.map((testId) => [testId, hidden(testId)]));
}

describe('sidebar trigger visibility before hydration (desktop)', () => {
	it('keeps the hosts un-upgraded', async () => {
		await page.viewport(1280, 800);
		expect(customElements.get('rui-sidebar-trigger')).toBeUndefined();
		expect(customElements.get('rui-sidebar')).toBeUndefined();
		expect(window.matchMedia('(min-width: 768px)').matches).toBe(true);
	});

	it.each([
		{ fixture: 'off', expected: { 's-header': true, 's-inset': true } },
		{ fixture: 'icon-expanded', expected: { 's-header': false, 's-inset': true } },
		{
			fixture: 'docs-off',
			expected: { 's-site-header': true, 's-site-inset': true, 's-header': true, 's-inset': true },
		},
		{
			fixture: 'docs-icon-collapsed',
			expected: { 's-site-header': true, 's-site-inset': false, 's-header': true, 's-inset': false },
		},
	])('$fixture hides triggers from its provider sidebar', async ({ fixture, expected }) => {
		await page.viewport(1280, 800);
		paint(fixture);
		expect(visibility(Object.keys(expected))).toEqual(expected);
	});

	it('keeps nested providers independent', async () => {
		await page.viewport(1280, 800);
		paint('nested');
		expect(visibility(['outer-header', 'outer-inset', 'inner-header', 'inner-inset'])).toEqual({
			'outer-header': true,
			'outer-inset': true,
			'inner-header': true,
			'inner-inset': false,
		});
	});

	it('keys pane triggers on their own sidebar when a provider holds two', async () => {
		await page.viewport(1280, 800);
		paint('two-sidebars');
		expect(visibility(['left-header', 'right-header', 'left-inset', 'right-inset'])).toEqual({
			'left-header': true,
			'right-header': false,
			'left-inset': false,
			'right-inset': false,
		});
	});
});

describe('sidebar trigger visibility before hydration (narrow viewport)', () => {
	it.each(['off', 'icon-expanded', 'docs-icon-collapsed', 'nested', 'two-sidebars'])(
		'%s shows only inset triggers while the drawer is assumed closed',
		async (fixture) => {
			await page.viewport(600, 800);
			paint(fixture);
			for (const trigger of document.querySelectorAll<HTMLElement>('rui-sidebar-trigger')) {
				expect(hidden(trigger.dataset.testid ?? '')).toBe(trigger.getAttribute('placement') === 'header');
			}
		},
	);
});
