import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@ecopages/radiant-ui/select';
import { readDocsTokenPackCss } from '@/lib/docs-token-pack-css';
import {
	DOCS_THEME_STORAGE_KEY,
	DOCS_TOKEN_PACK_GLOBAL,
	DOCS_TOKEN_SHEET_ATTR,
	docsThemeColorOptions,
	installDocsTokenPackCss,
} from '@/lib/docs-theme-preview';
import { HomeThemePickerElement } from './home-theme-picker.script';

async function createPicker(): Promise<HomeThemePickerElement> {
	const element = document.createElement('radiant-home-theme-picker') as HomeThemePickerElement;
	element.innerHTML = `
		<rui-select data-token="colors"></rui-select>
		<rui-select data-token="spacing"></rui-select>
		<rui-select data-token="radius"></rui-select>
	`;
	document.body.append(element);
	await Promise.resolve();
	return element;
}

function changeToken(element: HomeThemePickerElement, token: string, value: string): void {
	const select = element.querySelector(`[data-token="${token}"]`);
	select?.dispatchEvent(new CustomEvent('rui-change', { detail: { value: [value] }, bubbles: true, composed: true }));
}

function resetPreview(): void {
	document.body.innerHTML = '';
	localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
	const root = document.documentElement;
	root.classList.remove('dark');
	delete root.dataset.ruiTheme;
	delete root.dataset.ruiSpacing;
	delete root.dataset.ruiRadius;
	document.querySelectorAll(`style[${DOCS_TOKEN_SHEET_ATTR}]`).forEach((node) => node.remove());
	delete (globalThis as typeof globalThis & { [DOCS_TOKEN_PACK_GLOBAL]?: unknown })[DOCS_TOKEN_PACK_GLOBAL];
}

describe('HomeThemePickerElement', () => {
	beforeEach(() => {
		resetPreview();
		installDocsTokenPackCss(readDocsTokenPackCss());
	});

	afterEach(() => {
		resetPreview();
	});

	it('offers Basalt and each optional Radiant Theme', () => {
		expect(docsThemeColorOptions.map(({ value }) => value)).toEqual(['basalt', 'github', 'vscode', 'vercel']);
	});

	it('writes default token values onto the selects', async () => {
		const element = await createPicker();

		await vi.waitFor(() => {
			expect(element.querySelector<HTMLElement & { value: string[] }>('[data-token="colors"]')?.value).toEqual([
				'basalt',
			]);
			expect(element.querySelector<HTMLElement & { value: string[] }>('[data-token="spacing"]')?.value).toEqual([
				'default',
			]);
			expect(element.querySelector<HTMLElement & { value: string[] }>('[data-token="radius"]')?.value).toEqual([
				'default',
			]);
		});
	});

	it('keeps theme styles ahead of active spacing and radius packs', async () => {
		const element = await createPicker();

		await vi.waitFor(() => {
			expect(element.querySelector('[data-token="colors"]')).not.toBeNull();
			expect(element.querySelector('[data-token="spacing"]')).not.toBeNull();
			expect(element.querySelector('[data-token="radius"]')).not.toBeNull();
		});

		changeToken(element, 'spacing', 'compact');
		changeToken(element, 'radius', 'sharp');
		changeToken(element, 'colors', 'github');

		await vi.waitFor(() => {
			expect(document.documentElement.dataset.ruiTheme).toBe('github');
			expect(document.documentElement.dataset.ruiSpacing).toBe('compact');
			expect(document.documentElement.dataset.ruiRadius).toBe('sharp');
		});
		const themeStyle = document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="theme"]`);
		const spacingStyle = document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`);
		expect(themeStyle?.textContent).toContain('--color-github-canvas: #ffffff');
		expect(themeStyle?.compareDocumentPosition(spacingStyle ?? document.body)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toMatchObject({
			colors: 'github',
			spacing: 'compact',
			radius: 'sharp',
		});
		expect(
			document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`)?.textContent,
		).toContain('--space-1: calc(0.125rem * var(--rui-density))');
		expect(
			document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`)?.textContent,
		).toContain('--radius-control: 0');

		changeToken(element, 'colors', 'vscode');

		await vi.waitFor(() => {
			expect(document.documentElement.dataset.ruiTheme).toBe('vscode');
		});
		expect(themeStyle?.textContent).toContain('--color-vscode-blue: #006bb3');
		expect(themeStyle?.compareDocumentPosition(spacingStyle ?? document.body)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);

		changeToken(element, 'colors', 'basalt');

		await vi.waitFor(() => {
			expect(document.documentElement.dataset.ruiTheme).toBe('basalt');
		});
		expect(document.documentElement.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="theme"]`)).toBeNull();
	});

});
