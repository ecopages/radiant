import type { JSX_PROPS } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RadiantElement, customElement, onEvent, prop, state } from '@ecopages/radiant';
import { COPY_STATE_ATTRIBUTE, createCopyController } from '@ecopages/radiant-ui/controllers';
import { DOCS_DEFAULT_THEME_IMPORT, docsThemeImportSpecifier, isDocsThemeColor } from '@/lib/docs-theme-preview';
import { COPY_ICON_ATTRIBUTES, COPY_ICON_SHAPES } from '@/lib/copy-icons';
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
			lines?: number;
	  }
	| {
			id: string;
			label: string;
			html: string;
			content: string;
			themeImport?: boolean;
			lines?: number;
	  };

export type RadiantCodeTabsProps = {
	label?: string;
	tabs?: RadiantCodeTabItem[];
	copyLabel?: string;
	defaultSelectedKey?: string;
	selectedKey?: string;
};

const COPY_STATUS_TIMEOUT_MS = 2000;

function CopyIcons() {
	return (
		<>
			{(Object.keys(COPY_ICON_SHAPES) as (keyof typeof COPY_ICON_SHAPES)[]).map((kind) => (
				<svg {...COPY_ICON_ATTRIBUTES} data-copy-icon={kind}>
					{COPY_ICON_SHAPES[kind].map((shape) =>
						shape.tag === 'rect' ? <rect {...shape.attributes} /> : <path {...shape.attributes} />,
					)}
				</svg>
			))}
		</>
	);
}

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

	private copiedTab: RadiantCodeTabItem | undefined;
	private copyStatusTimer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Copies the text of the tab whose button was clicked, with the docs theme import applied.
	 *
	 * @remarks
	 * `getFeedbackTarget` runs just before the controller writes the state and removes the previous one with a forced
	 * reflow, so the one-shot animation in `copy-button.css` runs again on a repeated result. `announce` writes the
	 * result for the tab that was copied into the live region and clears it after the same period as the state.
	 */
	private readonly copy = createCopyController(this, {
		getRoot: () => this,
		selector: '[data-copy-button]',
		resetDelay: COPY_STATUS_TIMEOUT_MS,
		getText: (trigger) => {
			const tab = this.resolveTabs().find((item) => item.id === trigger!.dataset.copyTab)!;
			this.copiedTab = tab;
			return withThemeImport(tab, isRichTab(tab) ? tab.content : tab.code, this.themeImport);
		},
		getFeedbackTarget: (trigger) => {
			trigger!.removeAttribute(COPY_STATE_ATTRIBUTE);
			void trigger!.offsetWidth;
			return trigger;
		},
		announce: (message) => {
			const { label } = this.copiedTab!;
			clearTimeout(this.copyStatusTimer);
			this.copyStatus = message === 'Copied' ? `${label} copied to clipboard` : `Failed to copy ${label}`;
			this.copyStatusTimer = setTimeout(() => {
				this.copyStatus = '';
			}, COPY_STATUS_TIMEOUT_MS);
		},
	});

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
		clearTimeout(this.copyStatusTimer);
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
								lines: tab.lines,
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
									data-copy-button=""
									data-copy-tab={tab.id}
								>
									<CopyIcons />
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
