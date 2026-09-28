import { RadiantElement, bound, customElement, event, onEvent, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiAlertVariant = 'info' | 'success' | 'warning' | 'error';

export type RuiAlertLayout = 'inline' | 'banner';

export type RuiAlertProps = {
	/** Visual tone of the alert. Default: `info`. */
	variant?: RuiAlertVariant;
	/**
	 * `inline` — compact icon + text for short urgent messages (no accent rail).
	 * `banner` — multi-line advisories with a left accent rail and no icon slot.
	 * Default: `inline`.
	 */
	layout?: RuiAlertLayout;
	/**
	 * When `true`, renders a dismiss control and allows `dismiss()`.
	 * Default: `false`.
	 */
	dismissible?: boolean;
	/** Accessible name for the dismiss control. Default: `Dismiss`. */
	closeLabel?: string;
};

export type RuiAlertCloseDetail = {
	reason: 'dismiss';
};

/**
 * `<rui-alert>` — status message host with optional dismiss.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiAlert` view helpers which stamp the same targets.
 *
 * Prefer injecting or revealing alerts at the moment they become relevant;
 * static copy that is always present should not use `role="alert"`.
 *
 * ## Light-DOM contract
 *
 * Optional:
 * - `[data-alert-close]` — dismiss control. Click calls `dismiss()` when `dismissible` is set.
 *
 * The host does not query alert content or the `role="alert"` surface. Authors own
 * that markup (or use `RuiAlert`, which stamps it). Do not rely on BEM class names
 * for behavior.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 *
 * @element rui-alert
 *
 * @attr {('info'|'success'|'warning'|'error')} variant - Visual tone. Default: `info`.
 * @attr {('inline'|'banner')} layout - Layout mode. Default: `inline`.
 * @attr {boolean} dismissible - Show dismiss control. Default: `false`.
 * @attr {string} close-label - Accessible name for dismiss. Default: `Dismiss`.
 *
 * @fires rui-close - Emitted when the alert is dismissed; then the host is removed.
 *
 * @remarks
 * Minimum headless tree with dismiss:
 *
 * ```html
 * <rui-alert dismissible close-label="Dismiss">
 *   <div role="alert">Your session will expire soon.</div>
 *   <button type="button" data-alert-close aria-label="Dismiss"></button>
 * </rui-alert>
 * ```
 *
 * BEM classes are presentation-only; see view `@cssclass`. Dismiss emits `rui-close`
 * and removes the host without re-building the composed surface.
 */
@customElement('rui-alert')
export class RuiAlert extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: 'info' }) variant: RuiAlertVariant;
	@prop({ type: String, reflect: true, defaultValue: 'inline' }) layout: RuiAlertLayout;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) dismissible: boolean;
	@prop({ type: String, attribute: 'close-label', defaultValue: 'Dismiss' }) closeLabel: string;

	@event({ name: 'rui-close', bubbles: true, composed: true })
	closeEvent: EventEmitter<RuiAlertCloseDetail>;

	/** Dismiss the alert: emit `rui-close`, then remove the host from the DOM. */
	@bound
	dismiss(): void {
		if (!this.isConnected) {
			return;
		}

		this.closeEvent.emit({ reason: 'dismiss' });
		this.remove();
	}

	@onEvent({ selector: '[data-alert-close]', type: 'click' })
	onCloseClick(event: Event): void {
		event.stopPropagation();
		if (!this.dismissible) {
			return;
		}
		this.dismiss();
	}
}
