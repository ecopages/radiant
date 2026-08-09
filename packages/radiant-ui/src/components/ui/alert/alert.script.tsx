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

type RuiAlertBindings = {
	variant: RuiAlertVariant;
	layout: RuiAlertLayout;
	dismissible: boolean;
	closeLabel: string;
};

/**
 * `<rui-alert>` — a brief, important message that attracts attention
 * without interrupting the user's task.
 *
 * Compose with the `RuiAlert` view (surface + optional dismiss control) and
 * `RuiAlertIcon` / `RuiAlertTitle` / `RuiAlertDescription` as needed.
 *
 * Prefer injecting or revealing alerts at the moment they become relevant;
 * static copy that is always present should not use `role="alert"`.
 *
 * @summary Status message host; optional dismiss removes the element.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 *
 * @element rui-alert
 *
 * @attr {('info'|'success'|'warning'|'error')} variant - Visual tone. Default: `info`.
 * @attr {('inline'|'banner')} layout - Layout mode. Default: `inline`.
 * @attr {boolean} dismissible - Show dismiss control (via the view). Default: `false`.
 * @attr {string} close-label - Accessible name for dismiss. Default: `Dismiss`.
 *
 * @slot - Alert content. Prefer the `RuiAlert` view so the `role="alert"` surface
 *   and BEM classes stay in sync with `variant` / `layout` / `dismissible`.
 *
 * @fires rui-close - Emitted when the alert is dismissed; then the host is removed.
 *
 * @remarks
 * Styling classes live on the JSX view helpers (`@cssclass`). This element owns
 * dismiss behavior — default `render()` is a passthrough slot so prop updates do
 * not rebuild the composed light-DOM surface.
 *
 * **Why a custom element?** Dismiss emits `rui-close` and removes the host from
 * the DOM without re-projecting slot content. A presentational-only wrapper would
 * need equivalent lifecycle wiring; the CE keeps that behavior self-contained.
 */
@customElement('rui-alert')
export class RuiAlert extends RadiantElement<RuiAlertBindings> {
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
