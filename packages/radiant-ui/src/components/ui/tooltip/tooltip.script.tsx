import { RadiantElement, bound, customElement, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import { findFirstFocusableCandidate } from '@/lib/focusable-elements';
import { uniqueId } from '@/lib/unique-id';
import { applyFloatingPosition, attachFloating } from '../shared/floating-position';
import type { RuiPlacement } from '../shared/placement';

export type RuiTooltipProps = {
	/** Accessible description shown in the tooltip. */
	content?: string;
	/** Placement of the tooltip surface relative to its anchor. Default: `top`. */
	placement?: RuiPlacement;
	/** Delay in ms before showing on hover/focus. Default: `200`. */
	delay?: number;
};

type RuiTooltipBindings = {
	content: string;
};

const TOOLTIP_GAP = 8;

/**
 * `<rui-tooltip>` — popup that describes a trigger on hover or focus.
 *
 * The host can render its own trigger + tooltip tree via `render()`, or you can import
 * the script and stamp the same structure in light DOM (as `RuiTooltip` does).
 *
 * Implements the WAI-ARIA APG Tooltip pattern: the popup has `role="tooltip"`
 * and the focusable trigger references it with `aria-describedby`. The tooltip
 * itself never receives focus.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="trigger"]` — trigger wrapper. Host listens for `focusin` / `focusout` here.
 * - `[data-ref="tooltip"]` — tooltip surface (`role="tooltip"`). Host assigns `id`, toggles `hidden`,
 *   and positions the floating layer when open.
 *
 * Per trigger:
 * - First focusable descendant inside `[data-ref="trigger"]` (or the wrapper) receives `aria-describedby`.
 *
 * Optional:
 * - `content` attribute — text bound into the tooltip surface when using CE `render()`.
 *
 * Do not set `id`, `hidden`, or `aria-describedby` on the anchor — the host owns those.
 *
 * Nested hosts: none.
 *
 * Event wiring:
 * - Bubbling events (`focusin` / `focusout`, document `keydown`) use `@onEvent`.
 * - `pointerenter` / `pointerleave` are bound directly on the host — they do not
 *   bubble, so `@onEvent` delegation cannot see them on the slotted trigger.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 *
 * @element rui-tooltip
 * @attr {string} content - Accessible description shown in the tooltip.
 * @attr {string} placement - Placement of the tooltip surface relative to its anchor. Default: `top`.
 * @attr {number} delay - Delay in ms before showing on hover/focus. Default: `200`.
 *
 * @remarks
 * With CE `render()`, authored children are projected into `[data-ref="trigger"]`.
 */
@customElement('rui-tooltip')
export class RuiTooltip extends RadiantElement<RuiTooltipBindings> {
	@prop({ type: String, defaultValue: '' }) content: string;
	@prop({ type: String, defaultValue: 'top' }) placement: RuiPlacement;
	@prop({ type: Number, defaultValue: 200 }) delay: number;

	@query({ ref: 'tooltip' }) tooltipTarget: HTMLElement;

	/**
	 * Plain (non-reactive) field, not a JSX binding target: `hidden` is toggled
	 * imperatively in `setOpen()` rather than bound, since it flips on every
	 * hover/focus in/out — high-frequency enough that a plain synchronous DOM
	 * write is preferable to routing it through the reactive binding system.
	 */
	private open = false;

	private showTimer: ReturnType<typeof setTimeout> | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly tooltipId = uniqueId('rui-tooltip');
	private describedEl: HTMLElement | null = null;
	private cleanupFloating: (() => void) | null = null;

	/**
	 * Pointer enter/leave must be host listeners: those events do not bubble, and
	 * `@onEvent` only supports delegated (bubbling) listeners.
	 */
	override connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener('pointerenter', this.onPointerEnter);
		this.addEventListener('pointerleave', this.onPointerLeave);
		queueMicrotask(() => this.wireTrigger());
	}

	override disconnectedCallback(): void {
		this.clearTimers();
		this.teardownFloating();
		this.removeEventListener('pointerenter', this.onPointerEnter);
		this.removeEventListener('pointerleave', this.onPointerLeave);
		this.describedEl?.removeAttribute('aria-describedby');
		super.disconnectedCallback();
	}

	private clearTimers(): void {
		if (this.showTimer) clearTimeout(this.showTimer);
		if (this.hideTimer) clearTimeout(this.hideTimer);
		this.showTimer = null;
		this.hideTimer = null;
	}

	private teardownFloating(): void {
		this.cleanupFloating?.();
		this.cleanupFloating = null;
	}

	private getAnchor(): HTMLElement {
		return findFirstFocusableCandidate(this) ?? this;
	}

	private wireTrigger(): void {
		this.describedEl?.removeAttribute('aria-describedby');
		this.describedEl = this.getAnchor();
		if (this.tooltipTarget) this.tooltipTarget.id = this.tooltipId;
		this.describedEl.setAttribute('aria-describedby', this.tooltipId);
	}

	private attachFloating(): void {
		if (!this.tooltipTarget) return;
		this.teardownFloating();
		this.cleanupFloating = attachFloating({
			anchor: this.getAnchor(),
			floating: this.tooltipTarget,
			getPlacement: () => this.placement,
			gap: TOOLTIP_GAP,
		});
	}

	@onUpdated(['content', 'placement'])
	onDescribedPropsUpdated(): void {
		this.wireTrigger();
		if (this.open && this.tooltipTarget) {
			applyFloatingPosition(this.getAnchor(), this.tooltipTarget, this.placement, TOOLTIP_GAP);
		}
	}

	private setOpen(next: boolean): void {
		this.clearTimers();
		this.open = next;
		if (!this.tooltipTarget) return;
		this.tooltipTarget.hidden = !next;

		if (next) this.attachFloating();
		else this.teardownFloating();
	}

	private scheduleShow(): void {
		this.clearTimers();
		if (this.delay <= 0) {
			this.setOpen(true);
			return;
		}
		this.showTimer = setTimeout(() => this.setOpen(true), this.delay);
	}

	private scheduleHide(): void {
		this.clearTimers();
		this.hideTimer = setTimeout(() => this.setOpen(false), 80);
	}

	@onEvent({ document: true, type: 'keydown' })
	onDocumentKeydown(event: KeyboardEvent): void {
		if (!this.open || event.key !== 'Escape') return;
		this.setOpen(false);
	}

	@onEvent({ type: 'focusin', ref: 'trigger' })
	onFocusIn(): void {
		this.scheduleShow();
	}

	@onEvent({ type: 'focusout', ref: 'trigger' })
	onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as Node | null;
		if (next && this.contains(next)) return;
		this.scheduleHide();
	}

	@bound
	onPointerEnter(): void {
		this.scheduleShow();
	}

	@bound
	onPointerLeave(): void {
		this.scheduleHide();
	}

	override render() {
		return (
			<span class="rui-tooltip">
				<span class="rui-tooltip__trigger" data-ref="trigger">
					<slot></slot>
				</span>
				<span
					data-ref="tooltip"
					id={this.tooltipId}
					class="rui-tooltip__content rui-floating"
					role="tooltip"
					hidden
				>
					{this.$.content}
				</span>
			</span>
		);
	}
}
