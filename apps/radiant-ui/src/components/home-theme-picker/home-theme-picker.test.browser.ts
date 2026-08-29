import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@ecopages/radiant-ui/select';
import { readDocsTokenPackCss } from '@/lib/docs-token-pack-css';
import {
	DOCS_THEME_STORAGE_KEY,
	DOCS_TOKEN_PACK_GLOBAL,
	DOCS_TOKEN_SHEET_ATTR,
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
	select?.dispatchEvent(new CustomEvent('rui-change', { detail: { value }, bubbles: true, composed: true }));
}

function resetPreview(): void {
	document.body.innerHTML = '';
	localStorage.removeItem(DOCS_THEME_STORAGE_KEY);
	const root = document.documentElement;
	delete root.dataset.ruiColors;
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

	it('writes default token values onto the selects', async () => {
		const element = await createPicker();

		await vi.waitFor(() => {
			expect(element.querySelector<HTMLElement & { value: string }>('[data-token="colors"]')?.value).toBe(
				'glacier',
			);
			expect(element.querySelector<HTMLElement & { value: string }>('[data-token="spacing"]')?.value).toBe(
				'default',
			);
			expect(element.querySelector<HTMLElement & { value: string }>('[data-token="radius"]')?.value).toBe(
				'default',
			);
		});
	});

	it('applies colour, spacing, and shape packs to the document', async () => {
		const element = await createPicker();

		await vi.waitFor(() => {
			expect(element.querySelector('[data-token="colors"]')).not.toBeNull();
			expect(element.querySelector('[data-token="spacing"]')).not.toBeNull();
			expect(element.querySelector('[data-token="radius"]')).not.toBeNull();
		});

		changeToken(element, 'colors', 'aurora');
		changeToken(element, 'spacing', 'compact');
		changeToken(element, 'radius', 'sharp');

		await vi.waitFor(() => {
			expect(document.documentElement.dataset.ruiColors).toBe('aurora');
			expect(document.documentElement.dataset.ruiSpacing).toBe('compact');
			expect(document.documentElement.dataset.ruiRadius).toBe('sharp');
		});
		expect(JSON.parse(localStorage.getItem(DOCS_THEME_STORAGE_KEY) ?? '')).toMatchObject({
			colors: 'aurora',
			spacing: 'compact',
			radius: 'sharp',
		});
		expect(document.head.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="spacing"]`)?.textContent).toContain(
			'--space-1: 0.125rem',
		);
		expect(document.head.querySelector(`style[${DOCS_TOKEN_SHEET_ATTR}="radius"]`)?.textContent).toContain(
			'--radius-control: 0',
		);
	});
});
