import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './500.script';

describe('radiant-ui 500 page copy action', () => {
	let writeText: ReturnType<typeof vi.fn>;
	let button: HTMLButtonElement;
	let label: HTMLSpanElement;

	beforeEach(() => {
		document.body.innerHTML = '';
		writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		});

		const page = document.createElement('div');
		page.className = 'error500';
		const detail = document.createElement('pre');
		detail.dataset.error500Detail = '';
		detail.textContent = 'TypeError: failed to render';
		button = document.createElement('button');
		button.dataset.error500Copy = '';
		button.setAttribute('aria-label', 'Copy error');
		label = document.createElement('span');
		label.dataset.error500CopyLabel = '';
		label.textContent = 'Copy error';
		button.append(label);
		page.append(detail, button);
		document.body.append(page);
	});

	afterEach(() => {
		window.clearTimeout(Number(button.dataset.error500CopyTimer));
		document.body.innerHTML = '';
		delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
		vi.restoreAllMocks();
	});

	it('copies the visible stack and reports success on the button', async () => {
		label.click();

		await vi.waitFor(() => expect(label.textContent).toBe('Copied'));
		expect(writeText).toHaveBeenCalledWith('TypeError: failed to render');
		expect(button.getAttribute('aria-label')).toBe('Error copied');
	});

	it('reports clipboard failures accessibly', async () => {
		writeText.mockRejectedValueOnce(new Error('Clipboard unavailable'));
		button.click();

		await vi.waitFor(() => expect(label.textContent).toBe('Copy failed'));
		expect(button.getAttribute('aria-label')).toBe('Could not copy the error');
	});
});
