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
		const inputs = tuner.querySelectorAll<HTMLInputElement>('input[data-default-tuning]');
		expect(inputs).toHaveLength(6);
		const primaryHue = tuner.querySelector<HTMLInputElement>('input[data-default-tuning="primaryHue"]');
		if (!primaryHue) throw new Error('The primary hue control is missing');

		primaryHue.value = '280';
		primaryHue.dispatchEvent(new Event('input', { bubbles: true }));
		await waitForUpdate();
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 280)');
		expect(JSON.parse(localStorage.getItem(DOCS_DEFAULT_TUNING_STORAGE_KEY) ?? '')).toMatchObject({
			primaryHue: 280,
		});

		tuner.querySelector<HTMLButtonElement>('button[data-reset-default-tuning]')?.click();
		await waitForUpdate();
		expect(document.documentElement.style.getPropertyValue('--rui-primary')).toBe('oklch(52% 0.19 264)');
		expect(JSON.parse(localStorage.getItem(DOCS_DEFAULT_TUNING_STORAGE_KEY) ?? '')).toEqual(
			DOCS_DEFAULT_THEME_TUNING,
		);

		document.documentElement.dataset.ruiTheme = 'github';
		await waitForUpdate();
		expect(tuner.querySelector<HTMLInputElement>('input[data-default-tuning="primaryHue"]')?.disabled).toBe(true);
	});
});
