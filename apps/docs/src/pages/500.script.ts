import { isServer } from '@ecopages/radiant/is-server';

const copySelector = '[data-error500-copy]';
const detailSelector = '[data-error500-detail]';
const labelSelector = '[data-error500-copy-label]';
const feedbackMs = 2000;

async function copyText(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const area = document.createElement('textarea');
	area.value = text;
	area.setAttribute('readonly', '');
	area.style.position = 'fixed';
	area.style.opacity = '0';
	document.body.append(area);
	area.select();
	const copied = document.execCommand('copy');
	area.remove();
	if (!copied) {
		throw new Error('Clipboard copy failed');
	}
}

function setFeedback(button: HTMLButtonElement, state: 'copied' | 'failed'): void {
	const label = button.querySelector(labelSelector);
	if (!label) return;

	window.clearTimeout(Number(button.dataset.error500CopyTimer));
	label.textContent = state === 'copied' ? 'Copied' : 'Copy failed';
	button.setAttribute('aria-label', state === 'copied' ? 'Error copied' : 'Could not copy the error');

	const timer = window.setTimeout(() => {
		label.textContent = 'Copy error';
		button.setAttribute('aria-label', 'Copy error');
		delete button.dataset.error500CopyTimer;
	}, feedbackMs);
	button.dataset.error500CopyTimer = String(timer);
}

if (!isServer) {
	document.addEventListener('click', (event) => {
		const target = event.target instanceof Element ? event.target.closest(copySelector) : null;
		if (!(target instanceof HTMLButtonElement)) return;

		const text = target.closest('.error500')?.querySelector(detailSelector)?.textContent?.trim() ?? '';
		if (!text) return;

		void copyText(text)
			.then(() => setFeedback(target, 'copied'))
			.catch(() => setFeedback(target, 'failed'));
	});
}
