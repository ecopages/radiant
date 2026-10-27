import type { JSX_PROPS } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RadiantElement, customElement, onEvent, prop, state } from '@ecopages/radiant';
import { DOCS_DEFAULT_THEME_IMPORT, docsThemeImportSpecifier, isDocsThemeColor } from '@/lib/docs-theme-preview';
import { renderTabLabel } from './code-tab-icons';

/**
 * Plain-text tabs escape `code`. Rich tabs pass highlighted HTML in `html` and
 * clipboard text in `content` — strings survive host-attribute JSON round-trips;
 * JSX/`unsafeHtml` brands do not.
 *
 * @remarks A rich tab with `themeImport` is written for Radiant Default; the element swaps that import for the one the
 * selected docs theme needs, in both the displayed code and the copied text.
 */
export type RadiantCodeTabItem =
	| {
			id: string;
			label: string;
			code: string;
	  }
	| {
			id: string;
			label: string;
			html: string;
			content: string;
			themeImport?: boolean;
	  };

export type RadiantCodeTabsProps = {
	label?: string;
	tabs?: RadiantCodeTabItem[];
	copyLabel?: string;
	defaultSelectedKey?: string;
	selectedKey?: string;
};

function isRichTab(tab: RadiantCodeTabItem): tab is Extract<RadiantCodeTabItem, { html: string; content: string }> {
	return 'html' in tab;
}

function withThemeImport(tab: RadiantCodeTabItem, text: string, specifier: string): string {
	return isRichTab(tab) && tab.themeImport ? text.replaceAll(DOCS_DEFAULT_THEME_IMPORT, specifier) : text;
}

@customElement('radiant-code-tabs')
export class RadiantCodeTabs extends RadiantElement {
	declare readonly [JSX_PROPS]?: RadiantCodeTabsProps;
	@prop({ type: Array }) tabs: RadiantCodeTabItem[] = [];
	@prop({ type: String }) label = '';
	@prop({ type: String }) copyLabel = 'Copy code';
	@prop({ type: String }) defaultSelectedKey = '';
	@prop({ type: String, reflect: true }) selectedKey = '';
	@state copyStatus = '';
	@state themeImport = DOCS_DEFAULT_THEME_IMPORT;
	private rootObserver: MutationObserver | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncThemeImport();
		const root = typeof document === 'undefined' ? null : document.documentElement;
		if (root && typeof MutationObserver !== 'undefined') {
			this.rootObserver = new MutationObserver(() => this.syncThemeImport());
			this.rootObserver.observe(root, { attributes: true, attributeFilter: ['data-rui-theme'] });
		}
	}

	override disconnectedCallback(): void {
		this.rootObserver?.disconnect();
		this.rootObserver = null;
		super.disconnectedCallback();
	}

	private syncThemeImport(): void {
		const theme = typeof document === 'undefined' ? undefined : document.documentElement.dataset.ruiTheme;
		this.themeImport = isDocsThemeColor(theme) ? docsThemeImportSpecifier(theme) : DOCS_DEFAULT_THEME_IMPORT;
	}

	private resolveTabs(): RadiantCodeTabItem[] {
		if (Array.isArray(this.tabs) && this.tabs.length > 0) {
			return this.tabs;
		}

		const tabsAttribute = this.getAttribute('tabs');
		if (!tabsAttribute) {
			return [];
		}

		try {
			const parsed = JSON.parse(tabsAttribute) as unknown;
			return Array.isArray(parsed) ? (parsed as RadiantCodeTabItem[]) : [];
		} catch {
			return [];
		}
	}

	private handleCopy = async (tab: RadiantCodeTabItem): Promise<void> => {
		try {
			await navigator.clipboard.writeText(
				withThemeImport(tab, isRichTab(tab) ? tab.content : tab.code, this.themeImport),
			);
			this.copyStatus = `${tab.label} copied to clipboard`;
		} catch (error) {
			console.error('Failed to copy code', error);
		}
	};

	@onEvent({ selector: 'rui-tabs', type: 'rui-change' })
	onTabChange(event: Event): void {
		const detail = (event as CustomEvent<{ value?: string }>).detail;
		if (detail?.value) {
			this.selectedKey = detail.value;
		}
	}

	override render() {
		const tabs = this.resolveTabs();
		if (tabs.length === 0) {
			return null;
		}

		const requestedSelectedKey = this.selectedKey || this.defaultSelectedKey;
		const selectedKey = tabs.some((tab) => tab.id === requestedSelectedKey) ? requestedSelectedKey : tabs[0]?.id;
		const tabListLabel = this.label || 'Code examples';

		return (
			<RuiTabs variant="boxed" value={selectedKey} label={tabListLabel}>
				<RuiTabList aria-label={tabListLabel} class="code-tabs__list">
					{tabs.map((tab) => (
						<RuiTab id={tab.id} class="code-tabs__tab" selected={tab.id === selectedKey}>
							{renderTabLabel({
								id: tab.id,
								label: tab.label,
								code: isRichTab(tab) ? tab.content : tab.code,
							})}
						</RuiTab>
					))}
				</RuiTabList>
				<RuiTabPanels>
					{tabs.map((tab) => (
						<RuiTabPanel id={tab.id} class="code-tabs__panel" selected={tab.id === selectedKey}>
							<div class="code-tabs__body">
								<span class="code-tabs__code">
									{isRichTab(tab)
										? unsafeHtml(withThemeImport(tab, tab.html, this.themeImport))
										: tab.code}
								</span>
								<RuiButton
									size="sm"
									variant="ghost"
									class="code-tabs__copy"
									aria-label={`${this.copyLabel}: ${tab.label}`}
									on:click={() => void this.handleCopy(tab)}
								>
									<span aria-hidden="true">Copy</span>
								</RuiButton>
							</div>
						</RuiTabPanel>
					))}
				</RuiTabPanels>
				<span class="code-tabs__status" aria-live="polite">
					{this.copyStatus}
				</span>
			</RuiTabs>
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-code-tabs': RadiantCodeTabs;
	}
}
