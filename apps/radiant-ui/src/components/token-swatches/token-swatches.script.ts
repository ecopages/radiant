import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { DOCS_THEME_STYLESHEET_LOAD_EVENT } from '@/lib/docs-theme-preview';

const COPY_FEEDBACK_MS = 1200;
const ROOT_TOKEN_ATTRIBUTES = ['class', 'style', 'data-rui-theme'] as const;

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

/**
 * Docs-only token swatch host. Markup is server-rendered; this element copies
 * token names and refreshes computed values when the live docs preview changes.
 */
@customElement('radiant-token-swatches')
export class TokenSwatchesElement extends RadiantElement {
	private rootObserver: MutationObserver | null = null;
	private resetTimeoutId: number | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.refreshComputedValues();
		this.rootObserver = new MutationObserver(() => this.refreshComputedValues());
		this.rootObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: [...ROOT_TOKEN_ATTRIBUTES],
		});
	}

	override disconnectedCallback(): void {
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		if (this.resetTimeoutId !== null) {
			window.clearTimeout(this.resetTimeoutId);
			this.resetTimeoutId = null;
		}
		super.disconnectedCallback();
	}

	@onEvent({ window: true, type: DOCS_THEME_STYLESHEET_LOAD_EVENT })
	onThemeStylesheetLoad(): void {
		this.refreshComputedValues();
	}

	@onEvent({ selector: '[data-token-copy]', type: 'click' })
	async onCopy(event: Event): Promise<void> {
		const eventTarget = event.target instanceof Element ? event.target : null;
		const trigger = eventTarget?.closest('[data-token-copy]');
		if (!(trigger instanceof HTMLElement) || !this.contains(trigger)) return;

		const token = trigger.dataset.tokenCopy;
		if (!token) return;

		try {
			await copyTextToClipboard(token);
			this.markCopied(trigger, token);
		} catch {
			this.setStatus(`Could not copy ${token}`);
		}
	}

	/**
	 * @remarks Samples use CSS variables that the selected theme and default
	 * theme tuner can remap. Read values from `:root` so labels stay honest.
	 */
	private refreshComputedValues(): void {
		const styles = getComputedStyle(document.documentElement);
		for (const node of this.querySelectorAll<HTMLElement>('[data-token-value]')) {
			const token = node.dataset.tokenValue;
			if (!token) continue;
			node.textContent = styles.getPropertyValue(token).trim() || '—';
		}
	}

	private markCopied(trigger: HTMLElement, token: string): void {
		for (const node of this.querySelectorAll('[data-copied="true"]')) {
			if (node instanceof HTMLElement) node.dataset.copied = 'false';
		}

		trigger.dataset.copied = 'true';
		this.setStatus(`Copied ${token}`);

		if (this.resetTimeoutId !== null) window.clearTimeout(this.resetTimeoutId);
		this.resetTimeoutId = window.setTimeout(() => {
			trigger.dataset.copied = 'false';
			this.setStatus('');
			this.resetTimeoutId = null;
		}, COPY_FEEDBACK_MS);
	}

	private setStatus(message: string): void {
		const status = this.querySelector('[data-token-status]');
		if (status) status.textContent = message;
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-token-swatches': JsxCustomElementAttributes<TokenSwatchesElement>;
	}
}
