import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { RuiFeed, RuiFeedArticle, RuiFeedArticleContent } from '@ecopages/radiant-ui/feed';
import { RuiHeading, RuiHeadingDescription, RuiHeadingEyebrow, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from '@ecopages/radiant-ui/radio-group';
import {
	applyDocumentTokens,
	defaultDocsThemeSelection,
	docsThemeColorOptions,
	isDocsThemeTokenName,
	readDocsThemeSelection,
	updateDocsThemeSelection,
	type DocsThemeSelection,
} from '@/lib/docs-theme-preview';

function TokenOptions({
	name,
	options,
}: {
	name: string;
	options: readonly { value: string; label: string; description: string }[];
}) {
	return (
		<RuiRadioGroupControl class="design-token-panel__options">
			{options.map((option) => (
				<RuiRadio value={option.value} name={name}>
					<span class="design-token-panel__option-copy">
						<span class="design-token-panel__option-label">{option.label}</span>
						<span class="design-token-panel__option-description">{option.description}</span>
					</span>
				</RuiRadio>
			))}
		</RuiRadioGroupControl>
	);
}

/**
 * Docs-only token preview host. Owns its markup via `render()` so nested radio
 * groups are not authored as light-DOM slots (avoids projection wiping selection UI).
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

	@onEvent({ selector: 'rui-radio-group[data-token]', type: 'rui-change' })
	onTokenChange(event: Event): void {
		const group = event.target;
		const token = group instanceof HTMLElement ? group.dataset.token : undefined;
		const value = (event as CustomEvent<{ value?: unknown }>).detail?.value;
		if (!isDocsThemeTokenName(token) || typeof value !== 'string') return;

		this.selection = updateDocsThemeSelection(this.selection, token, value);
		applyDocumentTokens(this.selection);
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
				<div class="design-token-panel__intro">
					<RuiHeading size="sm">
						<RuiHeadingEyebrow>Live token preview</RuiHeadingEyebrow>
						<RuiHeadingTitle id="design-token-panel-title">Choose a visual theme</RuiHeadingTitle>
						<RuiHeadingDescription>
							Preview each theme with its own colors, typography, spacing, shape, and component details.
						</RuiHeadingDescription>
					</RuiHeading>
				</div>
				<RuiFeed class="design-token-panel__groups" label="Theme selection">
					<RuiFeedArticle class="design-token-panel__group" posinset={1} setsize={1} tabindex={-1}>
						<RuiFeedArticleContent>
							<RuiLabel>Theme</RuiLabel>
							<RuiRadioGroup value={colors} name="docs-color-theme" label="Theme" data-token="colors">
								<TokenOptions name="docs-color-theme" options={docsThemeColorOptions} />
							</RuiRadioGroup>
						</RuiFeedArticleContent>
					</RuiFeedArticle>
				</RuiFeed>
			</section>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-design-token-panel': DesignTokenPanelElement;
	}
}
