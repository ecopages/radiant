import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import { isServer } from '@ecopages/radiant/is-server';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import {
	PopoverController,
	shouldDismissPopoverFocus,
	shouldDismissPopoverPointer,
} from '../shared/popover-controller';
import type { RuiPlacement } from '../shared/placement';

export type RuiPopoverOpenChangeDetail = {
	open: boolean;
};

export type RuiPopoverProps = {
	/** Whether the popover is open (controlled). */
	open?: boolean;
	/** Placement relative to the anchor. Default: `bottom`. */
	placement?: RuiPlacement;
	/** Teleport the surface to `document.body`. Default: `true`. */
	portal?: boolean;
	/** Match the anchor width (dropdown menus). Default: `false`. */
	matchAnchorWidth?: boolean;
	/** Gap between anchor and surface in px. Default: `8`. */
	offset?: number;
	/**
	 * CSS selector for an external anchor when not using `[data-popover-trigger]` or
	 * `rui-popover-trigger`.
	 */
	anchor?: string;
	/** Surface variant. `listbox` strips padding for embedded listboxes. */
	variant?: 'default' | 'listbox';
};

/**
 * `<rui-popover>` — floating overlay positioned relative to an anchor.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiPopover` view helpers which stamp the same targets.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="host"]` — anchor + surface wrapper. Focus-out on this node can dismiss when open.
 * - `[data-ref="surface"]` — floating panel. Host assigns `id` and coordinates portal positioning.
 *   The view seeds `role="dialog"`.
 *
 * Anchor (one of):
 * - `[data-popover-trigger]` — inside this host, inside a parent `rui-popover-trigger`, or resolved
 *   via the `anchor` attribute (CSS selector). Host sets `aria-controls` and `aria-expanded` on the
 *   resolved focusable anchor (first `button`, link, input, or `[role="button"]` inside the trigger).
 *
 * Optional:
 * - Parent `rui-popover-trigger` — when nested, the trigger is read from that host's `[data-popover-trigger]`.
 *
 * Nested hosts: `rui-popover-trigger` (coordinates open state; see that element's contract).
 *
 * @element rui-popover
 * @attr {boolean} open - Whether the popover is open (controlled). Default: `false`.
 * @attr {string} placement - Placement relative to the anchor. Default: `bottom`.
 * @attr {boolean} portal - Teleport the surface to `document.body`. Default: `true`.
 * @attr {boolean} match-anchor-width - Match the anchor width (dropdown menus). Default: `false`.
 * @attr {number} offset - Gap between anchor and surface in px. Default: `8`.
 * @attr {string} anchor - CSS selector for an external anchor when not using `[data-popover-trigger]`.
 * @attr {('default'|'listbox')} variant - Surface variant; `listbox` strips padding. Default: `default`.
 * @fires rui-open-change - Emitted when open state changes; `detail.open`.
 *
 * @remarks
 * `setOpen(next, emit?)` toggles open state. With `anchor` and no `[data-popover-trigger]`, the host
 * toggles open on anchor click. Minimum inline-trigger tree: `[data-ref="host"]` >
 * `[data-popover-trigger]` + `[data-ref="surface"]`. BEM classes live on the view; the host never queries them.
 */
@customElement('rui-popover')
export class RuiPopover extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: String, defaultValue: 'bottom' }) placement: RuiPlacement;
	@prop({ type: Boolean, defaultValue: true }) portal: boolean;
	@prop({ type: Boolean, defaultValue: false }) matchAnchorWidth: boolean;
	@prop({ type: Number, defaultValue: 8 }) offset: number;
	@prop({ type: String, defaultValue: '' }) anchor: string;
	@prop({ type: String, defaultValue: 'default' }) variant: 'default' | 'listbox';

	@query({ ref: 'surface' }) surfaceTarget: HTMLElement;
	@query({ ref: 'host' }) hostTarget: HTMLElement;

	@event({ name: 'rui-open-change', bubbles: true, composed: true })
	openChangeEvent: EventEmitter<RuiPopoverOpenChangeDetail>;

	private readonly surfaceId = `rui-popover-${Math.random().toString(36).slice(2, 9)}`;
	private controller: PopoverController | null = null;
	private anchorClickTarget: HTMLElement | null = null;

	protected override onConnected(): void {
		this.syncPopover();
	}

	override disconnectedCallback(): void {
		this.unbindExternalAnchorClick();
		this.controller?.destroy();
		this.controller = null;
		super.disconnectedCallback();
	}

	private getAnchorElement(): HTMLElement | null {
		const triggerHost = this.closest('rui-popover-trigger');
		const triggerFromHost = triggerHost?.querySelector<HTMLElement>('[data-popover-trigger]');
		if (triggerFromHost instanceof HTMLElement) {
			return resolvePopoverAnchor(triggerFromHost);
		}

		const slottedTrigger = this.querySelector<HTMLElement>('[data-popover-trigger]');
		if (slottedTrigger instanceof HTMLElement) {
			return resolvePopoverAnchor(slottedTrigger);
		}

		const selector = this.anchor.trim();
		if (selector) {
			const external = document.querySelector(selector);
			if (external instanceof HTMLElement) {
				return resolvePopoverAnchor(external);
			}
		}

		return null;
	}

	private ensureController(): PopoverController {
		if (!this.controller) {
			this.controller = new PopoverController({
				getAnchor: () => this.getAnchorElement(),
				getFloating: () => this.surfaceTarget,
				getOpen: () => this.open,
				getPlacement: () => this.placement,
				gap: this.offset,
				portal: this.portal,
				matchAnchorWidth: this.matchAnchorWidth,
			});
		}
		return this.controller;
	}

	@bound
	@onUpdated(['open', 'placement', 'portal', 'matchAnchorWidth', 'offset', 'anchor'])
	syncPopover(): void {
		const anchor = this.getAnchorElement();
		const surface = this.surfaceTarget;

		if (surface) {
			surface.id = this.surfaceId;
		}
		if (anchor) {
			anchor.setAttribute('aria-controls', this.surfaceId);
			anchor.setAttribute('aria-expanded', String(this.open));
		}
		this.syncExternalAnchorClick(anchor);

		const controller = this.ensureController();
		controller.updateConfig({
			getAnchor: () => this.getAnchorElement(),
			getFloating: () => this.surfaceTarget,
			getOpen: () => this.open,
			getPlacement: () => this.placement,
			gap: this.offset,
			portal: this.portal,
			matchAnchorWidth: this.matchAnchorWidth,
		});
		controller.sync();
	}

	setOpen(next: boolean, emit = true): void {
		if (this.open === next) {
			this.syncPopover();
			return;
		}
		this.open = next;
		if (emit) {
			this.openChangeEvent.emit({ open: next });
		}
		this.syncPopover();
	}

	@onEvent({ document: true, type: 'pointerdown' })
	onDocumentPointerDown(event: PointerEvent): void {
		if (!this.open) {
			return;
		}
		const target = event.target as Node | null;
		if (
			!shouldDismissPopoverPointer(
				this.getAnchorElement(),
				this.controller?.getFloatingElement() ?? this.surfaceTarget,
				target,
			)
		) {
			return;
		}
		this.setOpen(false);
	}

	@onEvent({ ref: 'host', type: 'focusout' })
	onFocusOut(event: FocusEvent): void {
		if (!this.open) {
			return;
		}
		if (
			!shouldDismissPopoverFocus(
				this.getAnchorElement(),
				this.controller?.getFloatingElement() ?? this.surfaceTarget,
				event.relatedTarget,
			)
		) {
			return;
		}
		this.setOpen(false);
	}

	private usesExternalAnchor(): boolean {
		if (!this.anchor.trim()) {
			return false;
		}
		if (this.closest('rui-popover-trigger')) {
			return false;
		}
		return !this.querySelector('[data-popover-trigger]');
	}

	private syncExternalAnchorClick(anchor: HTMLElement | null): void {
		if (!this.usesExternalAnchor() || !anchor) {
			this.unbindExternalAnchorClick();
			return;
		}

		if (this.anchorClickTarget === anchor) {
			return;
		}

		this.unbindExternalAnchorClick();
		anchor.addEventListener('click', this.onExternalAnchorClick);
		this.anchorClickTarget = anchor;
	}

	private unbindExternalAnchorClick(): void {
		if (!this.anchorClickTarget) {
			return;
		}
		this.anchorClickTarget.removeEventListener('click', this.onExternalAnchorClick);
		this.anchorClickTarget = null;
	}

	@bound
	private onExternalAnchorClick(): void {
		this.setOpen(!this.open);
	}

	@onEvent({ document: true, type: 'keydown' })
	onDocumentKeydown(event: KeyboardEvent): void {
		if (!this.open || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		this.setOpen(false);
		const anchor = this.getAnchorElement();
		anchor?.focus();
	}
}

export type RuiPopoverTriggerProps = {
	/** Whether the popover starts open. Default: `false`. */
	open?: boolean;
};

/**
 * `<rui-popover-trigger>` — coordinates open state between a trigger and child `rui-popover`.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiPopoverTrigger` view helper which stamps the same targets.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — click delegate root. Toggles when the event target is inside `[data-popover-trigger]`.
 * - `[data-popover-trigger]` — pressable anchor (often wrapping a button).
 * - `rui-popover` — child custom element. Open state syncs both ways via `rui-open-change`.
 *
 * Nested hosts: `rui-popover` (see that element's contract for surface targets).
 *
 * @element rui-popover-trigger
 * @attr {boolean} open - Whether the popover starts open. Default: `false`.
 *
 * @remarks
 * Minimum tree: `[data-ref="root"]` > `[data-popover-trigger]` + `rui-popover`. BEM classes live on the view.
 */
@customElement('rui-popover-trigger')
export class RuiPopoverTrigger extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;

	@query({ ref: 'root' }) rootTarget: HTMLElement;

	private getPopover(): RuiPopover | null {
		return this.querySelector('rui-popover');
	}

	protected override onConnected(): void {
		this.syncToPopover();
	}

	@bound
	@onUpdated(['open'])
	syncToPopover(): void {
		if (isServer) {
			return;
		}

		const popover = this.getPopover();
		if (!popover || typeof popover.setOpen !== 'function') {
			return;
		}
		if (popover.open !== this.open) {
			popover.setOpen(this.open, false);
		}
	}

	@onEvent({ ref: 'root', type: 'click' })
	onHostClick(event: Event): void {
		const target = event.target as HTMLElement | null;
		if (!target?.closest('[data-popover-trigger]')) {
			return;
		}
		this.open = !this.open;
		const popover = this.getPopover();
		if (popover && typeof popover.setOpen === 'function') {
			popover.setOpen(this.open);
		}
	}

	@onEvent({ selector: 'rui-popover', type: 'rui-open-change' })
	onPopoverOpenChange(event: CustomEvent<RuiPopoverOpenChangeDetail>): void {
		const popover = this.getPopover();
		if (event.target !== popover) {
			return;
		}
		this.open = event.detail.open;
	}
}

function resolvePopoverAnchor(trigger: HTMLElement): HTMLElement {
	const focusable = trigger.querySelector<HTMLElement>('button, a[href], input, select, textarea, [role="button"]');
	return focusable ?? trigger;
}
