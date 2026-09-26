import { RadiantElement, bindTo, customElement, onEvent, onUpdated, prop, query, state } from '@ecopages/radiant';

export type RuiSidebarTriggerPlacement = 'header' | 'inset';

export const SIDEBAR_TRIGGER_DEFAULT_LABEL = 'Toggle sidebar';

const TRIGGER_VARIANTS = ['filled', 'outline', 'ghost'] as const;
const TRIGGER_SIZES = ['sm', 'md', 'lg'] as const;

export type RuiSidebarTriggerProps = {
	/** ID of the `rui-sidebar` this trigger controls. */
	controls?: string;
	/** Accessible name for the trigger button. Default: {@link SIDEBAR_TRIGGER_DEFAULT_LABEL}. */
	triggerLabel?: string;
	/**
	 * Where the trigger is rendered. `header` is shown while the sidebar is expanded;
	 * `inset` while collapsed (desktop icon rail / mobile drawer closed). Reflected
	 * as the `placement` attribute, which placement CSS reads.
	 */
	placement?: RuiSidebarTriggerPlacement;
	/** Variant passed through to the rendered button. */
	variant?: (typeof TRIGGER_VARIANTS)[number];
	/** Size passed through to the rendered button. */
	size?: (typeof TRIGGER_SIZES)[number];
};

export function sidebarTriggerButtonClass({
	variant,
	size,
}: {
	variant: NonNullable<RuiSidebarTriggerProps['variant']>;
	size: NonNullable<RuiSidebarTriggerProps['size']>;
}): string {
	return `rui-button rui-button--${variant} rui-button--${size} rui-sidebar__trigger`;
}

/** @remarks State a trigger reports while no sidebar is attached: during SSR and when `controls` resolves nothing. */
export function initialSidebarStateForPlacement(
	placement: RuiSidebarTriggerPlacement | '' | undefined,
): 'expanded' | 'collapsed' {
	return placement === 'inset' ? 'collapsed' : 'expanded';
}

/**
 * `<rui-sidebar-trigger>` — toggle button for a sibling `rui-sidebar`.
 *
 * The custom element is a behavior host: button chrome is authored in the
 * `RuiSidebarTrigger` view; this host syncs ARIA on the light-DOM button.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="button"]` — toggle control. Host sets `aria-expanded`,
 *   `aria-label`, and `aria-controls` (from `controls` or the resolved sidebar `id`).
 *
 * Do not set `aria-expanded`, `aria-controls`, or `aria-label` on the button — the
 * host owns those. Other button classes are author-owned; the host only swaps the
 * `rui-button--{variant}` and `rui-button--{size}` modifiers when `variant` or
 * `size` change.
 *
 * Nested hosts: none. Resolves `rui-sidebar` by `controls` id or `closest()`.
 *
 * @element rui-sidebar-trigger
 * @attr {string} controls - ID of the `rui-sidebar` this trigger controls.
 * @attr {string} button-label - Accessible name for the trigger button. Default: `Toggle sidebar`.
 * @attr {(''|'header'|'inset')} placement - Where the trigger is rendered; reflected for placement CSS.
 *
 * @remarks
 * The host mirrors its controlled sidebar as `data-sidebar-state`,
 * `data-sidebar-mobile`, and `data-sidebar-collapsible`; placement and glyph CSS
 * read only the host. The last two are absent until the trigger attaches to a
 * sidebar, which placement CSS uses to detect the pre-hydration paint. While
 * detached, `data-sidebar-state` is {@link initialSidebarStateForPlacement}.
 */
@customElement('rui-sidebar-trigger')
export class RuiSidebarTrigger extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) controls: string;
	/** `label` is not a safe reactive attribute name in the DOM; bind via `button-label`. */
	@prop({ type: String, attribute: 'button-label', defaultValue: SIDEBAR_TRIGGER_DEFAULT_LABEL })
	@bindTo({ ref: 'button', attr: 'aria-label', map: (label) => label?.trim() || SIDEBAR_TRIGGER_DEFAULT_LABEL })
	buttonLabel: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) placement: RuiSidebarTriggerPlacement | '';
	@prop({ type: String, defaultValue: 'ghost' }) variant: NonNullable<RuiSidebarTriggerProps['variant']>;
	@prop({ type: String, defaultValue: 'md' }) size: NonNullable<RuiSidebarTriggerProps['size']>;

	@query({ ref: 'button' }) buttonTarget: HTMLButtonElement;

	@state
	@bindTo([
		{ attr: 'data-sidebar-state' },
		{ ref: 'button', attr: 'aria-expanded', map: (state) => String(state === 'expanded') },
	])
	sidebarState: 'expanded' | 'collapsed' = 'expanded';

	/** Controlled sidebar's `data-mobile`; `null` while detached. */
	@state @bindTo({ attr: 'data-sidebar-mobile' }) sidebarMobile: boolean | null = null;

	/** Controlled sidebar's `data-collapsible`; `null` while detached. */
	@state @bindTo({ attr: 'data-sidebar-collapsible' }) sidebarCollapsible: string | null = null;

	/** @remarks Single sync channel: covers toggles, mobile flips, and collapsible changes. */
	private sidebarObserver: MutationObserver | null = null;
	private attachedSidebar: HTMLElement | null = null;

	/**
	 * @remarks A trigger connected before its sidebar attaches to a host whose
	 * `data-*` is not synced yet; the observer picks up that sync.
	 */
	protected override onConnected(): void {
		this.syncWithSidebar();
	}

	override disconnectedCallback(): void {
		this.detachFromSidebar();
		super.disconnectedCallback();
	}

	@onUpdated(['controls', 'placement'])
	onTargetUpdated(): void {
		this.syncWithSidebar();
	}

	@onUpdated(['variant', 'size'])
	onPresentationUpdated(): void {
		const classes = this.buttonTarget?.classList;
		if (!classes) return;
		for (const variant of TRIGGER_VARIANTS) {
			classes.toggle(`rui-button--${variant}`, variant === this.variant);
		}
		for (const size of TRIGGER_SIZES) {
			classes.toggle(`rui-button--${size}`, size === this.size);
		}
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
		if (sidebar !== this.attachedSidebar) {
			this.detachFromSidebar();
			if (sidebar) {
				this.attachedSidebar = sidebar;
				if (typeof MutationObserver === 'function') {
					this.sidebarObserver = new MutationObserver(() => this.applyState());
					this.sidebarObserver.observe(sidebar, {
						attributes: true,
						attributeFilter: ['data-state', 'data-mobile', 'data-collapsible'],
					});
				}
			}
		}
		const controls = sidebar?.id || this.controls;
		if (controls) {
			this.buttonTarget?.setAttribute('aria-controls', controls);
		}
		this.applyState();
	}

	private detachFromSidebar(): void {
		this.sidebarObserver?.disconnect();
		this.attachedSidebar = null;
		this.sidebarObserver = null;
	}

	private applyState(): void {
		const sidebar = this.attachedSidebar;
		if (!sidebar) {
			this.sidebarState = initialSidebarStateForPlacement(this.placement);
			this.sidebarMobile = null;
			this.sidebarCollapsible = null;
			return;
		}
		this.sidebarState = sidebar.getAttribute('data-state') === 'collapsed' ? 'collapsed' : 'expanded';
		this.sidebarMobile = sidebar.getAttribute('data-mobile') === 'true';
		this.sidebarCollapsible = sidebar.getAttribute('data-collapsible') ?? 'off';
	}

	@onEvent({ ref: 'button', type: 'click' })
	onButtonClick(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		const sidebar = this.resolveSidebar();
		if (sidebar && typeof sidebar.toggle === 'function') {
			sidebar.toggle();
		}
	}
}
