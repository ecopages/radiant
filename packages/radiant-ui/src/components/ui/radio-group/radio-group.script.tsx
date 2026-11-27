import type { JSX_PROPS } from '@ecopages/jsx';
import {
	RadiantElement,
	bindTo,
	customElement,
	onUpdated,
	prop,
	queryAll,
	registerSsrPreparationCallback,
} from '@ecopages/radiant';
import { createEventListenerController } from '../../../controllers/event-listener-controller';
import { nonEmpty } from '@/lib/non-empty';
import { announceControlConnect } from '@/lib/form/control-protocol';

export type RuiRadioGroupProps = {
	/** Currently selected value. Reflects to markup. */
	value?: string;
	/** Form field name shared by all radios in the group. */
	name?: string;
	/** Accessible name for the group when no visible legend is slotted. */
	label?: string;
	/** Disable every radio in the group. Default: `false`. */
	disabled?: boolean;
};

/**
 * `<rui-radio-group>` — radio group behavior host.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiRadioGroup` view helpers which stamp the same targets.
 *
 * Implements the WAI-ARIA APG Radio Group pattern using native
 * `<input type="radio">` controls. Arrow-key navigation and Space activation
 * are provided by the browser.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-radio-group-root]` — radiogroup container. Host sets `aria-label`, `aria-disabled`.
 * - `input[type="radio"]` — one per option. Host sets `name`, `checked`, `disabled`.
 *
 * Per radio:
 * - `value` — selection identity.
 * - `data-disabled` — per-item disabled flag preserved when the group is enabled.
 *
 * Do not set `name`, `checked`, or `disabled` on radios — the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *
 * @element rui-radio-group
 *
 * @attr {string} value - Selected radio value. Reflects to markup. Default: `''`.
 * @attr {string} name - Form field name shared by all radios in the group. Empty falls back to `rui-radio-group` on each radio. Default: `''`.
 * @attr {string} label - Accessible name when no visible legend is composed. Default: `''`.
 * @attr {boolean} disabled - Disables every radio in the group. Default: `false`.
 *
 *
 * The host dispatches no event. The checked radio's native `input` and `change` bubble through it, and the host
 * syncs `value` in a capture listener on itself, so a bubble listener reads the new value. Act on an event only
 * when `event.target` is that radio.
 *
 * @remarks
 * Minimum headless tree:
 *
 * ```html
 * <rui-radio-group value="pro" name="plan" label="Plan">
 *   <div data-radio-group-root role="radiogroup">
 *     <label><input type="radio" value="free" /> Free</label>
 *     <label><input type="radio" value="pro" /> Pro</label>
 *   </div>
 * </rui-radio-group>
 * ```
 *
 * BEM classes are presentation-only; see view `@cssclass`.
 */
@customElement('rui-radio-group')
export class RuiRadioGroup extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiRadioGroupProps;

	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) name: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo({
		selector: '[data-radio-group-root]',
		attr: 'aria-label',
		map: nonEmpty,
	})
	label: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({
		selector: '[data-radio-group-root]',
		attr: 'aria-disabled',
		map: (disabled) => (disabled ? 'true' : undefined),
	})
	disabled: boolean;

	@queryAll('input[type="radio"]') radioTargets: HTMLInputElement[];

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.reflectCheckedForServer());
		createEventListenerController(this, {
			getTarget: () => this,
			type: ['input', 'change'],
			options: { capture: true },
			listener: (event) => {
				const input = event.target;
				if (
					input instanceof HTMLInputElement &&
					input.type === 'radio' &&
					input.checked &&
					this.contains(input)
				) {
					this.value = input.value;
				}
			},
		});
	}

	protected override onConnected(): void {
		this.syncRadios();
		announceControlConnect(this);
	}

	/**
	 * Writes the `checked` attribute of the radio that matches `value`, so the server markup of a form that is posted
	 * before this host connects submits the group's value.
	 *
	 * @remarks
	 * The `checked` property does not reflect to an attribute, so `syncRadios` alone leaves the server HTML unchecked.
	 * It syncs first because the `@onUpdated` pass runs only for a prop that was written, and a group with none leaves
	 * every radio's `checked` unset.
	 * Runs only when serializing on the server: in a browser the attribute is the radio's default state, which a form
	 * reset restores, and the property is the live one.
	 */
	private reflectCheckedForServer(): void {
		this.syncRadios();
		for (const radio of this.radioTargets) {
			radio.toggleAttribute('checked', radio.checked);
		}
	}

	@onUpdated(['value', 'name', 'disabled'])
	syncRadios(): void {
		const groupName = this.name || this.getAttribute('name') || 'rui-radio-group';

		for (const radio of this.radioTargets) {
			radio.name = groupName;
			radio.disabled = this.disabled || radio.hasAttribute('data-disabled');
			radio.checked = this.value !== '' && radio.value === this.value;
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-radio-group': RuiRadioGroup;
	}
}
