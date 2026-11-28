import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, bindTo, customElement, prop, registerSsrPreparationCallback } from '@ecopages/radiant';
import { resolveSsrContextValue } from '@ecopages/radiant/context';
import { createEventListenerController } from '../../../controllers/event-listener-controller';
import { nonEmpty } from '@/lib/non-empty';
import { announceControlConnect } from '@/lib/form/control-protocol';
import { registerSubmissionForSsr } from '@/lib/form/submission';
import { checkboxGroupContext } from './checkbox-group-context';

export type RuiCheckboxProps = {
	/** Whether the checkbox is checked. Default: `false`. */
	checked?: boolean;
	/**
	 * Partially checked (mixed) state for group controllers.
	 * When `true`, the native input's `indeterminate` IDL is set and
	 * `aria-checked="mixed"` is exposed. Default: `false`.
	 */
	indeterminate?: boolean;
	/**
	 * Disable the checkbox. Default: `false`.
	 *
	 * @remarks The view stamps `data-disabled` so a parent group can restore
	 * item-level disabled after a group-level disable.
	 */
	disabled?: boolean;
	/** Value submitted with forms when checked. */
	value?: string;
	/** Associates the control with a form field name. */
	name?: string;
};

/**
 * Default submitted value for a checkbox.
 *
 * @remarks Must match the host `@prop` default: the SSR view seeds the inner
 * `<input>` with it so form submission works before hydration.
 */
export const CHECKBOX_DEFAULT_VALUE = 'on';

/**
 * `<rui-checkbox>` — a dual-state or tri-state checkbox.
 *
 * The custom element is a behavior host: it does not render checkbox markup.
 * Import the script and place light-DOM children that match the contract below,
 * or use `RuiCheckbox`, which stamps the same targets.
 *
 * Implements the WAI-ARIA APG Checkbox pattern on a native
 * `<input type="checkbox">`. Checked state uses the HTML `checked` attribute;
 * the mixed state uses the `indeterminate` IDL property with `aria-checked="mixed"`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="input"]` — native `<input type="checkbox">`. Host syncs `checked`,
 *   `indeterminate`, `disabled`, `value`, `name`, and `aria-checked="mixed"` when
 *   `indeterminate` is true.
 *
 * Optional:
 * - Label row and visible label text — presentation only; the host does not query them.
 *
 * Do not fight host-owned input state (`checked`, `indeterminate`, `disabled`, `value`,
 * `name`, `aria-checked`). Author `data-disabled` on the host when the view needs a
 * stable disabled marker for group controllers.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
 *
 * Keyboard interaction (native to the checkbox):
 * - `Space`: toggle checked state
 *
 * @element rui-checkbox
 * @attr {boolean} checked - Whether the checkbox is checked. Default: `false`.
 * @attr {boolean} indeterminate - Partially checked (mixed) state. Default: `false`.
 * @attr {boolean} disabled - Disable the checkbox. Default: `false`.
 * @attr {string} value - Value submitted with forms when checked. Default: `on`.
 * @attr {string} name - Form field name on the inner input. Default: `''`.
 *
 * The host dispatches no event. The inner input's native `input` and `change` bubble through
 * it, and the host syncs `checked` and `indeterminate` in a capture listener on itself, so a
 * bubble listener on the host or an ancestor reads fresh state. Act on an event only when
 * `event.target` is that input.
 *
 * @remarks
 * Minimum tree: `<input type="checkbox" data-ref="input" data-rui-control>`.
 * BEM classes live on the view; the host never queries them.
 */
@customElement('rui-checkbox')
export class RuiCheckbox extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiCheckboxProps;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ ref: 'input', prop: 'checked' })
	checked: boolean;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ ref: 'input', prop: 'indeterminate' },
		{
			ref: 'input',
			attr: 'aria-checked',
			map: (value) => (value ? 'mixed' : undefined),
		},
	])
	indeterminate: boolean;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ ref: 'input', prop: 'disabled' })
	disabled: boolean;

	@prop({ type: String, defaultValue: CHECKBOX_DEFAULT_VALUE })
	@bindTo({ ref: 'input', prop: 'value' })
	value: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo({
		ref: 'input',
		attr: 'name',
		map: nonEmpty,
	})
	name: string;

	/** Syncs the host from its input before any bubble listener runs. */
	constructor() {
		super();
		registerSubmissionForSsr(this);
		registerSsrPreparationCallback(this, () => this.takeGroupStateForServer(), 'beforeOnUpdated');
		createEventListenerController(this, {
			getTarget: () => this,
			type: ['input', 'change'],
			options: { capture: true },
			listener: (event) => {
				const input = event.target;
				if (input instanceof HTMLInputElement && input.type === 'checkbox' && this.contains(input)) {
					this.checked = input.checked;
					input.indeterminate = this.indeterminate;
				}
			},
		});
	}

	/**
	 * Takes the checked and disabled state of a surrounding group in server markup, as the group does on the client.
	 * A box the group does not hold is unchecked, whatever its own `checked` says.
	 *
	 * @remarks The view stamps `checked` on the input from the authored prop, and the property the host sets does not
	 * reflect to an attribute, so the attribute is written as well.
	 */
	private takeGroupStateForServer(): void {
		const group = resolveSsrContextValue(checkboxGroupContext);
		if (!group) {
			return;
		}
		this.checked = group.selected.includes(this.value);
		this.getRef<HTMLInputElement>('input')?.toggleAttribute('checked', this.checked);
		if (group.disabled || this.hasAttribute('data-disabled')) {
			this.disabled = true;
		}
	}

	protected override onConnected(): void {
		announceControlConnect(this);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-checkbox': RuiCheckbox;
	}
}
