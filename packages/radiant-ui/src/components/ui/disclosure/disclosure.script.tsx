import { RadiantElement, bound, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';

export type RuiDisclosureProps = {
	/** Whether the disclosure content starts expanded. Default: `false`. */
	open?: boolean;
	/** Optional value used when coordinating disclosures inside a group. */
	value?: string;
	/** Animate panel height. Also enabled when inside an animated disclosure group. */
	animated?: boolean;
};

export type RuiDisclosureToggleDetail = {
	value: string;
	open: boolean;
};

/**
 * `<rui-disclosure>` — a composition-first show/hide control.
 *
 * Implements the WAI-ARIA APG Disclosure (Show/Hide) pattern. Pair a trigger
 * marked with `data-disclosure-trigger` and a panel marked with
 * `data-disclosure-panel` (see the view helpers).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 * @element rui-disclosure
 * @attr {boolean} open - Whether the disclosure content starts expanded. Default: `false`.
 * @attr {string} value - Optional value used when coordinating disclosures inside a group.
 * @attr {boolean} animated - Animate panel height. Also enabled when inside an animated disclosure group. Default: `false`.
 * @slot trigger - Disclosure button (use `RuiDisclosureTrigger`).
 * @slot - Panel content (use `RuiDisclosurePanel`).
 * @fires rui-disclosure-toggle - Emitted on every trigger activation; `detail` is `{ value, open }`.
 * @cssclass rui-disclosure - Root wrapper around trigger and panel slots.
 */
@customElement('rui-disclosure')
export class RuiDisclosure extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) animated: boolean;

	private panelId = `rui-disclosure-${Math.random().toString(36).slice(2, 9)}`;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.syncAnimated();
			this.syncExpanded();
		});
	}

	private syncAnimated(): void {
		this.toggleAttribute('data-animated', this.animated);
	}

	@onEvent({ selector: '[data-disclosure-trigger]', type: 'click' })
	onTriggerClick(event: Event): void {
		event.preventDefault();
		this.toggle();
	}

	private toggle(): void {
		const next = !this.open;
		this.open = next;
		this.dispatchEvent(
			new CustomEvent<RuiDisclosureToggleDetail>('rui-disclosure-toggle', {
				bubbles: true,
				composed: true,
				detail: { value: this.value, open: next },
			}),
		);
	}

	@bound
	@onUpdated(['open', 'animated'])
	syncExpanded(): void {
		this.syncAnimated();

		const trigger = this.querySelector<HTMLElement>('[data-disclosure-trigger]');
		const panel = this.querySelector<HTMLElement>('[data-disclosure-panel]');
		if (!trigger || !panel) {
			return;
		}

		trigger.setAttribute('aria-expanded', String(this.open));
		trigger.setAttribute('aria-controls', this.panelId);
		panel.id = this.panelId;
		panel.dataset.state = this.open ? 'open' : 'closed';

		if (this.animated) {
			panel.hidden = false;
			panel.setAttribute('aria-hidden', String(!this.open));
			return;
		}

		panel.hidden = !this.open;
		panel.removeAttribute('aria-hidden');
	}

	override render() {
		return (
			<div class="rui-disclosure">
				<slot name="trigger"></slot>
				<slot></slot>
			</div>
		);
	}
}
