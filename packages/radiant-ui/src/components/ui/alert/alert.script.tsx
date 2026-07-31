import { RadiantElement, customElement, prop } from '@ecopages/radiant';

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
};

/**
 * `<rui-alert>` — a brief, important message that attracts attention
 * without interrupting the user's task.
 *
 * Compose with `RuiAlertIcon` + text for `layout="inline"`, or `RuiAlertTitle` and
 * `RuiAlertDescription` for `layout="banner"`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 *
 * @element rui-alert
 * @slot - Alert content inside the `role="alert"` region.
 */
@customElement('rui-alert')
export class RuiAlert extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: 'info' }) variant: RuiAlertVariant;
	@prop({ type: String, reflect: true, defaultValue: 'inline' }) layout: RuiAlertLayout;
}
