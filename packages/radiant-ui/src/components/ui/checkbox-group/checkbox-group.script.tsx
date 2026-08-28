import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { RuiCheckbox } from '../checkbox/checkbox.script';
import { parseMultiValue, serializeMultiValue } from '../shared/multi-value';

export type RuiCheckboxGroupOrientation = 'horizontal' | 'vertical';

export type RuiCheckboxGroupProps = {
	/** Comma-separated selected checkbox values. Reflects to markup. */
	value?: string;
	/** Form field name shared by all checkboxes in the group. */
	name?: string;
	/** Accessible name for the group when no visible legend is composed. */
	label?: string;
	/** Disable every checkbox in the group. Default: `false`. */
	disabled?: boolean;
	/** Layout axis for checkbox items. Default: `vertical`. */
	orientation?: RuiCheckboxGroupOrientation;
};

export type RuiCheckboxGroupChangeDetail = {
	value: string;
};

/**
 * `<rui-checkbox-group>` — checkbox group behavior host.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiCheckboxGroup` view helpers which stamp the same targets.
 *
 * Group `value` is the comma-separated protocol shared with multi-select controls.
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
 *
 * Nested hosts: `rui-checkbox` (listens for `rui-change`; stops propagation and re-emits group-shaped detail).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
 *
 * @element rui-checkbox-group
 *
 * @attr {string} value - Comma-separated selected values. Reflects to markup. Default: `''`.
 * @attr {string} name - Form field name shared by all checkboxes in the group. Default: `''`.
 * @attr {string} label - Accessible name when no visible legend is composed. Default: `''`.
 * @attr {boolean} disabled - Disables every checkbox in the group. Default: `false`.
 * @attr {('horizontal'|'vertical')} orientation - Layout axis for checkbox items. Default: `vertical`.
 *
 * @fires rui-change - Emitted after the selected values change; `detail.value` holds the serialized selection.
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
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, reflect: true, defaultValue: 'vertical' }) orientation: RuiCheckboxGroupOrientation;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiCheckboxGroupChangeDetail>;

	protected override onConnected(): void {
		this.syncCheckboxes();
	}

	@onUpdated(['value', 'name', 'label', 'disabled', 'orientation'])
	syncCheckboxes(): void {
		const group = this.querySelector<HTMLElement>('[data-checkbox-group-root]');
		if (group) {
			if (this.label) {
				group.setAttribute('aria-label', this.label);
			} else {
				group.removeAttribute('aria-label');
			}
			if (this.disabled) {
				group.setAttribute('aria-disabled', 'true');
			} else {
				group.removeAttribute('aria-disabled');
			}
			group.setAttribute('data-orientation', this.orientation);
		}

		const selected = new Set(parseMultiValue(this.value));
		const groupName = this.name || this.getAttribute('name') || '';

		for (const checkbox of this.getCheckboxes()) {
			checkbox.checked = selected.has(checkbox.value);
			checkbox.disabled = this.disabled || checkbox.hasAttribute('data-disabled');
			if (groupName) {
				checkbox.name = groupName;
			}
		}
	}

	@onEvent({ selector: 'rui-checkbox', type: 'rui-change' })
	onCheckboxChange(event: Event): void {
		event.stopImmediatePropagation();
		const values = this.getCheckboxes()
			.filter((checkbox) => checkbox.checked)
			.map((checkbox) => checkbox.value);
		this.value = serializeMultiValue(values);
		this.changeEvent.emit({ value: this.value });
	}

	private getCheckboxes(): RuiCheckbox[] {
		return Array.from(this.querySelectorAll('rui-checkbox')).filter(
			(node): node is RuiCheckbox => node instanceof RuiCheckbox,
		);
	}
}
