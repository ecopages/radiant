/** Registers the Radiant UI custom elements rendered by the docs shell. */
import '@ecopages/radiant-ui/alert';
import '@ecopages/radiant-ui/breadcrumb';
import '@ecopages/radiant-ui/sidebar';
import '@ecopages/radiant-ui/toc';

const docsContentSelector = '.docs-layout__content';
const codeCopySelector = '[data-rehype-pretty-copy]';
const codeCopyFeedbackMs = 1200;

type DocsNavigationEvent = CustomEvent<{ url: URL }>;

function scrollDocsToTop(): void {
	document.querySelector<HTMLElement>(docsContentSelector)?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

async function copyTextToClipboard(text: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	document.body.append(textarea);
	textarea.select();
	document.execCommand('copy');
	textarea.remove();
}

function setCodeCopyFeedback(button: HTMLButtonElement, isError = false): void {
	button.dataset.copyError = String(isError);
	button.textContent = isError ? 'Try again' : 'Copied';
	button.setAttribute('aria-label', isError ? 'Could not copy code' : 'Code copied to clipboard');

	window.setTimeout(() => {
		button.removeAttribute('data-copy-error');
		button.textContent = 'Copy';
		button.setAttribute('aria-label', 'Copy code');
	}, codeCopyFeedbackMs);
}

document.addEventListener('click', (event) => {
	const target = event.target instanceof Element ? event.target.closest(codeCopySelector) : null;
	if (!(target instanceof HTMLButtonElement)) return;

	const source = target.dataset.rehypePrettyCopy;
	if (!source) return;

	void copyTextToClipboard(source)
		.then(() => setCodeCopyFeedback(target))
		.catch(() => setCodeCopyFeedback(target, true));
});

document.addEventListener('eco:after-swap', (event) => {
	const { url } = (event as DocsNavigationEvent).detail;
	if (url.hash) {
		return;
	}

	scrollDocsToTop();
});
