import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import {
	applyDocumentTokens,
	defaultDocsThemeSelection,
	docsThemeTokenNames,
	isDocsThemeTokenName,
	readDocsThemeSelection,
	updateDocsThemeSelection,
	type DocsThemeSelection,
} from '@/lib/docs-theme-preview';

/** Shared docs header theme picker; selection changes are stored in docs-only state. */
@customElement('radiant-theme-palette-picker')
export class ThemePalettePickerElement extends RadiantElement {
	private selection: DocsThemeSelection = defaultDocsThemeSelection;
	private rootObserver: MutationObserver | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.selection = readDocsThemeSelection();
		applyDocumentTokens(this.selection);
		this.syncThemeChoices();
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root && typeof MutationObserver !== 'undefined') {
			this.rootObserver = new MutationObserver(() => {
				this.selection = readDocsThemeSelection();
				this.syncThemeChoices();
			});
			this.rootObserver.observe(root, {
				attributes: true,
				attributeFilter: ['data-rui-theme'],
			});
		}
	}

	override disconnectedCallback(): void {
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		super.disconnectedCallback();
	}

	@onEvent({ selector: 'input[type="radio"][data-token]', type: 'change' })
	onThemeChange(event: Event): void {
		const input = event.target;
		const token = input instanceof HTMLInputElement ? input.dataset.token : undefined;
		const value = input instanceof HTMLInputElement ? input.value : undefined;
		if (!isDocsThemeTokenName(token) || typeof value !== 'string') return;

		this.selection = updateDocsThemeSelection(this.selection, token, value);
		applyDocumentTokens(this.selection);
		this.syncThemeChoices();
		const details = this.querySelector('details');
		if (details) {
			details.open = false;
			this.querySelector<HTMLElement>('summary')?.focus();
		}
	}

	private syncThemeChoices(): void {
		for (const token of docsThemeTokenNames) {
			const value = this.selection[token];
			for (const input of this.querySelectorAll<HTMLInputElement>(`input[data-token="${token}"]`)) {
				input.checked = input.value === value;
			}
		}
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-theme-palette-picker': JsxCustomElementAttributes<ThemePalettePickerElement>;
	}
}
