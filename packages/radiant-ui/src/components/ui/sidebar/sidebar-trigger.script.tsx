import { RadiantElement, bound, customElement, onUpdated, prop, query } from '@ecopages/radiant';
import type { RuiSidebarToggleDetail } from './sidebar.script';

export type RuiSidebarTriggerPlacement = 'header' | 'inset';

export type RuiSidebarTriggerProps = {
	/** ID of the `rui-sidebar` this trigger controls. */
	controls?: string;
	/** Accessible name for the trigger button. Default: `Toggle sidebar`. */
	triggerLabel?: string;
	/**
	 * Where the trigger is rendered. `header` is shown while the sidebar is expanded;
	 * `inset` while collapsed (desktop icon rail / mobile drawer closed). CSS on
	 * `.rui-sidebar-provider` hides the inactive placement.
	 */
	placement?: RuiSidebarTriggerPlacement;
	/** Variant passed through to the rendered button. */
	variant?: 'filled' | 'outline' | 'ghost';
	/** Size passed through to the rendered button. */
	size?: 'sm' | 'md' | 'lg';
};

/**
 * `<rui-sidebar-trigger>` — toggle button for a sibling `rui-sidebar`.
 *
 * The trigger looks up the sidebar by `id` on every click so it works even
 * when the trigger element is re-mounted independently of the sidebar. The
 * trigger also subscribes to `rui-sidebar-toggle` events to mirror the
 * sidebar's `data-state` in its own `aria-expanded` attribute.
 *
 * @element rui-sidebar-trigger
 * @slot - Visible label. Defaults to a hamburger glyph when empty.
 */
@customElement('rui-sidebar-trigger')
export class RuiSidebarTrigger extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) controls: string;
	/** `label` is not a safe reactive attribute name in the DOM; bind via `button-label`. */
	@prop({ type: String, attribute: 'button-label', defaultValue: 'Toggle sidebar' }) buttonLabel: string;
	@prop({ type: String, reflect: true, attribute: 'data-placement', defaultValue: '' }) placement:
		RuiSidebarTriggerPlacement | '';
	@prop({ type: String, defaultValue: 'ghost' }) variant: NonNullable<RuiSidebarTriggerProps['variant']>;
	@prop({ type: String, defaultValue: 'md' }) size: NonNullable<RuiSidebarTriggerProps['size']>;

	@query({ ref: 'button' }) buttonTarget: HTMLButtonElement;

	private sidebarListener: ((event: Event) => void) | null = null;
	private attachedSidebar: HTMLElement | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncWithSidebar();
		// JSX `.prop` bindings flush after connect when the trigger lives in a sidebar slot.
		queueMicrotask(() => this.syncWithSidebar());
	}

	override disconnectedCallback(): void {
		this.detachFromSidebar();
		super.disconnectedCallback();
	}

	@onUpdated(['controls', 'buttonLabel', 'placement'])
	onControlsUpdated(): void {
		this.detachFromSidebar();
		this.syncWithSidebar();
		this.applyState(this.attachedSidebar ? this.readState(this.attachedSidebar) : 'expanded');
	}

	private resolveSidebar(): (HTMLElement & { toggle?: () => void }) | null {
		const id = this.controls?.trim();
		if (id) {
			const byId = document.getElementById(id);
			if (byId) {
				return byId as HTMLElement & { toggle?: () => void };
			}
		}
		const host = this.closest('rui-sidebar');
		if (host?.id) {
			return host as HTMLElement & { toggle?: () => void };
		}
		return null;
	}

	private syncWithSidebar(): void {
		const sidebar = this.resolveSidebar();
		if (sidebar === this.attachedSidebar) {
			if (sidebar) this.applyState(this.readState(sidebar));
			return;
		}
		this.detachFromSidebar();
		if (!sidebar) return;
		this.attachedSidebar = sidebar;
		this.sidebarListener = (event: Event) => {
			const detail = (event as CustomEvent<RuiSidebarToggleDetail>).detail;
			this.applyState(detail.state);
		};
		sidebar.addEventListener('rui-sidebar-toggle', this.sidebarListener);
		this.applyState(this.readState(sidebar));
	}

	private detachFromSidebar(): void {
		if (this.attachedSidebar && this.sidebarListener) {
			this.attachedSidebar.removeEventListener('rui-sidebar-toggle', this.sidebarListener);
		}
		this.attachedSidebar = null;
		this.sidebarListener = null;
	}

	private readState(sidebar: HTMLElement): 'expanded' | 'collapsed' {
		return (sidebar.getAttribute('data-state') as 'expanded' | 'collapsed' | null) ?? 'expanded';
	}

	private resolvedButtonLabel(): string {
		const fromData = this.getAttribute('data-button-label')?.trim();
		if (fromData) return fromData;
		const fromAttribute = this.getAttribute('button-label')?.trim();
		if (fromAttribute) return fromAttribute;
		return this.buttonLabel || 'Toggle sidebar';
	}

	private applyState(state: 'expanded' | 'collapsed'): void {
		const button = this.buttonTarget;
		if (!button) return;
		const sidebar = this.resolveSidebar();
		const buttonLabel = this.resolvedButtonLabel();
		button.setAttribute('aria-expanded', String(state === 'expanded'));
		button.setAttribute('data-sidebar-state', state);
		button.setAttribute('aria-label', buttonLabel);
		if (sidebar?.id) {
			button.setAttribute('aria-controls', sidebar.id);
		} else if (this.controls) {
			button.setAttribute('aria-controls', this.controls);
		}
	}

	@bound
	private onClick(event: Event): void {
		event.preventDefault();
		const sidebar = this.resolveSidebar();
		if (sidebar && typeof sidebar.toggle === 'function') {
			sidebar.toggle();
		}
	}

	private placementClass(): string {
		if (this.placement === 'header') return 'rui-sidebar__trigger--header';
		if (this.placement === 'inset') return 'rui-sidebar__trigger--inset';
		return '';
	}

	private renderDefaultIcon() {
		const sidebar = this.resolveSidebar();
		const state = sidebar ? this.readState(sidebar) : 'expanded';
		const showCollapse = this.placement === 'header' || (this.placement !== 'inset' && state === 'expanded');
		const showExpand = this.placement === 'inset' || (this.placement !== 'header' && state === 'collapsed');

		return (
			<span class="rui-sidebar__trigger-icon" aria-hidden="true">
				{showCollapse ? (
					<svg
						class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--collapse"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
						<path d="M9 3v18" />
						<path d="m14 15 3-3-3-3" />
					</svg>
				) : null}
				{showExpand ? (
					<svg
						class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--expand"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
						<path d="M9 3v18" />
						<path d="m14 9-3 3 3 3" />
					</svg>
				) : null}
			</span>
		);
	}

	override render() {
		const sidebar = this.resolveSidebar();
		const controlsId = sidebar?.id || this.controls || null;
		const buttonLabel = this.resolvedButtonLabel();
		const state = sidebar ? this.readState(sidebar) : 'expanded';
		return (
			<button
				data-ref="button"
				type="button"
				class={`rui-button rui-button--${this.variant} rui-button--${this.size} rui-sidebar__trigger ${this.placementClass()}`.trim()}
				data-sidebar-state={state}
				aria-expanded={String(state === 'expanded')}
				aria-controls={controlsId || null}
				aria-label={buttonLabel}
				on-native:click={this.onClick}
			>
				<slot>{this.renderDefaultIcon()}</slot>
			</button>
		);
	}
}
