import { RadiantComponent, customElement, prop, state } from '@ecopages/radiant';

/**
 * A single tab definition for the docs code-tabs custom element.
 */
export type RadiantCodeTabItem = {
	id: string;
	label: string;
	code: string;
};

/**
 * Public props for the docs code-tabs custom element.
 *
 * `tabs` is a JSON string so the element can be configured from static docs markup.
 */
export type RadiantCodeTabsProps = {
	label?: string;
	tabs?: string;
	copyLabel?: string;
	initialTab?: string;
};

type RadiantCodeTabsBindings = {
	copyStatus: string;
	copiedTabId: string;
};

@customElement('radiant-code-tabs')
export class RadiantCodeTabs extends RadiantComponent<RadiantCodeTabsBindings> {
	@prop({ type: String, defaultValue: '' }) declare label: string;
	@prop({ type: String, defaultValue: '[]' }) declare tabs: string;
	@prop({ type: String, defaultValue: 'Copy code' }) declare copyLabel: string;
	@prop({ type: String, defaultValue: '' }) declare initialTab: string;
	@state selectedTabId = '';
	@state copiedTabId = '';
	@state copyStatus = '';

	private static nextInstanceId = 0;
	private readonly instanceId = `radiant-code-tabs-${++RadiantCodeTabs.nextInstanceId}`;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	override disconnectedCallback(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		super.disconnectedCallback();
	}

	private readonly getTabs = (): RadiantCodeTabItem[] => {
		try {
			const parsed = JSON.parse(this.tabs) as unknown;
			if (!Array.isArray(parsed)) {
				return [];
			}

			return parsed.flatMap((item) => {
				if (!item || typeof item !== 'object') {
					return [];
				}

				const record = item as Record<string, unknown>;
				if (
					typeof record.id !== 'string' ||
					typeof record.label !== 'string' ||
					typeof record.code !== 'string'
				) {
					return [];
				}

				return [
					{
						id: record.id,
						label: record.label,
						code: record.code,
					},
				];
			});
		} catch {
			return [];
		}
	};

	private readonly getActiveTab = (tabs: RadiantCodeTabItem[]): RadiantCodeTabItem | null => {
		if (tabs.length === 0) {
			return null;
		}

		if (this.selectedTabId) {
			const selectedTab = tabs.find((tab) => tab.id === this.selectedTabId);
			if (selectedTab) {
				return selectedTab;
			}
		}

		if (this.initialTab) {
			const initialTab = tabs.find((tab) => tab.id === this.initialTab);
			if (initialTab) {
				return initialTab;
			}
		}

		return tabs[0] ?? null;
	};

	private readonly setSelectedTab = (tabId: string) => {
		if (this.selectedTabId === tabId) {
			return;
		}

		this.selectedTabId = tabId;
	};

	private readonly focusTabAtIndex = (index: number) => {
		queueMicrotask(() => {
			this.querySelector<HTMLButtonElement>(`[data-tab-index="${String(index)}"]`)?.focus();
		});
	};

	private readonly handleTabKeyDown = (
		keyboardEvent: KeyboardEvent & { readonly currentTarget: HTMLButtonElement },
	) => {
		const tabs = this.getTabs();
		const activeTab = this.getActiveTab(tabs);
		if (!activeTab) {
			return;
		}

		const activeIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
		if (activeIndex === -1) {
			return;
		}

		let nextIndex = activeIndex;
		switch (keyboardEvent.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				nextIndex = (activeIndex + 1) % tabs.length;
				break;
			case 'Home':
				nextIndex = 0;
				break;
			case 'End':
				nextIndex = tabs.length - 1;
				break;
			default:
				return;
		}

		keyboardEvent.preventDefault();
		const nextTab = tabs[nextIndex];
		if (!nextTab) {
			return;
		}

		this.setSelectedTab(nextTab.id);
		this.focusTabAtIndex(nextIndex);
	};

	private readonly handleCopy = async () => {
		const activeTab = this.getActiveTab(this.getTabs());
		if (!activeTab) {
			return;
		}

		try {
			await navigator.clipboard.writeText(activeTab.code);
			this.copiedTabId = activeTab.id;
			this.copyStatus = `${activeTab.label} copied to clipboard`;
			if (this.timeoutId) {
				clearTimeout(this.timeoutId);
			}
			this.timeoutId = setTimeout(() => {
				this.copiedTabId = '';
				this.copyStatus = '';
			}, 2000);
		} catch (error) {
			console.error('Failed to copy code', error);
		}
	};

	override render() {
		const tabs = this.getTabs();
		const activeTab = this.getActiveTab(tabs);
		if (!activeTab) {
			return null;
		}

		const activeIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
		const tabListLabel = this.label || 'Code examples';
		const tabId = `${this.instanceId}-tab-${String(activeIndex)}`;
		const panelId = `${this.instanceId}-panel-${String(activeIndex)}`;

		return (
			<div class="code-tabs">
				<div class="code-tabs__list" role="tablist" aria-label={tabListLabel} aria-orientation="horizontal">
					{tabs.map((tab, index) => {
						const isSelected = tab.id === activeTab.id;
						return (
							<button
								key={tab.id}
								type="button"
								class="code-tabs__tab"
								role="tab"
								id={`${this.instanceId}-tab-${String(index)}`}
								aria-selected={isSelected}
								aria-controls={`${this.instanceId}-panel-${String(index)}`}
								tabIndex={isSelected ? 0 : -1}
								data-tab-index={String(index)}
								on:click={() => {
									this.setSelectedTab(tab.id);
								}}
								on:keydown={this.handleTabKeyDown}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
				<div class="code-tabs__panel" role="tabpanel" id={panelId} aria-labelledby={tabId}>
					<div class="code-tabs__body">
						<span class="code-tabs__code">{activeTab.code}</span>
						<button
							type="button"
							class="code-tabs__copy"
							data={{ copied: this.copiedTabId === activeTab.id }}
							aria-label={`${this.copyLabel}: ${activeTab.label}`}
							on:click={this.handleCopy}
						>
							<span class="code-tabs__icon" aria-hidden="true"></span>
						</button>
					</div>
					<span class="code-tabs__status" aria-live="polite">
						{this.$.copyStatus}
					</span>
				</div>
			</div>
		);
	}
}
