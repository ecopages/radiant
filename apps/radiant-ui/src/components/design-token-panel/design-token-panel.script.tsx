import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiListbox, RuiListboxOption, RuiListboxOptionIndicator } from '@ecopages/radiant-ui/listbox';
import {
	RuiSelect,
	RuiSelectControl,
	RuiSelectListbox,
	RuiSelectToggle,
	RuiSelectTrigger,
	RuiSelectValue,
} from '@ecopages/radiant-ui/select';
import { DOCS_DEFAULT_THEME_TUNING } from '@/lib/docs-default-theme-tuning';
import { applySavedTheme } from '@/lib/docs-saved-themes';
import {
	applyDocumentTokens,
	defaultDocsThemeSelection,
	docsThemeColorOptions,
	isDocsThemeColor,
	readDocsThemeSelection,
	type DocsThemeSelection,
} from '@/lib/docs-theme-preview';

/**
 * Docs-only theme preview host: a select that applies a theme to every docs page, and a link to the theme lab. Owns its
 * markup via `render()` so the nested select is not authored as a light-DOM slot (avoids projection wiping selection UI).
 */
@customElement('radiant-design-token-panel')
export class DesignTokenPanelElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	private selection: DocsThemeSelection = defaultDocsThemeSelection;
	private rootObserver: MutationObserver | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.selection = readDocsThemeSelection();
		applyDocumentTokens(this.selection, { persist: false });
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root && typeof MutationObserver !== 'undefined') {
			this.rootObserver = new MutationObserver(() => {
				this.selection = readDocsThemeSelection();
				this.requestUpdate();
			});
			this.rootObserver.observe(root, {
				attributes: true,
				attributeFilter: ['data-rui-theme'],
			});
		}
		this.requestUpdate();
	}

	override disconnectedCallback(): void {
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		super.disconnectedCallback();
	}

	@onEvent({ selector: 'rui-select[data-token]', type: 'rui-change' })
	onThemeChange(event: Event): void {
		const [value] = (event as CustomEvent<{ value?: unknown[] }>).detail?.value ?? [];
		if (!isDocsThemeColor(value)) return;

		applySavedTheme({ colors: value, tuning: DOCS_DEFAULT_THEME_TUNING, fonts: {} });
		this.resetShellScroll();
	}

	/**
	 * @remarks Focus `scrollIntoView` can still move overflow-hidden shell ancestors in
	 * some engines; pin them back so the docs inset does not jump off-screen.
	 */
	private resetShellScroll(): void {
		queueMicrotask(() => {
			for (const selector of ['.rui-sidebar-provider__body', '.rui-sidebar-provider']) {
				const el = this.closest(selector);
				if (el instanceof HTMLElement && el.scrollTop !== 0) {
					el.scrollTop = 0;
				}
			}
		});
	}

	override render() {
		const { colors } = this.selection;
		return (
			<section class="design-token-panel" aria-labelledby="design-token-panel-title">
				<RuiHeading size="sm">
					<RuiHeadingTitle id="design-token-panel-title">Choose a visual theme</RuiHeadingTitle>
					<RuiHeadingDescription>
						Preview each theme with its own colors, typography, spacing, shape, and component details. Build
						your own, with fonts and a copyable setup, in the <a href="/themes">theme lab</a>.
					</RuiHeadingDescription>
				</RuiHeading>
				<div class="design-token-panel__control">
					<RuiLabel>Theme</RuiLabel>
					<RuiSelect label="Theme" value={[colors]} data-token="colors">
						<RuiSelectControl>
							<RuiSelectTrigger>
								<RuiSelectValue />
							</RuiSelectTrigger>
							<RuiSelectToggle />
						</RuiSelectControl>
						<RuiSelectListbox>
							<RuiListbox embedded label="Theme">
								{docsThemeColorOptions.map((option) => (
									<RuiListboxOption value={option.value} label={option.label}>
										<span class="design-token-panel__option-copy">
											<span class="design-token-panel__option-label">{option.label}</span>
											<span class="design-token-panel__option-description">
												{option.description}
											</span>
										</span>
										<RuiListboxOptionIndicator />
									</RuiListboxOption>
								))}
							</RuiListbox>
						</RuiSelectListbox>
					</RuiSelect>
				</div>
			</section>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-design-token-panel': DesignTokenPanelElement;
	}
}
