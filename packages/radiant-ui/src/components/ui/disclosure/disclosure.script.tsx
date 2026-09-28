import { RadiantElement, bindTo, bound, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';
import { uniqueId } from '@/lib/unique-id';

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
 * `<rui-disclosure>` — show/hide behavior host.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiDisclosure` view helpers which stamp the same targets.
 *
 * Implements the WAI-ARIA APG Disclosure (Show/Hide) pattern.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-disclosure-trigger]` — disclosure button. Host sets `aria-expanded`, `aria-controls`.
 * - `[data-disclosure-panel]` — panel content. Host sets `id`, `data-state`, `hidden`, and `aria-hidden` (when animated).
 *
 * Do not set `aria-expanded`, `aria-controls`, `id`, `data-state`, `hidden`, or `aria-hidden` on
 * the trigger or panel — the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 * @element rui-disclosure
 * @attr {boolean} open - Whether the disclosure content starts expanded. Default: `false`.
 * @attr {string} value - Optional value used when coordinating disclosures inside a group.
 * @attr {boolean} animated - Animate panel height. Also enabled when inside an animated disclosure group. Default: `false`.
 * @fires rui-disclosure-toggle - Emitted on every trigger activation; `detail` is `{ value, open }`.
 *
 * @remarks
 * Minimum headless tree:
 *
 * ```html
 * <rui-disclosure>
 *   <button type="button" data-disclosure-trigger>Shipping details</button>
 *   <div data-disclosure-panel>Delivered in 3–5 business days.</div>
 * </rui-disclosure>
 * ```
 *
 * BEM classes are presentation-only; see view `@cssclass`.
 */
@customElement('rui-disclosure')
export class RuiDisclosure extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-disclosure-trigger]', attr: 'aria-expanded' },
		{
			selector: '[data-disclosure-panel]',
			attr: 'data-state',
			map: (open) => (open ? 'open' : 'closed'),
		},
	])
	open: boolean;

	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ bool: 'data-animated' })
	animated: boolean;

	private readonly panelId = uniqueId('rui-disclosure');

	protected override onConnected(): void {
		this.syncPanelRelationship();
		this.syncExpanded();
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

	private syncPanelRelationship(): void {
		const trigger = this.querySelector<HTMLElement>('[data-disclosure-trigger]');
		const panel = this.querySelector<HTMLElement>('[data-disclosure-panel]');
		if (!trigger || !panel) {
			return;
		}

		trigger.setAttribute('aria-controls', this.panelId);
		panel.id = this.panelId;
	}

	@bound
	@onUpdated(['open', 'animated'])
	syncExpanded(): void {
		const panel = this.querySelector<HTMLElement>('[data-disclosure-panel]');
		if (!panel) {
			return;
		}

		if (this.animated) {
			panel.toggleAttribute('hidden', false);
			panel.setAttribute('aria-hidden', String(!this.open));
			return;
		}

		panel.toggleAttribute('hidden', !this.open);
		panel.removeAttribute('aria-hidden');
	}
}
