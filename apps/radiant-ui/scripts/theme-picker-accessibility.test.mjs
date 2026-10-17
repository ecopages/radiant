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

async function measureThemeRendering(page, css, mode, theme) {
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
		<rui-tabs variant="boxed">
			<div class="rui-tabs__list" role="tablist">
				<button class="rui-tabs__tab" role="tab" aria-selected="false">Name</button>
				<button class="rui-tabs__tab" role="tab" aria-selected="true">Advanced</button>
			</div>
			<div class="rui-tabs__panel" role="tabpanel">Page content</div>
		</rui-tabs>
		<div class="rui-alert rui-alert--warning rui-alert--inline rui-alert--dismissible" role="alert">
			<span class="rui-alert__icon"></span>
			<div class="rui-alert__description">Disk space is running low</div>
			<button class="rui-alert__close" aria-label="Dismiss">×</button>
		</div>
	`;
	await page.setContent(`<html data-rui-theme="${theme}"><head><style>${css}</style></head><body>${markup}</body></html>`);
	return page.evaluate((mode) => {
		document.documentElement.classList.toggle('dark', mode === 'dark');
		const computed = (selector) => {
			const element = document.querySelector(selector);
			const style = getComputedStyle(element);
			return {
				background: style.backgroundColor,
				border: style.borderColor,
				borderBottom: style.borderBottomColor,
				borderRadius: style.borderRadius,
				borderStyle: style.borderStyle,
				color: style.color,
				fontFamily: style.fontFamily,
			};
		};
		const rootStyle = getComputedStyle(document.documentElement);
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
		const contrast = selectors.map((selector) => {
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
		return {
			contrast,
			roles: ['--primary', '--background', '--surface', '--rui-border-color', '--radius-control'].map((name) =>
				rootStyle.getPropertyValue(name).trim(),
			),
			picker: [
				computed('.theme-picker__menu'),
				computed('.theme-picker__option[aria-selected="true"]'),
			],
			tabs: {
				host: computed('rui-tabs[variant="boxed"]'),
				list: computed('rui-tabs[variant="boxed"] .rui-tabs__list'),
				selected: computed('rui-tabs[variant="boxed"] .rui-tabs__tab[aria-selected="true"]'),
				inactive: computed('rui-tabs[variant="boxed"] .rui-tabs__tab[aria-selected="false"]'),
				panel: computed('rui-tabs[variant="boxed"] .rui-tabs__panel'),
			},
			alert: [
				computed('.rui-alert'),
				computed('.rui-alert__description'),
				computed('.rui-alert__close'),
			],
		};
	}, mode);
}

test('theme picker text stays AA and persisted themes keep their tokens and component details', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const pickerCss = await readFile(pickerCssPath, 'utf8');
		const defaultCss = await readFile(defaultThemeStylesheetPath, 'utf8');
		const uiCss = await Promise.all([
			readFile(path.join(uiStylesDirectory, 'listbox/listbox.css'), 'utf8'),
			readFile(path.join(uiStylesDirectory, 'select/select.css'), 'utf8'),
			readFile(path.join(uiStylesDirectory, 'shared/popover.css'), 'utf8'),
			readFile(path.join(uiStylesDirectory, 'tabs/tabs.css'), 'utf8'),
			readFile(path.join(uiStylesDirectory, 'alert/alert.css'), 'utf8'),
		]);
		for (const theme of ['rui-default', ...optionalThemes]) {
			const themeCssPath =
				theme === 'rui-default' ? defaultThemeStylesheetPath : path.join(themesDirectory, `${theme}.css`);
			const themeCss = await readFile(themeCssPath, 'utf8');
			for (const mode of ['light', 'dark']) {
				const bootOrderCss = `${themeCss}\n${defaultCss}\n${uiCss.join('\n')}\n${pickerCss}`;
				const postBaseOrderCss = `${defaultCss}\n${themeCss}\n${uiCss.join('\n')}\n${pickerCss}`;
				const bootOrder = await measureThemeRendering(page, bootOrderCss, mode, theme);
				const postBaseOrder = await measureThemeRendering(page, postBaseOrderCss, mode, theme);
				assert.deepEqual(
					bootOrder.roles,
					postBaseOrder.roles,
					`${theme} ${mode} roles change when the saved theme loads before the base stylesheet`,
				);
				assert.deepEqual(
					bootOrder.picker,
					postBaseOrder.picker,
					`${theme} ${mode} picker surfaces change when the saved theme loads before the base stylesheet`,
				);
				assert.deepEqual(
					bootOrder.tabs,
					postBaseOrder.tabs,
					`${theme} ${mode} tab details change when the saved theme loads before the base stylesheet`,
				);
				assert.deepEqual(
					bootOrder.alert,
					postBaseOrder.alert,
					`${theme} ${mode} alert details change when the saved theme loads before the base stylesheet`,
				);
				if (theme === 'windows95') {
					assert.equal(bootOrder.tabs.selected.background, 'rgb(192, 192, 192)');
					assert.equal(bootOrder.tabs.selected.borderStyle, 'outset');
					assert.equal(bootOrder.tabs.selected.borderBottom, bootOrder.tabs.selected.background);
					assert.equal(bootOrder.tabs.inactive.borderStyle, 'outset');
					assert.equal(bootOrder.tabs.panel.borderStyle, 'inset');
					assert.match(bootOrder.tabs.selected.fontFamily, /Tahoma/);
				}
				if (theme === 'macos-classic') {
					assert.notEqual(bootOrder.tabs.selected.background, bootOrder.tabs.inactive.background);
					assert.match(bootOrder.tabs.selected.borderRadius, /^3px 3px 0px 0px$/);
					assert.equal(bootOrder.tabs.selected.borderStyle, 'solid');
				}
				const failures = [
					...bootOrder.contrast.map((result) => ({ ...result, order: 'theme-before-base' })),
					...postBaseOrder.contrast.map((result) => ({ ...result, order: 'base-before-theme' })),
				].filter((result) => result.ratio < 4.5);
				assert.deepEqual(
					failures,
					[],
					`${theme} ${mode} picker text below AA: ${failures.map((result) => `${result.order} ${result.selector} ${result.ratio}:1`).join(', ')}`,
				);
			}
		}
	} finally {
		await browser.close();
	}
});
