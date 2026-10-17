import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';

const scriptDirectory = import.meta.dirname;
const themesDirectory = path.resolve(scriptDirectory, '../../../packages/radiant-themes/dist/compiled/themes');
const uiStylesDirectory = path.resolve(scriptDirectory, '../../../packages/radiant-ui/dist/components/ui');
const defaultThemeStylesheetPath = path.resolve(scriptDirectory, '../dist/assets/styles/tailwind.css');
const pickerCssPath = path.resolve(scriptDirectory, '../src/components/theme-palette-picker/theme-palette-picker.css');
const optionalThemes = [
	'github',
	'vscode',
	'vercel',
	'material',
	'high-contrast',
	'windows95',
	'macos-classic',
	'macos',
];

async function measureContrast(page, css, mode) {
	const markup = `
		<div class="rui-select__listbox rui-popover rui-popover--listbox theme-picker__menu">
			<p class="theme-picker__menu-heading">Documentation theme</p>
			<div class="rui-listbox" role="listbox" aria-label="Documentation theme">
			<div class="rui-listbox__option theme-picker__option" role="option" aria-selected="true">
				<span class="theme-picker__swatch"></span>
				<span class="theme-picker__option-copy">
					<span class="theme-picker__option-label">Selected theme</span>
					<span class="theme-picker__option-description">Selected theme description</span>
				</span>
				<span class="rui-listbox__option-indicator" data-listbox-option-indicator></span>
			</div>
			<div class="rui-listbox__option theme-picker__option" role="option" aria-selected="false">
				<span class="theme-picker__swatch"></span>
				<span class="theme-picker__option-copy">
					<span class="theme-picker__option-label">Other theme</span>
					<span class="theme-picker__option-description">Other theme description</span>
				</span>
			</div>
			</div>
		</div>
	`;
	await page.setContent(`<style>${css}</style>${markup}`);
	return page.evaluate((mode) => {
		document.documentElement.classList.toggle('dark', mode === 'dark');
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const context = canvas.getContext('2d');
		const luminance = () => {
			const [red, green, blue] = Array.from(
				context.getImageData(0, 0, 1, 1).data.slice(0, 3),
				(value) => value / 255,
			);
			const linear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
			const [r, g, b] = [red, green, blue].map(linear);
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const selectors = [
			'.theme-picker__option[aria-selected="true"] .theme-picker__option-label',
			'.theme-picker__option[aria-selected="true"] .theme-picker__option-description',
			'.theme-picker__option[aria-selected="false"] .theme-picker__option-label',
			'.theme-picker__option[aria-selected="false"] .theme-picker__option-description',
		];
		return selectors.map((selector) => {
			const element = document.querySelector(selector);
			const ancestors = [];
			for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
				ancestors.push(node);
			}
			context.clearRect(0, 0, 1, 1);
			for (const ancestor of ancestors.reverse()) {
				context.fillStyle = getComputedStyle(ancestor).backgroundColor;
				context.fillRect(0, 0, 1, 1);
			}
			const background = luminance();
			context.fillStyle = getComputedStyle(element).color;
			context.fillRect(0, 0, 1, 1);
			const foreground = luminance();
			return {
				selector,
				ratio: Number(
					((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toFixed(2),
				),
			};
		});
	}, mode);
}

test('theme picker labels and descriptions meet AA in every documentation theme mode', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const pickerCss = await readFile(pickerCssPath, 'utf8');
		const uiCss = await Promise.all([
			readFile(path.join(uiStylesDirectory, 'listbox/listbox.css'), 'utf8'),
			readFile(path.join(uiStylesDirectory, 'select/select.css'), 'utf8'),
			readFile(path.join(uiStylesDirectory, 'shared/popover.css'), 'utf8'),
		]);
		for (const theme of ['rui-default', ...optionalThemes]) {
			const themeCssPath =
				theme === 'rui-default' ? defaultThemeStylesheetPath : path.join(themesDirectory, `${theme}.css`);
			const themeCss = await readFile(themeCssPath, 'utf8');
			for (const mode of ['light', 'dark']) {
				const results = await measureContrast(page, `${themeCss}\n${uiCss.join('\n')}\n${pickerCss}`, mode);
				const failures = results.filter((result) => result.ratio < 4.5);
				assert.deepEqual(
					failures,
					[],
					`${theme} ${mode} picker text below AA: ${failures.map((result) => `${result.selector} ${result.ratio}:1`).join(', ')}`,
				);
			}
		}
	} finally {
		await browser.close();
	}
});
