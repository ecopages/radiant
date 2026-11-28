import type { JSX_PROPS } from '@ecopages/jsx';
import {
	RadiantElement,
	bindTo,
	customElement,
	onUpdated,
	prop,
	registerSsrPreparationCallback,
} from '@ecopages/radiant';
import { provideContext, resolveSsrContextValue } from '@ecopages/radiant/context';
import type { ContextProvider } from '@ecopages/radiant/context';
import { createEventListenerController } from '../../../controllers/event-listener-controller';
import { nonEmpty } from '@/lib/non-empty';
import { RuiCheckbox } from '../checkbox/checkbox.script';
import { multiValuePropOptions, type ViewMultiValue } from '@/lib/multi-value';
import { announceControlConnect } from '@/lib/form/control-protocol';
import { checkboxGroupContext } from '../checkbox/checkbox-group-context';
import { fieldContext } from '../field/field-context';

export type RuiCheckboxGroupOrientation = 'horizontal' | 'vertical';

export type RuiCheckboxGroupProps = {
	/** Selected checkbox values. The attribute is comma-separated. */
	value?: ViewMultiValue;
	/** Form field name shared by all checkboxes in the group. */
	name?: string;
	/** Accessible name for the group when no visible legend is composed. */
	label?: string;
	/** Disable every checkbox in the group. Default: `false`. */
	disabled?: boolean;
	/** Layout axis for checkbox items. Default: `vertical`. */
	orientation?: RuiCheckboxGroupOrientation;
};

/**
 * `<rui-checkbox-group>` — checkbox group behavior host.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiCheckboxGroup` view helpers which stamp the same targets.
 *
 * Group `value` is a `string[]` property; the attribute is comma-separated.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-checkbox-group-root]` — group container. Host sets `aria-label`, `aria-disabled`, `data-orientation`.
 * - `rui-checkbox` — one per option (nested host). Host sets `checked`, `disabled`, `name`.
 *
 * Per checkbox (`rui-checkbox`):
 * - `value` — selection identity.
 * - `data-disabled` — per-item disabled flag preserved when the group is enabled.
 *
 * Do not set `checked`, `disabled`, or `name` on `rui-checkbox` children — the host owns those.
 * After connect, group `value` wins over per-item `checked`.
 * Group `value` follows user toggles only: a programmatic `checked` write on a child does not update it, and the next sync overwrites that write; set the group `value` instead.
 *
 * Nested hosts: `rui-checkbox`, which dispatches nothing itself.
 *
 * The group dispatches no event either. A toggle is the toggled input's own `input` and `change`, which bubble through
 * the group, so one toggle is one `change`. The group syncs `value` from the inputs in a capture listener on itself,
 * so a bubble listener reads the new value. Act on an event only when `event.target` is a member input.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
 *
 * @element rui-checkbox-group
 *
 * @attr {string} value - Comma-separated selected values in markup; the property is `string[]`. Default: `[]`.
 * @attr {string} name - Form field name shared by all checkboxes in the group. Default: `''`.
 * @attr {string} label - Accessible name when no visible legend is composed. Default: `''`.
 * @attr {boolean} disabled - Disables every checkbox in the group. Default: `false`.
 * @attr {('horizontal'|'vertical')} orientation - Layout axis for checkbox items. Default: `vertical`.
 *
 * @remarks
 * Minimum headless tree:
 *
 * ```html
 * <rui-checkbox-group value="news" name="topics" label="Topics">
 *   <div data-checkbox-group-root role="group">
 *     <rui-checkbox value="news">News</rui-checkbox>
 *     <rui-checkbox value="travel">Travel</rui-checkbox>
 *   </div>
 * </rui-checkbox-group>
 * ```
 *
 * BEM classes are presentation-only; see view `@cssclass`.
 */
@customElement('rui-checkbox-group')
export class RuiCheckboxGroup extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiCheckboxGroupProps;

	@prop({ ...multiValuePropOptions, defaultValue: [] })
	value: string[];
	@prop({ type: String, defaultValue: '' }) name: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo({
		selector: '[data-checkbox-group-root]',
		attr: 'aria-label',
		map: nonEmpty,
	})
	label: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({
		selector: '[data-checkbox-group-root]',
		attr: 'aria-disabled',
		map: (disabled) => (disabled ? 'true' : undefined),
	})
	disabled: boolean;

	@prop({ type: String, reflect: true, defaultValue: 'vertical' })
	@bindTo({ selector: '[data-checkbox-group-root]', attr: 'data-orientation' })
	orientation: RuiCheckboxGroupOrientation;

	/**
	 * Hands the group's name to the checkboxes it renders on the server, where a checkbox serializes before the
	 * group can name it.
	 */
	@provideContext({ context: checkboxGroupContext, initialValue: { name: '', disabled: false } })
	private groupProvider: ContextProvider<typeof checkboxGroupContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(
			this,
			() => {
				const name = resolveSsrContextValue(fieldContext)?.name || this.name;
				if (name) {
					this.name = name;
					this.setAttribute('name', name);
				}
				this.groupProvider.setContext({ name, disabled: this.disabled });
			},
			'beforeAuthoredChildren',
		);
		createEventListenerController(this, {
			getTarget: () => this,
			type: ['input', 'change'],
			options: { capture: true },
			listener: (event) => {
				if (event.target instanceof HTMLInputElement && this.contains(event.target)) {
					this.value = this.getCheckboxes()
						.filter((checkbox) => checkbox.querySelector('input')?.checked)
						.map((checkbox) => checkbox.value);
				}
			},
		});
	}

	protected override onConnected(): void {
		this.syncCheckboxes();
		announceControlConnect(this);
	}

	@onUpdated(['value', 'name', 'disabled'])
	syncCheckboxes(): void {
		const selected = new Set(this.value);
		const groupName = this.name || this.getAttribute('name') || '';

		for (const checkbox of this.getCheckboxes()) {
			checkbox.checked = selected.has(checkbox.value);
			checkbox.disabled = this.disabled || checkbox.hasAttribute('data-disabled');
			if (groupName) {
				checkbox.name = groupName;
			}
		}
	}

	private getCheckboxes(): RuiCheckbox[] {
		return Array.from(this.querySelectorAll('rui-checkbox')).filter(
			(node): node is RuiCheckbox => node instanceof RuiCheckbox,
		);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-checkbox-group': RuiCheckboxGroup;
	}
}
