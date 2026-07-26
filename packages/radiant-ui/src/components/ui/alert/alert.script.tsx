import { RadiantElement, customElement, prop } from '@ecopages/radiant';

export type RuiAlertProps = {
	/** Visual tone of the alert. Default: `info`. */
	variant?: 'info' | 'success' | 'warning' | 'error';
};

/**
 * `<rui-alert>` — a brief, important message that attracts attention
 * without interrupting the user's task.
 *
 * Implements the WAI-ARIA APG Alert pattern via `role="alert"`. Dynamically
 * rendered alerts are announced by most screen readers. Do not move focus
 * into the alert; use an Alert Dialog when interrupting workflow is required.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
 *
 * Keyboard interaction: not applicable — alerts must not steal focus.
 *
 * @element rui-alert
 * @slot - The alert message content.
 */
@customElement('rui-alert')
export class RuiAlert extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: 'info' }) variant: RuiAlertProps['variant'];

	override render() {
		return (
			<div class={`rui-alert rui-alert--${this.variant ?? 'info'}`} role="alert">
				<slot></slot>
			</div>
		);
	}
}
