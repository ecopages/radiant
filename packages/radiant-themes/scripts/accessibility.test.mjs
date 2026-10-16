import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import { chromium } from 'playwright';
import test from 'node:test';

const packageRoot = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const uiRoot = path.resolve(packageRoot, '../radiant-ui');
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
const contrastPairs = [
	['on-background', 'background'],
	['on-surface', 'surface'],
	...['lowest', 'low', '', 'high', 'highest'].map((suffix) => [
		`on-surface-container${suffix ? `-${suffix}` : ''}`,
		`surface-container${suffix ? `-${suffix}` : ''}`,
	]),
	...['primary', 'secondary', 'tertiary', 'error', 'success', 'info', 'warning'].flatMap((role) => [
		[`on-${role}`, role],
		[`on-${role}-container`, `${role}-container`],
	]),
];

async function inlineImports(file, seen = new Set()) {
	if (seen.has(file)) return '';
	seen.add(file);
	const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
	const imports = [];
	root.walkAtRules('import', (rule) => {
		const specifier = rule.params.match(/^['"]([^'"]+)['"]$/)?.[1];
		assert.ok(specifier, `expected a CSS import in ${file}`);
		const imported = specifier.startsWith('.')
			? path.resolve(path.dirname(file), specifier)
			: require.resolve(specifier, { paths: [file, packageRoot, uiRoot] });
		imports.push([rule, imported]);
	});
	for (const [rule, imported] of imports) {
		rule.replaceWith(postcss.parse(await inlineImports(imported, seen)));
	}
	return root.toString();
}

async function readThemeCss(theme) {
	if (theme === 'rui-default') {
		return inlineImports(path.join(uiRoot, 'src/styles/themes/default.css'));
	}

	return readFile(path.join(packageRoot, `dist/compiled/themes/${theme}.css`), 'utf8');
}

async function measureContrast(page, css, mode, pairs) {
	await page.setContent(`<style>${css}</style><div id="probe">Text</div>`);
	return page.evaluate(
		({ mode, pairs }) => {
			document.documentElement.classList.toggle('dark', mode === 'dark');
			const probe = document.querySelector('#probe');
			const luminance = (color) => {
				const canvas = document.createElement('canvas');
				canvas.width = 1;
				canvas.height = 1;
				const context = canvas.getContext('2d');
				context.fillStyle = color;
				context.fillRect(0, 0, 1, 1);
				const [red, green, blue] = Array.from(
					context.getImageData(0, 0, 1, 1).data.slice(0, 3),
					(value) => value / 255,
				);
				const linear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
				const [r, g, b] = [red, green, blue].map(linear);
				return 0.2126 * r + 0.7152 * g + 0.0722 * b;
			};

			return pairs.map(([foregroundRole, backgroundRole]) => {
				probe.style.color = `var(--${foregroundRole})`;
				probe.style.backgroundColor = `var(--${backgroundRole})`;
				const styles = getComputedStyle(probe);
				const foreground = luminance(styles.color);
				const background = luminance(styles.backgroundColor);
				return {
					foregroundRole,
					backgroundRole,
					ratio: Number(
						((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toFixed(
							2,
						),
					),
				};
			});
		},
		{ mode, pairs },
	);
}

async function measureBorderContrast(page, css, mode) {
	await page.setContent(`<style>${css}</style><div id="probe">Control</div>`);
	return page.evaluate((mode) => {
		document.documentElement.classList.toggle('dark', mode === 'dark');
		const probe = document.querySelector('#probe');
		probe.style.color = 'var(--border)';
		probe.style.backgroundColor = 'var(--background)';
		const styles = getComputedStyle(probe);
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const context = canvas.getContext('2d');
		const luminance = (color, background = 'white') => {
			context.fillStyle = background;
			context.fillRect(0, 0, 1, 1);
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			const [red, green, blue] = Array.from(
				context.getImageData(0, 0, 1, 1).data.slice(0, 3),
				(value) => value / 255,
			);
			const linear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
			return [red, green, blue]
				.map(linear)
				.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
		};
		const background = luminance(styles.backgroundColor);
		const border = luminance(styles.color, styles.backgroundColor);
		return Number(((Math.max(background, border) + 0.05) / (Math.min(background, border) + 0.05)).toFixed(2));
	}, mode);
}

async function measureRenderedTextContrast(page, { css, mode, markup, selectors }) {
	await page.setContent(`<style>${css}</style>${markup}`);
	return page.evaluate(
		({ mode, selectors }) => {
			document.documentElement.classList.toggle('dark', mode === 'dark');
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			const context = canvas.getContext('2d');
			const getLuminance = () => {
				const [red, green, blue] = Array.from(
					context.getImageData(0, 0, 1, 1).data.slice(0, 3),
					(value) => value / 255,
				);
				const linear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
				const [r, g, b] = [red, green, blue].map(linear);
				return 0.2126 * r + 0.7152 * g + 0.0722 * b;
			};

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
				const background = getLuminance();
				context.fillStyle = getComputedStyle(element).color;
				context.fillRect(0, 0, 1, 1);
				const foreground = getLuminance();
				return {
					selector,
					ratio: Number(
						((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toFixed(
							2,
						),
					),
				};
			});
		},
		{ mode, selectors },
	);
}

async function measureHoveredButtonContrast(page, { css, mode, variant }) {
	await page.setContent(`<style>${css}</style><button class="rui-button ${variant}">Action</button>`);
	await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), mode);
	const button = page.locator('button');
	await button.hover();
	return button.evaluate((element) => {
		const { color, backgroundColor } = getComputedStyle(element);
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const context = canvas.getContext('2d');
		const luminance = (value) => {
			context.fillStyle = value;
			context.fillRect(0, 0, 1, 1);
			const [red, green, blue] = Array.from(
				context.getImageData(0, 0, 1, 1).data.slice(0, 3),
				(channel) => channel / 255,
			);
			const linear = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
			const [r, g, b] = [red, green, blue].map(linear);
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const foreground = luminance(color);
		const background = luminance(backgroundColor);
		return Number(
			((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).toFixed(2),
		);
	});
}

test('Radiant Default text and semantic pairs meet WCAG AA in light and dark modes', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const css = await readThemeCss('rui-default');
		for (const mode of ['light', 'dark']) {
			const results = await measureContrast(page, css, mode, contrastPairs);
			const failures = results.filter((result) => result.ratio < 4.5);
			assert.deepEqual(
				failures,
				[],
				`${mode} pairs below AA: ${failures.map((result) => `${result.foregroundRole}/${result.backgroundRole} ${result.ratio}:1`).join(', ')}`,
			);

			const link = await measureContrast(page, css, mode, [['link', 'background']]);
			assert.ok(link[0].ratio >= 4.5, `${mode} links have ${link[0].ratio}:1 contrast`);
			const focus = await measureContrast(page, css, mode, [['focus-ring', 'background']]);
			assert.ok(focus[0].ratio >= 3, `${mode} focus ring has ${focus[0].ratio}:1 contrast`);
			const border = await measureBorderContrast(page, css, mode);
			assert.ok(border >= 3, `${mode} control border has ${border}:1 contrast`);
		}
	} finally {
		await browser.close();
	}
});

test('High Contrast text and semantic pairs meet WCAG AAA in light and dark modes', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const css = `${await readThemeCss('rui-default')}\n${await readThemeCss('high-contrast')}`;
		for (const mode of ['light', 'dark']) {
			const results = await measureContrast(page, css, mode, contrastPairs);
			const failures = results.filter((result) => result.ratio < 7);
			assert.deepEqual(
				failures,
				[],
				`${mode} pairs below AAA: ${failures.map((result) => `${result.foregroundRole}/${result.backgroundRole} ${result.ratio}:1`).join(', ')}`,
			);

			const link = await measureContrast(page, css, mode, [['link', 'background']]);
			assert.ok(link[0].ratio >= 7, `${mode} links have ${link[0].ratio}:1 contrast`);
			const focus = await measureContrast(page, css, mode, [['focus-ring', 'background']]);
			assert.ok(focus[0].ratio >= 3, `${mode} focus ring has ${focus[0].ratio}:1 contrast`);
		}
	} finally {
		await browser.close();
	}
});

test('optional themes retain AA text and visible focus in both modes', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		for (const theme of optionalThemes) {
			const css = await readThemeCss(theme);
			for (const mode of ['light', 'dark']) {
				const results = await measureContrast(page, css, mode, contrastPairs);
				const failures = results.filter((result) => result.ratio < 4.5);
				assert.deepEqual(
					failures,
					[],
					`${theme} ${mode} pairs below AA: ${failures.map((result) => `${result.foregroundRole}/${result.backgroundRole} ${result.ratio}:1`).join(', ')}`,
				);

				const link = await measureContrast(page, css, mode, [['link', 'background']]);
				assert.ok(link[0].ratio >= 4.5, `${theme} ${mode} links have ${link[0].ratio}:1 contrast`);
				const focus = await measureContrast(page, css, mode, [['focus-ring', 'background']]);
				assert.ok(focus[0].ratio >= 3, `${theme} ${mode} focus ring has ${focus[0].ratio}:1 contrast`);
				const border = await measureBorderContrast(page, css, mode);
				assert.ok(border >= 3, `${theme} ${mode} control border has ${border}:1 contrast`);
			}
		}
	} finally {
		await browser.close();
	}
});

test('classic dialog chrome keeps title, close control, and action text readable', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const markup = `
			<div class="rui-dialog__surface">
				<button class="rui-dialog__close">×</button>
				<div class="rui-dialog__title">Edit profile</div>
				<button class="rui-button">Open dialog</button>
				<button class="rui-button rui-button--filled">Save</button>
				<button class="rui-button rui-button--destructive">Delete</button>
			</div>
		`;
		const selectors = [
			'.rui-dialog__title',
			'.rui-dialog__close',
			'.rui-button',
			'.rui-button--filled',
			'.rui-button--destructive',
		];
		for (const theme of ['windows95', 'macos-classic']) {
			const css = await readThemeCss(theme);
			for (const mode of ['light', 'dark']) {
				const results = await measureRenderedTextContrast(page, { css, mode, markup, selectors });
				const failures = results.filter((result) => result.ratio < 4.5);
				assert.deepEqual(
					failures,
					[],
					`${theme} ${mode} dialog text below AA: ${failures.map((result) => `${result.selector} ${result.ratio}:1`).join(', ')}`,
				);
				const chrome = await page.locator('.rui-dialog__close').evaluate((button) => {
					const style = getComputedStyle(button);
					return {
						backgroundColor: style.backgroundColor,
						borderStyle: style.borderTopStyle,
						borderWidth: style.borderTopWidth,
						zIndex: style.zIndex,
					};
				});
				assert.equal(chrome.borderStyle, 'outset', `${theme} ${mode} close control has raised chrome`);
				assert.equal(chrome.borderWidth, theme === 'windows95' ? '2px' : '1px');
				assert.notEqual(
					chrome.backgroundColor,
					'rgba(0, 0, 0, 0)',
					`${theme} ${mode} close control has a face`,
				);
				assert.equal(chrome.zIndex, '1', `${theme} ${mode} close control sits above its title bar`);
				for (const variant of ['rui-button--filled', 'rui-button--destructive']) {
					const hoverContrast = await measureHoveredButtonContrast(page, { css, mode, variant });
					assert.ok(
						hoverContrast >= 4.5,
						`${theme} ${mode} ${variant} hover text has ${hoverContrast}:1 contrast`,
					);
				}
				if (theme === 'macos-classic') {
					const titlebarStripe = await measureContrast(page, css, mode, [
						['on-surface', 'macos-classic-titlebar-stripe'],
					]);
					assert.ok(
						titlebarStripe[0].ratio >= 4.5,
						`${mode} Mac OS Classic title text has ${titlebarStripe[0].ratio}:1 contrast on its brightest stripe`,
					);
				}
			}
		}
	} finally {
		await browser.close();
	}
});

test('shared focus styles yield to a theme component focus treatment', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const css = await readThemeCss('windows95');
		await page.setContent(`<style>${css}</style><button class="rui-button">Continue</button>`);
		await page.keyboard.press('Tab');
		const outlineStyle = await page
			.locator('.rui-button')
			.evaluate((button) => getComputedStyle(button).outlineStyle);
		assert.equal(outlineStyle, 'dotted');
	} finally {
		await browser.close();
	}
});

test('shared styles respect contrast, reduced motion, and Windows forced colors', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const increasedContrast = await browser.newPage();
		await increasedContrast.emulateMedia({ contrast: 'more' });
		for (const theme of [
			'rui-default',
			'github',
			'vscode',
			'vercel',
			'material',
			'high-contrast',
			'windows95',
			'macos-classic',
			'macos',
		]) {
			const css = await readThemeCss(theme);
			await increasedContrast.setContent(`<style>${css}</style><button>Continue</button>`);
			const contrastPreferences = await increasedContrast.evaluate(() => ({
				requested: matchMedia('(prefers-contrast: more)').matches,
				borderAlpha: getComputedStyle(document.documentElement).getPropertyValue('--rui-border-alpha').trim(),
				focusWidth: getComputedStyle(document.documentElement).getPropertyValue('--focus-ring-width').trim(),
			}));
			assert.equal(contrastPreferences.requested, true);
			assert.equal(contrastPreferences.borderAlpha, '100%', `${theme} increases border contrast`);
			assert.equal(contrastPreferences.focusWidth, '3px', `${theme} increases focus-ring width`);
			if (theme === 'rui-default') {
				const border = await measureContrast(increasedContrast, css, 'light', [['border', 'background']]);
				assert.ok(border[0].ratio >= 3, `increased contrast border has ${border[0].ratio}:1 contrast`);
			}
		}
		await increasedContrast.close();

		const css = await readThemeCss('rui-default');
		const reducedMotion = await browser.newPage({ reducedMotion: 'reduce' });
		await reducedMotion.setContent(`<style>${css}</style><button>Continue</button>`);
		const duration = await reducedMotion.evaluate(() =>
			getComputedStyle(document.documentElement).getPropertyValue('--duration-normal').trim(),
		);
		assert.equal(duration, '0ms');
		await reducedMotion.close();

		const forcedColors = await browser.newPage({ forcedColors: 'active' });
		await forcedColors.setContent(`<style>${css}</style><button>Continue</button>`);
		await forcedColors.keyboard.press('Tab');
		const focus = await forcedColors.evaluate(() => {
			const button = document.querySelector('button');
			const style = getComputedStyle(button);
			return {
				forced: matchMedia('(forced-colors: active)').matches,
				outlineStyle: style.outlineStyle,
				outlineWidth: style.outlineWidth,
				outlineOffset: style.outlineOffset,
			};
		});
		assert.equal(focus.forced, true);
		assert.equal(focus.outlineStyle, 'solid');
		assert.equal(focus.outlineWidth, '3px');
		assert.equal(focus.outlineOffset, '2px');
	} finally {
		await browser.close();
	}
});

test('increased contrast strengthens semantic borders across all themes', async () => {
	const browser = await chromium.launch({ headless: true });
	try {
		const standardContrast = await browser.newPage();
		const increasedContrast = await browser.newPage();
		await increasedContrast.emulateMedia({ contrast: 'more' });
		for (const theme of ['rui-default', ...optionalThemes]) {
			const css = await readThemeCss(theme);
			for (const mode of ['light', 'dark']) {
				const standard = await measureBorderContrast(standardContrast, css, mode);
				const increased = await measureBorderContrast(increasedContrast, css, mode);
				assert.ok(increased >= 3, `${theme} ${mode} increased-contrast border has ${increased}:1 contrast`);
				if (theme !== 'high-contrast') {
					assert.ok(
						increased > standard,
						`${theme} ${mode} increased-contrast border improves on ${standard}:1 normal contrast`,
					);
				}
			}
		}
	} finally {
		await browser.close();
	}
});
