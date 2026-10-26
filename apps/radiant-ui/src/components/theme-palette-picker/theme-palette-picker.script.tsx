import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import type { RuiSelectElement } from '@ecopages/radiant-ui/select';
import {
	applyDocumentTokens,
	defaultDocsThemeSelection,
	docsThemeColorOptions,
	isDocsThemeColor,
	readDocsThemeSelection,
	updateDocsThemeSelection,
	type DocsThemeSelection,
} from '@/lib/docs-theme-preview';

/** Shared docs header theme picker; selection changes are stored in docs-only state. */
@customElement('radiant-theme-palette-picker')
export class ThemePalettePickerElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	private selection: DocsThemeSelection = defaultDocsThemeSelection;
	private rootObserver: MutationObserver | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.selection = readDocsThemeSelection();
		applyDocumentTokens(this.selection, { persist: false });
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

	@onEvent({ selector: 'rui-select[data-theme-picker]', type: 'rui-change' })
	onThemeChange(event: Event): void {
		const value = (event as CustomEvent<{ value?: unknown }>).detail?.value;
		if (!Array.isArray(value) || !isDocsThemeColor(value[0])) return;

		this.selection = updateDocsThemeSelection(this.selection, 'colors', value[0]);
		applyDocumentTokens(this.selection);
		this.syncThemeChoices();
	}

	private syncThemeChoices(): void {
		const select = this.querySelector<RuiSelectElement>('rui-select[data-theme-picker]');
		if (!select) return;
		select.value = [this.selection.colors];
		const selectedLabel = docsThemeColorOptions.find(({ value }) => value === this.selection.colors)?.label;
		const selectionText = this.querySelector<HTMLElement>('[data-select-value]');
		if (selectionText && selectedLabel) selectionText.textContent = selectedLabel;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-theme-palette-picker': ThemePalettePickerElement;
	}
}
