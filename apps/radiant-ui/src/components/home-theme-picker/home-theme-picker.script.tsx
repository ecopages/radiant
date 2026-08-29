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

/**
 * Homepage token picker host. Markup is authored as light DOM so nested
 * `rui-select` instances SSR; this class only syncs and persists selection.
 *
 * @remarks Selections write the same docs-only `data-rui-*` attrs as the
 * theming panel and inject published spacing/radius pack stylesheets. Those
 * attributes are not an application API.
 */
@customElement('radiant-home-theme-picker')
export class HomeThemePickerElement extends RadiantElement {
	private selection: DocsThemeSelection = defaultDocsThemeSelection;

	/**
	 * @remarks Nested `rui-select` hosts upgrade after this callback, so value
	 * sync waits a microtask. Before upgrade the host has no `value` field.
	 */
	override connectedCallback(): void {
		super.connectedCallback();
		this.selection = readDocsThemeSelection();
		applyDocumentTokens(this.selection);
	}

	/**
	 * @remarks Nested `rui-select` hosts upgrade after this callback, so value
	 * sync waits for the connect microtask. Before upgrade the host has no
	 * `value` field.
	 */
	protected override onConnected(): void {
		this.syncSelectValues();
	}

	@onEvent({ selector: 'rui-select[data-token]', type: 'rui-change' })
	onTokenChange(event: Event): void {
		const group = event.target;
		const token = group instanceof HTMLElement ? group.dataset.token : undefined;
		const value = (event as CustomEvent<{ value?: unknown }>).detail?.value;
		if (!isDocsThemeTokenName(token) || typeof value !== 'string') return;

		this.selection = updateDocsThemeSelection(this.selection, token, value);
		applyDocumentTokens(this.selection);
		this.syncSelectValues();
	}

	private syncSelectValues(): void {
		for (const token of docsThemeTokenNames) {
			const select = this.querySelector<HTMLElement & { value?: string }>(`rui-select[data-token="${token}"]`);
			if (select && select.value !== this.selection[token]) {
				select.value = this.selection[token];
			}
		}
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-home-theme-picker': JsxCustomElementAttributes<HomeThemePickerElement>;
	}
}
