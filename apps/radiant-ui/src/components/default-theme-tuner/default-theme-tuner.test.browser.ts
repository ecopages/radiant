import { afterEach, describe, expect, it } from 'vitest';
import { DOCS_DEFAULT_TUNING_STORAGE_KEY, DOCS_DEFAULT_THEME_TUNING } from '@/lib/docs-theme-preview';
import { DefaultThemeTunerElement } from './default-theme-tuner.script';

const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 0));

async function createTuner(): Promise<DefaultThemeTunerElement> {
	const element = document.createElement('radiant-default-theme-tuner') as DefaultThemeTunerElement;
	document.body.append(element);
	await waitForUpdate();
	return element;
}

describe('DefaultThemeTunerElement', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		localStorage.removeItem(DOCS_DEFAULT_TUNING_STORAGE_KEY);
		delete document.documentElement.dataset.ruiTheme;
		for (const property of [
			'--rui-primary',
			'--rui-secondary',
			'--rui-neutral',
			'--rui-density',
			'--rui-radius-scale',
			'--rui-border-alpha',
		]) {
			document.documentElement.style.removeProperty(property);
		}
	});

	it('updates the default seed, resets its values, and disables controls for optional themes', async () => {
		document.documentElement.dataset.ruiTheme = 'rui-default';
		const tuner = await createTuner();
		const sliders = tuner.querySelectorAll('rui-slider[data-default-tuning]');
		expect(sliders).toHaveLength(6);
		const primaryHue = tuner.querySelector('rui-slider[data-default-tuning="primaryHue"]');
		const primaryThumb = primaryHue?.querySelector<HTMLButtonElement>('[data-thumb="value"]');
		if (!primaryHue || !primaryThumb) throw new Error('The primary hue slider is missing');
		const primaryLabel = tuner.querySelector('[data-rui-field-label]');
		const primaryDescription = tuner.querySelector<HTMLElement>('[data-rui-field-description]');
		expect(primaryThumb.getAttribute('aria-labelledby')).toBe(primaryLabel?.id);
		expect(primaryThumb.getAttribute('aria-describedby')).toBe(primaryDescription?.id);

		for (let step = 0; step < 3; step += 1) {
			primaryThumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		}
		await waitForUpdate();
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 267)');
		expect(JSON.parse(localStorage.getItem(DOCS_DEFAULT_TUNING_STORAGE_KEY) ?? '')).toMatchObject({
			primaryHue: 267,
		});
		expect(tuner.querySelector('rui-slider[data-default-tuning="primaryHue"]')).toBe(primaryHue);
		expect(primaryThumb.getAttribute('aria-valuenow')).toBe('267');
		expect(tuner.querySelector('output[data-default-tuning-value="primaryHue"]')?.textContent).toBe('267°');
		expect(tuner.querySelector('.default-theme-tuner__css code')?.textContent).toContain(
			'--rui-primary: oklch(52% 0.19 267);',
		);

		tuner.querySelector<HTMLButtonElement>('button[data-reset-default-tuning]')?.click();
		await waitForUpdate();
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 264)');
		expect(JSON.parse(localStorage.getItem(DOCS_DEFAULT_TUNING_STORAGE_KEY) ?? '')).toEqual(
			DOCS_DEFAULT_THEME_TUNING,
		);
		expect(primaryThumb.getAttribute('aria-valuenow')).toBe('264');
		expect(tuner.querySelector('output[data-default-tuning-value="primaryHue"]')?.textContent).toBe('264°');

		document.documentElement.dataset.ruiTheme = 'github';
		await waitForUpdate();
		expect(tuner.querySelector('rui-slider[data-default-tuning="primaryHue"]')?.hasAttribute('disabled')).toBe(
			true,
		);
		expect(primaryThumb.disabled).toBe(true);
	});
});
