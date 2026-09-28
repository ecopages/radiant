import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenSwatchesElement } from './token-swatches.script';

function resetDom(): void {
	document.body.innerHTML = '';
}

async function createSwatches(html: string): Promise<TokenSwatchesElement> {
	const element = document.createElement('radiant-token-swatches') as TokenSwatchesElement;
	element.innerHTML = html;
	document.body.append(element);
	await Promise.resolve();
	return element;
}

describe('TokenSwatchesElement', () => {
	beforeEach(() => {
		resetDom();
		document.documentElement.style.setProperty('--space-4', '1rem');
		vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
	});

	afterEach(() => {
		resetDom();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('copies the token name and announces success', async () => {
		const element = await createSwatches(
			'<button type="button" data-token-copy="--primary">primary</button><div data-token-status></div>',
		);
		const button = element.querySelector<HTMLButtonElement>('[data-token-copy]');
		if (!button) throw new Error('Expected a copy trigger');

		button.click();

		await vi.waitFor(() => {
			expect(button.dataset.copied).toBe('true');
		});
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith('--primary');
		expect(element.querySelector('[data-token-status]')?.textContent).toBe('Copied --primary');
	});

	it('copies when the click lands on a descendant of the trigger', async () => {
		const element = await createSwatches(
			'<button type="button" data-token-copy="--space-4"><span class="token-space__bar"></span></button><div data-token-status></div>',
		);
		const button = element.querySelector<HTMLButtonElement>('[data-token-copy]');
		if (!button) throw new Error('Expected a copy trigger');

		button.querySelector('span')?.click();

		await vi.waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith('--space-4');
		});
	});

	it('fills computed token values from the document', async () => {
		const element = await createSwatches('<span data-token-value="--space-4"></span><div data-token-status></div>');

		await vi.waitFor(() => {
			expect(element.querySelector('[data-token-value]')?.textContent).toBe('1rem');
		});
	});
});
