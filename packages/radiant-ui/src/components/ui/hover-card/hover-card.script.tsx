import type { JSX_PROPS } from '@ecopages/jsx';
import {
	RadiantElement,
	bindTo,
	bound,
	customElement,
	event,
	onEvent,
	onUpdated,
	prop,
	query,
} from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { findFirstFocusableCandidate } from '@/lib/focusable-elements';
import { uniqueId } from '@/lib/unique-id';
import { notePreviewClosed, notePreviewOpened, resolvePreviewOpenDelay } from '../shared/preview-timing';
import { createPopoverController, shouldDismissPopoverFocus } from '../../../controllers/popover-controller';
import type { RuiPlacement } from '../../../controllers/placement';

export type RuiHoverCardOpenChangeDetail = {
	open: boolean;
};

export type RuiHoverCardProps = {
	/** Whether the card is open (controlled). */
	open?: boolean;
	/** Placement of the card relative to its anchor. Default: `bottom-start`. */
	placement?: RuiPlacement;
	/** Delay in ms before showing on hover/focus. Default: `600`. */
	delay?: number;
	/** Delay in ms before hiding after pointer/focus leaves. Default: `200`. */
	closeDelay?: number;
	/** Teleport the surface to `document.body`. Default: `true`. */
	portal?: boolean;
	/** Suppress hover/focus preview interactions. */
	disabled?: boolean;
	/** Accessible name for the preview dialog. Default: `Preview`. */
	contentLabel?: string;
};

/**
 * Default accessible name for the preview dialog.
 *
 * @remarks Must match the host `@prop` default: the SSR view seeds
 * `content-label` with it so the dialog is named before hydration.
 */
export const HOVER_CARD_DEFAULT_CONTENT_LABEL = 'Preview';

const HOVER_CARD_GAP = 8;
const LONG_PRESS_MS = 500;

/**
 * `<rui-hover-card>` — floating preview surfaced on hover or focus.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiHoverCard` view helpers which stamp the same targets.
 *
 * Unlike `rui-tooltip`, the card can hold rich, interactive content (links,
 * avatars, buttons). It is not an APG tooltip: the panel does not use
 * `role="tooltip"` and may receive pointer and keyboard focus while open.
 *
 * Preview timing uses a warmup/cooldown model shared by every hover card on the page (module
 * state in `shared/preview-timing`): the first preview waits for `delay`, then subsequent
 * previews open immediately until the post-close cooldown elapses. `rui-tooltip` does not
 * take part; it always waits for its own `delay`. Touch pointers open on long press.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-hover-card-trigger]` — anchor wrapper. Host resolves the focusable anchor inside.
 * - `[data-ref="content"]` — floating preview surface. Host assigns `id` and `aria-label`
 *   (from `content-label`). The view seeds `role="dialog"`.
 * - `[data-ref="trigger"]` — focus bridge wrapping the anchor. Host listens for `focusin`,
 *   `focusout`, and `keydown` here.
 *
 * Host sets `aria-controls` and `aria-expanded` on the resolved anchor.
 * Do not set `id`, `aria-label`, `aria-controls`, or `aria-expanded` on the anchor or surface.
 *
 * Nested hosts: none.
 *
 * @element rui-hover-card
 * @attr {boolean} open - Whether the card is open (controlled). Default: `false`.
 * @attr {string} placement - Placement relative to the anchor. Default: `bottom-start`.
 * @attr {number} delay - Show delay in ms. Default: `600`.
 * @attr {number} close-delay - Hide delay in ms after pointer/focus leaves. Default: `200`.
 * @attr {boolean} portal - Teleport the surface to `document.body`. Default: `true`.
 * @attr {boolean} disabled - Suppress hover/focus preview interactions. Default: `false`.
 * @attr {string} content-label - Accessible name for the preview dialog. Default: `Preview`.
 * @fires rui-open-change - Emitted when open state changes; `detail.open`.
 *
 * @cssprop --rui-hover-card-width - Panel width. Default: `20rem`. Override on `.rui-hover-card__content`.
 * @cssprop --rui-hover-card-padding - Panel padding. Default: `--space-inset`.
 * @cssprop --rui-hover-card-radius - Panel corner radius. Default: `--radius-container`.
 * @cssprop --rui-hover-card-surface - Panel fill. Default: `--background`.
 * @cssprop --rui-hover-card-border-color - Panel border. Default: `--border`.
 * @cssprop --rui-hover-card-shadow - Panel shadow. Default: `--shadow-overlay`.
 *
 * @remarks
 * `setOpen(next, emit?)` toggles open state. Minimum tree: `[data-ref="trigger"]` >
 * `[data-hover-card-trigger]` + `[data-ref="content"]`. BEM classes live on the view.
 */
@customElement('rui-hover-card')
export class RuiHoverCard extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiHoverCardProps;

	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: String, defaultValue: 'bottom-start' }) placement: RuiPlacement;
	@prop({ type: Number, defaultValue: 600 }) delay: number;
	@prop({ type: Number, defaultValue: 200 }) closeDelay: number;
	@prop({ type: Boolean, defaultValue: true }) portal: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;

	@prop({ type: String, attribute: 'content-label', reflect: true, defaultValue: HOVER_CARD_DEFAULT_CONTENT_LABEL })
	@bindTo({ ref: 'content', attr: 'aria-label' })
	contentLabel: string;

	@query({ ref: 'content' }) contentTarget: HTMLElement | null;

	@event({ name: 'rui-open-change', bubbles: true, composed: true })
	openChangeEvent: EventEmitter<RuiHoverCardOpenChangeDetail>;

	private readonly contentId = uniqueId('rui-hover-card');
	private readonly controller = createPopoverController(this, {
		getAnchor: () => this.getAnchor(),
		getFloating: () => this.contentTarget,
		getOpen: () => this.open,
		getPlacement: () => this.placement,
	});
	private showTimer: ReturnType<typeof setTimeout> | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	private longPressTimer: ReturnType<typeof setTimeout> | null = null;
	private openedByKeyboard = false;

	/**
	 * @remarks Set by Escape and kept until the trigger loses focus or the pointer leaves it.
	 * The `focusin` from returning focus to the anchor can arrive after the keydown handler
	 * (for example when the window is not focused), so a synchronous guard is not enough.
	 */
	private dismissed = false;

	protected override onConnected(): void {
		this.syncCard();
	}

	override disconnectedCallback(): void {
		this.clearTimers();
		if (this.open) {
			notePreviewClosed();
		}
		super.disconnectedCallback();
	}

	private clearTimers(): void {
		if (this.showTimer) clearTimeout(this.showTimer);
		if (this.hideTimer) clearTimeout(this.hideTimer);
		if (this.longPressTimer) clearTimeout(this.longPressTimer);
		this.showTimer = null;
		this.hideTimer = null;
		this.longPressTimer = null;
	}

	private getAnchor(): HTMLElement | null {
		const trigger = this.querySelector<HTMLElement>('[data-hover-card-trigger]');
		if (trigger instanceof HTMLElement) {
			return findFirstFocusableCandidate(trigger) ?? trigger;
		}
		return findFirstFocusableCandidate(this) ?? this;
	}

	private getFloatingElement(): HTMLElement | null {
		return this.controller.getFloatingElement() ?? this.contentTarget;
	}

	@bound
	@onUpdated(['open', 'placement', 'portal', 'disabled'])
	syncCard(): void {
		const anchor = this.getAnchor();
		const surface = this.contentTarget;

		if (surface) {
			surface.id = this.contentId;
		}
		if (anchor) {
			anchor.setAttribute('aria-controls', this.contentId);
			anchor.setAttribute('aria-expanded', String(this.open));
		}

		this.controller.updateConfig({
			gap: HOVER_CARD_GAP,
			portal: this.portal,
		});
		this.controller.sync();
		this.syncContentPointerBridge();
	}

	private syncContentPointerBridge(): void {
		const surface = this.getFloatingElement();
		if (!surface) {
			return;
		}

		surface.removeEventListener('pointerenter', this.onPointerEnter);
		surface.removeEventListener('pointerleave', this.onPointerLeave);

		if (this.open) {
			surface.addEventListener('pointerenter', this.onPointerEnter);
			surface.addEventListener('pointerleave', this.onPointerLeave);
		}
	}

	setOpen(next: boolean, emit = true): void {
		if (this.disabled && next) {
			return;
		}
		if (this.open === next) {
			this.syncCard();
			return;
		}

		const wasOpen = this.open;
		this.open = next;

		if (next) {
			notePreviewOpened();
		} else if (wasOpen) {
			notePreviewClosed();
		}

		if (emit) {
			this.openChangeEvent.emit({ open: next });
		}
		this.syncCard();
	}

	private scheduleShow(fromKeyboard = false): void {
		if (this.disabled) {
			return;
		}
		if (this.open) {
			this.cancelHide();
			return;
		}

		this.clearTimers();
		this.openedByKeyboard = fromKeyboard;
		const effectiveDelay = resolvePreviewOpenDelay(this.delay);
		if (effectiveDelay <= 0) {
			this.setOpen(true);
			return;
		}
		this.showTimer = setTimeout(() => this.setOpen(true), effectiveDelay);
	}

	/** @remarks Lets the pointer reach the card, and stay on it, after leaving the trigger. */
	private cancelHide(): void {
		if (this.hideTimer) clearTimeout(this.hideTimer);
		this.hideTimer = null;
	}

	private scheduleHide(): void {
		this.clearTimers();
		const delay = this.closeDelay > 0 ? this.closeDelay : 0;
		if (delay <= 0) {
			this.setOpen(false);
			return;
		}
		this.hideTimer = setTimeout(() => this.setOpen(false), delay);
	}

	private isTouchPointer(event: PointerEvent): boolean {
		return event.pointerType === 'touch';
	}

	@onEvent({ document: true, type: 'keydown' })
	onDocumentKeydown(event: KeyboardEvent): void {
		if (!this.open || event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		const anchor = this.getAnchor();
		this.dismissed = true;
		this.setOpen(false);
		if (anchor && document.activeElement !== anchor) {
			anchor.focus();
		}
	}

	@onEvent({ type: 'focusin', ref: 'trigger' })
	onFocusIn(event: FocusEvent): void {
		if (this.dismissed) {
			return;
		}
		if (!shouldDismissPopoverFocus(this.getAnchor(), this.getFloatingElement(), event.relatedTarget)) {
			return;
		}
		this.scheduleShow(true);
	}

	@onEvent({ type: 'focusout', ref: 'trigger' })
	onFocusOut(event: FocusEvent): void {
		this.dismissed = false;
		if (!shouldDismissPopoverFocus(this.getAnchor(), this.getFloatingElement(), event.relatedTarget)) {
			return;
		}
		this.scheduleHide();
	}

	@onEvent({ type: 'keydown', ref: 'trigger' })
	onHostKeydown(event: KeyboardEvent): void {
		if (!this.open || event.key !== 'Tab' || event.shiftKey || !this.openedByKeyboard) {
			return;
		}
		const floating = this.getFloatingElement();
		if (!floating) {
			return;
		}
		const first = findFirstFocusableCandidate(floating);
		if (!first) {
			return;
		}
		event.preventDefault();
		first.focus();
	}

	@onEvent({ host: true, type: 'pointerenter' })
	@bound
	onPointerEnter(event: PointerEvent): void {
		if (this.isTouchPointer(event)) {
			return;
		}
		this.scheduleShow();
	}

	@onEvent({ host: true, type: 'pointerleave' })
	@bound
	onPointerLeave(event: PointerEvent): void {
		this.dismissed = false;
		if (this.isTouchPointer(event)) {
			return;
		}
		this.scheduleHide();
	}

	@onEvent({ host: true, type: 'pointerdown' })
	@bound
	onPointerDown(event: PointerEvent): void {
		if (this.disabled || !this.isTouchPointer(event)) {
			return;
		}
		this.clearTimers();
		this.longPressTimer = setTimeout(() => {
			this.openedByKeyboard = false;
			this.setOpen(true);
		}, LONG_PRESS_MS);
	}

	@onEvent({ host: true, type: 'pointerup' })
	@onEvent({ host: true, type: 'pointercancel' })
	@bound
	onPointerUp(): void {
		if (this.longPressTimer) {
			clearTimeout(this.longPressTimer);
			this.longPressTimer = null;
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-hover-card': RuiHoverCard;
	}
}
