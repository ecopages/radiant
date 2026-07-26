import { RadiantElement, bound, customElement, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import { type Placement, autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

export type RuiTooltipProps = {
	/** Accessible description shown in the tooltip. */
	content?: string;
	/** Floating-ui placement. Default: `top`. */
	placement?: Placement;
	/** Delay in ms before showing on hover/focus. Default: `200`. */
	delay?: number;
};

type RuiTooltipBindings = {
	content: string;
};

/**
 * `<rui-tooltip>` — a popup that describes a trigger on hover or focus.
 *
 * Implements the WAI-ARIA APG Tooltip pattern: the popup has `role="tooltip"`
 * and the focusable trigger references it with `aria-describedby`. The tooltip
 * itself never receives focus.
 *
 * Event wiring:
 * - Bubbling events (`focusin` / `focusout`, document `keydown`) use `@onEvent`.
 * - `pointerenter` / `pointerleave` are bound directly on the host — they do not
 *   bubble, so `@onEvent` delegation cannot see them on the slotted trigger.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 *
 * @element rui-tooltip
 * @slot - The trigger element (typically a button or focusable control).
 */
@customElement('rui-tooltip')
export class RuiTooltip extends RadiantElement<RuiTooltipBindings> {
	@prop({ type: String, defaultValue: '' }) content: string;
	@prop({ type: String, defaultValue: 'top' }) placement: Placement;
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
	private cleanup: ReturnType<typeof autoUpdate> | null = null;
	private tooltipId = `rui-tooltip-${Math.random().toString(36).slice(2, 9)}`;
	private describedEl: HTMLElement | null = null;

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
		this.cleanup?.();
		this.cleanup = null;
	}

	private getAnchor(): HTMLElement {
		return (
			(this.querySelector(
				'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			) as HTMLElement | null) ?? this
		);
	}

	private wireTrigger(): void {
		this.describedEl?.removeAttribute('aria-describedby');
		this.describedEl = this.getAnchor();
		this.describedEl.setAttribute('aria-describedby', this.tooltipId);
	}

	@bound
	updatePosition(): void {
		if (!this.tooltipTarget || !this.open) return;
		const anchor = this.getAnchor();
		computePosition(anchor, this.tooltipTarget, {
			placement: this.placement,
			middleware: [offset(8), flip(), shift({ padding: 8 })],
		}).then(({ x, y }) => {
			Object.assign(this.tooltipTarget.style, {
				left: `${x}px`,
				top: `${y}px`,
			});
		});
	}

	@onUpdated(['content', 'placement'])
	onDescribedPropsUpdated(): void {
		this.wireTrigger();
		if (this.open) this.updatePosition();
	}

	private setOpen(next: boolean): void {
		this.clearTimers();
		this.open = next;
		if (!this.tooltipTarget) return;
		this.tooltipTarget.hidden = !next;

		if (next) {
			this.teardownFloating();
			const anchor = this.getAnchor();
			this.cleanup = autoUpdate(anchor, this.tooltipTarget, this.updatePosition);
			this.updatePosition();
		} else {
			this.teardownFloating();
		}
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

	@onEvent({ type: 'focusin', selector: '.rui-tooltip__trigger' })
	onFocusIn(): void {
		this.scheduleShow();
	}

	@onEvent({ type: 'focusout', selector: '.rui-tooltip__trigger' })
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
				<span class="rui-tooltip__trigger">
					<slot></slot>
				</span>
				<span data-ref="tooltip" id={this.tooltipId} class="rui-tooltip__content" role="tooltip" hidden>
					{this.$.content}
				</span>
			</span>
		);
	}
}
