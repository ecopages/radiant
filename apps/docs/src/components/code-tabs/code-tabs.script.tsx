import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { JsxNodeLike, JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RadiantElement, customElement, onEvent, onUpdated, prop, state } from '@ecopages/radiant';
import { renderTabLabel } from './code-tab-icons';

export type RadiantCodeTabItem =
	| {
			id: string;
			label: string;
			code: string;
	  }
	| {
			id: string;
			label: string;
			code: JsxNodeLike | JsxRenderable;
			content: string;
	  };

export type RadiantCodeTabsProps = {
	label?: string;
	tabs?: RadiantCodeTabItem[];
	copyLabel?: string;
	defaultSelectedKey?: string;
	selectedKey?: string;
};

/**
 * Docs-specific code presentation that delegates tab selection and keyboard
 * interaction to `RuiTabs` while retaining code-copying behavior.
 */
@customElement('radiant-code-tabs')
export class RadiantCodeTabs extends RadiantElement {
	@prop({ type: String }) label = '';
	@prop({ type: Array }) tabs: RadiantCodeTabItem[] = [];
	@prop({ type: String }) copyLabel = 'Copy code';
	@prop({ type: String }) defaultSelectedKey = '';
	@prop({ type: String, reflect: true }) selectedKey = '';
	@state copiedTabId = '';
	@state copyStatus = '';

	private readonly resolveTabs = (): RadiantCodeTabItem[] => {
		if (Array.isArray(this.tabs) && this.tabs.length > 0) {
			return this.tabs;
		}

		const tabsAttribute = this.getAttribute('tabs');
		if (!tabsAttribute) {
			return Array.isArray(this.tabs) ? this.tabs : [];
		}

		try {
			const parsed = JSON.parse(tabsAttribute) as unknown;
			return Array.isArray(parsed) ? (parsed as RadiantCodeTabItem[]) : [];
		} catch {
			return Array.isArray(this.tabs) ? this.tabs : [];
		}
	};

	private readonly handleCopy = async (tab: RadiantCodeTabItem): Promise<void> => {
		try {
			const content = 'content' in tab ? tab.content : tab.code;
			await navigator.clipboard.writeText(content);
			this.copiedTabId = tab.id;
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

	@onUpdated(['selectedKey', 'tabs'])
	onSelectedKeyChange(): void {
		requestAnimationFrame(() => {
			const ruiTabs = this.querySelector('rui-tabs') as { resync?: () => void } | null;
			ruiTabs?.resync?.();
		});
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
						<RuiTab id={tab.id} class="code-tabs__tab">
							{renderTabLabel({
								id: tab.id,
								label: tab.label,
								code: 'content' in tab ? tab.content : tab.code,
							})}
						</RuiTab>
					))}
				</RuiTabList>
				<RuiTabPanels>
					{tabs.map((tab) => (
						<RuiTabPanel id={tab.id} class="code-tabs__panel">
							<div class="code-tabs__body">
								<span class="code-tabs__code">{tab.code}</span>
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

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-code-tabs': JsxCustomElementAttributes<RadiantCodeTabs, RadiantCodeTabsProps>;
	}
}
