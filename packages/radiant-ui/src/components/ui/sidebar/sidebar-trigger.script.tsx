import {
	RadiantElement,
	bindTo,
	customElement,
	onEvent,
	onUpdated,
	prop,
	query,
	registerSsrPreparationCallback,
	state,
} from '@ecopages/radiant';
import type { RuiSidebarToggleDetail } from './sidebar.script';

export type RuiSidebarTriggerPlacement = 'header' | 'inset';

export const SIDEBAR_TRIGGER_DEFAULT_LABEL = 'Toggle sidebar';

export type RuiSidebarTriggerProps = {
	/** ID of the `rui-sidebar` this trigger controls. */
	controls?: string;
	/** Accessible name for the trigger button. Default: {@link SIDEBAR_TRIGGER_DEFAULT_LABEL}. */
	triggerLabel?: string;
	/**
	 * Where the trigger is rendered. `header` is shown while the sidebar is expanded;
	 * `inset` while collapsed (desktop icon rail / mobile drawer closed). The host
	 * reflects its controlled sidebar state for local placement styling.
	 */
	placement?: RuiSidebarTriggerPlacement;
	/** Variant passed through to the rendered button. */
	variant?: 'filled' | 'outline' | 'ghost';
	/** Size passed through to the rendered button. */
	size?: 'sm' | 'md' | 'lg';
};

export function sidebarTriggerButtonClass({
	variant,
	size,
	placement,
}: {
	variant: NonNullable<RuiSidebarTriggerProps['variant']>;
	size: NonNullable<RuiSidebarTriggerProps['size']>;
	placement?: RuiSidebarTriggerPlacement | '';
}): string {
	const placementClass =
		placement === 'header'
			? 'rui-sidebar__trigger--header'
			: placement === 'inset'
				? 'rui-sidebar__trigger--inset'
				: '';
	return `rui-button rui-button--${variant} rui-button--${size} rui-sidebar__trigger ${placementClass}`.trim();
}

/** @remarks Used for SSR preparation before a sibling `rui-sidebar` is resolved. */
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
 *   `data-sidebar-state`, `aria-label`, and `aria-controls` (from `controls`
 *   or the resolved sidebar `id`).
 *
 * Do not set `aria-expanded`, `aria-controls`, `aria-label`, or `data-sidebar-state`
 * on the button — the host owns those. Presentation classes on the button may be
 * stamped by the view; the host re-applies them when `variant`, `size`, or
 * `placement` change.
 *
 * Nested hosts: none. Resolves `rui-sidebar` by `controls` id or `closest()`.
 *
 * @element rui-sidebar-trigger
 * @attr {string} controls - ID of the `rui-sidebar` this trigger controls.
 * @attr {string} button-label - Accessible name for the trigger button. Default: `Toggle sidebar`.
 * @attr {(''|'header'|'inset')} placement - Where the trigger is rendered; affects CSS placement classes.
 *
 * @remarks
 * The host reflects `data-sidebar-placement`, `data-sidebar-state`,
 * `data-sidebar-mobile`, and `data-sidebar-collapsible` for placement styling.
 */
@customElement('rui-sidebar-trigger')
export class RuiSidebarTrigger extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) controls: string;
	/** `label` is not a safe reactive attribute name in the DOM; bind via `button-label`. */
	@prop({ type: String, attribute: 'button-label', defaultValue: SIDEBAR_TRIGGER_DEFAULT_LABEL }) buttonLabel: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) placement: RuiSidebarTriggerPlacement | '';
	@prop({ type: String, defaultValue: 'ghost' }) variant: NonNullable<RuiSidebarTriggerProps['variant']>;
	@prop({ type: String, defaultValue: 'md' }) size: NonNullable<RuiSidebarTriggerProps['size']>;

	@query({ ref: 'button' }) buttonTarget: HTMLButtonElement;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.syncPresentationForSsr());
	}

	@state
	@bindTo([
		{ ref: 'button', attr: 'aria-expanded', map: (state) => String(state === 'expanded') },
		{ ref: 'button', attr: 'data-sidebar-state' },
	])
	sidebarState: 'expanded' | 'collapsed' = 'expanded';

	private sidebarListener: ((event: Event) => void) | null = null;
	private sidebarMobileListener: ((event: Event) => void) | null = null;
	private sidebarObserver: MutationObserver | null = null;
	private attachedSidebar: HTMLElement | null = null;
	private initialSyncFrame: number | null = null;

	/**
	 * @remarks JSX `.prop` bindings flush after connect when the trigger is nested in sidebar chrome.
	 *
	 * The triple sync is deliberate, not redundant:
	 * - the synchronous call covers triggers rendered outside any sidebar;
	 * - the nested microtasks hop past the *sidebar's* own `onConnected` sync
	 *   (connection order does not guarantee the sidebar ran first), so state
	 *   read here is post-sync;
	 * - the animation frame is a final pass after layout settles (mobile media
	 *   query flips land there).
	 */
	override connectedCallback(): void {
		super.connectedCallback();
		this.syncWithSidebar();
		queueMicrotask(() => queueMicrotask(() => this.syncWithSidebar()));
		this.initialSyncFrame = requestAnimationFrame(() => {
			this.initialSyncFrame = null;
			this.syncWithSidebar();
		});
	}

	override disconnectedCallback(): void {
		if (this.initialSyncFrame != null) {
			cancelAnimationFrame(this.initialSyncFrame);
			this.initialSyncFrame = null;
		}
		this.detachFromSidebar();
		super.disconnectedCallback();
	}

	@onUpdated(['controls', 'buttonLabel', 'placement'])
	onBindingUpdated(): void {
		this.detachFromSidebar();
		this.syncWithSidebar();
		this.applyState(this.attachedSidebar ? this.readState(this.attachedSidebar) : 'expanded');
	}

	@onUpdated(['variant', 'size'])
	onPresentationUpdated(): void {
		this.syncButtonPresentation();
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
		this.sidebarMobileListener = () => this.applyState(this.readState(sidebar));
		this.sidebarObserver = new MutationObserver(() => this.applyState(this.readState(sidebar)));
		this.sidebarObserver.observe(sidebar, {
			attributes: true,
			attributeFilter: ['data-state', 'data-mobile', 'data-collapsible'],
		});
		sidebar.addEventListener('rui-sidebar-toggle', this.sidebarListener);
		sidebar.addEventListener('rui-sidebar-mobile-change', this.sidebarMobileListener);
		this.applyState(this.readState(sidebar));
	}

	private detachFromSidebar(): void {
		if (this.attachedSidebar && this.sidebarListener) {
			this.attachedSidebar.removeEventListener('rui-sidebar-toggle', this.sidebarListener);
		}
		if (this.attachedSidebar && this.sidebarMobileListener) {
			this.attachedSidebar.removeEventListener('rui-sidebar-mobile-change', this.sidebarMobileListener);
		}
		this.sidebarObserver?.disconnect();
		this.attachedSidebar = null;
		this.sidebarListener = null;
		this.sidebarMobileListener = null;
		this.sidebarObserver = null;
	}

	private readState(sidebar: HTMLElement): 'expanded' | 'collapsed' {
		return (sidebar.getAttribute('data-state') as 'expanded' | 'collapsed' | null) ?? 'expanded';
	}

	private resolvedPlacement(): RuiSidebarTriggerPlacement | '' {
		if (this.classList.contains('rui-sidebar-trigger-placement--header')) return 'header';
		if (this.classList.contains('rui-sidebar-trigger-placement--inset')) return 'inset';
		const placement = this.getAttribute('data-placement');
		if (placement === 'header' || placement === 'inset') return placement;
		return this.placement;
	}

	private resolvedButtonLabel(): string {
		const fromData = this.getAttribute('data-button-label')?.trim();
		if (fromData) return fromData;
		const fromProp = this.buttonLabel?.trim();
		if (fromProp) return fromProp;
		return SIDEBAR_TRIGGER_DEFAULT_LABEL;
	}

	/**
	 * @remarks Authored children are applied before SSR preparation. Paint host-owned
	 * button presentation so the first HTML includes glyphs and ARIA.
	 */
	private syncPresentationForSsr(): void {
		this.applyState(initialSidebarStateForPlacement(this.resolvedPlacement()));
	}

	private applyState(state: 'expanded' | 'collapsed'): void {
		this.sidebarState = state;
		this.setAttribute('data-sidebar-state', state);
		this.setAttribute('data-sidebar-placement', this.resolvedPlacement());
		if (this.attachedSidebar) {
			this.setAttribute('data-sidebar-mobile', this.attachedSidebar.getAttribute('data-mobile') ?? 'false');
			this.setAttribute(
				'data-sidebar-collapsible',
				this.attachedSidebar.getAttribute('data-collapsible') ?? 'off',
			);
		} else {
			this.removeAttribute('data-sidebar-mobile');
			this.removeAttribute('data-sidebar-collapsible');
		}
		const button = this.buttonTarget;
		if (!button) return;
		const sidebar = this.resolveSidebar();
		button.setAttribute('aria-label', this.resolvedButtonLabel());
		if (sidebar?.id) {
			button.setAttribute('aria-controls', sidebar.id);
		} else if (this.controls) {
			button.setAttribute('aria-controls', this.controls);
		}
		this.syncButtonPresentation();
	}

	private syncButtonPresentation(): void {
		const button = this.buttonTarget;
		if (!button) return;
		button.className = sidebarTriggerButtonClass({
			variant: this.variant,
			size: this.size,
			placement: this.resolvedPlacement(),
		});
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
