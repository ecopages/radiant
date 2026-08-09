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
	 * CSS selector for an external anchor when not using a trigger slot or
	 * `rui-popover-trigger`.
	 */
	anchor?: string;
	/** Surface variant. `listbox` strips padding for embedded listboxes. */
	variant?: 'default' | 'listbox';
};

/**
 * `<rui-popover>` — a floating overlay positioned relative to an anchor.
 *
 * Pair with a trigger via the `trigger` slot, wrap in `rui-popover-trigger`,
 * or pass an `anchor` selector for a custom anchor element.
 *
 * @element rui-popover
 * @slot trigger - Pressable anchor (when not using an external `anchor` selector).
 * @slot content - Popover body rendered inside the floating surface.
 * @fires rui-open-change - Emitted when open state changes; `detail.open`.
 * @cssclass rui-popover-host - Anchor + surface wrapper.
 * @cssclass rui-popover - Floating surface (`role="dialog"`); `background` + `rounded-container` + `shadow-overlay`.
 * @cssclass rui-popover--listbox - Stripped padding for embedded listboxes.
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

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.syncPopover());
	}

	override disconnectedCallback(): void {
		this.unbindExternalAnchorClick();
		this.controller?.destroy();
		this.controller = null;
		super.disconnectedCallback();
	}

	private getAnchorElement(): HTMLElement | null {
		const triggerHost = this.closest('rui-popover-trigger');
		const triggerFromHost = triggerHost?.querySelector<HTMLElement>('[slot="trigger"]');
		if (triggerFromHost instanceof HTMLElement) {
			return resolvePopoverAnchor(triggerFromHost);
		}

		const slottedTrigger = this.querySelector<HTMLElement>('[slot="trigger"]');
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
		return !this.querySelector('[slot="trigger"]');
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

	override render() {
		const variantClass = this.variant === 'listbox' ? 'rui-popover--listbox' : '';
		return (
			<div class="rui-popover-host" data-ref="host">
				<slot name="trigger"></slot>
				<div data-ref="surface" class={`rui-popover rui-floating ${variantClass}`.trim()} role="dialog" hidden>
					<slot name="content"></slot>
				</div>
			</div>
		);
	}
}

export type RuiPopoverTriggerProps = {
	/** Whether the popover starts open. Default: `false`. */
	open?: boolean;
};

/**
 * `<rui-popover-trigger>` — coordinates open state between a trigger and `rui-popover`.
 *
 * @element rui-popover-trigger
 * @slot trigger - Pressable element that toggles the child popover.
 * @cssclass rui-popover-trigger - Trigger + popover wrapper.
 */
@customElement('rui-popover-trigger')
export class RuiPopoverTrigger extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;

	@query({ ref: 'root' }) rootTarget: HTMLElement;

	private getPopover(): RuiPopover | null {
		return this.querySelector('rui-popover');
	}

	override connectedCallback(): void {
		super.connectedCallback();
		if (isServer) {
			return;
		}
		queueMicrotask(() => this.syncToPopover());
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
		if (!target?.closest('[slot="trigger"]')) {
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

	override render() {
		return (
			<div class="rui-popover-trigger" data-ref="root">
				<slot name="trigger"></slot>
				<slot></slot>
			</div>
		);
	}
}

function resolvePopoverAnchor(trigger: HTMLElement): HTMLElement {
	const focusable = trigger.querySelector<HTMLElement>('button, a[href], input, select, textarea, [role="button"]');
	return focusable ?? trigger;
}
