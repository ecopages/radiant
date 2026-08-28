import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { navigateRovingTabindex } from '@/lib/roving-tabindex';
import { syncFieldLabel } from '../shared/field-label';
import { getListboxOptionValue } from '../shared/listbox-option';
import { parseMultiValue, serializeMultiValue } from '../shared/multi-value';

export type RuiListboxSelectionMode = 'single' | 'multiple';

export type RuiListboxProps = {
	value?: string;
	label?: string;
	disabled?: boolean;
	selectionMode?: RuiListboxSelectionMode;
	/**
	 * When true, the listbox is owned by a parent (e.g. `rui-select`). Selection and
	 * keyboard interaction are handled by the parent; border chrome is omitted so the
	 * parent popup can provide it.
	 */
	embedded?: boolean;
	/** When set, overrides the default border (`true` when standalone, `false` when embedded). */
	bordered?: boolean;
};

export type RuiListboxChangeDetail = { value: string };

/**
 * `<rui-listbox>` — a list of options with single or multiple selection.
 *
 * Implements the APG Listbox pattern with roving tabindex on `[role="option"]`.
 * The view-owned `.rui-listbox` shell carries presentation; this host coordinates
 * selection and keyboard interaction only.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *
 * @element rui-listbox
 *
 * @attr {string} value - Selected option value. Default: `''`.
 * @attr {string} label - Accessible name for the list. Default: `''`.
 * @attr {boolean} disabled - Disable all selection. Default: `false`.
 * @attr {('single'|'multiple')} selection-mode - Single or multiple selection. Default: `single`.
 * @attr {boolean} embedded - Parent-owned listbox: border chrome omitted, selection handled by the parent. Default: `false`.
 * @attr {boolean} bordered - Override the border (`true` standalone, `false` embedded). Default: follows `embedded`.
 *
 * @fires rui-change - Emitted when an option is selected; detail carries `value`.
 *
 * @cssclass rui-listbox - Scrollable option list surface (`role="listbox"`).
 * @cssclass rui-listbox--bordered - Bordered standalone listbox.
 */
@customElement('rui-listbox')
export class RuiListbox extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, attribute: 'selection-mode', defaultValue: 'single' }) selectionMode: RuiListboxSelectionMode;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) embedded: boolean;
	@prop({ type: Boolean, reflect: true }) bordered: boolean | undefined;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiListboxChangeDetail>;

	private readonly uid = Math.random().toString(36).slice(2, 9);

	protected override onConnected(): void {
		this.syncLabel();
		this.sync();
	}

	@onUpdated(['value', 'label', 'disabled', 'embedded', 'selectionMode'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.sync();
	}

	private getOptions(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="option"]'));
	}

	private syncLabel(): void {
		if (this.embedded) return;
		const list = this.querySelector<HTMLElement>('[role="listbox"]');
		if (!list) return;
		if (!list.id) list.id = `rui-listbox-${this.uid}`;
		syncFieldLabel(this, list, {
			controlId: list.id,
			label: this.label,
			labelId: `rui-listbox-label-${this.uid}`,
		});
	}

	private getSelectedValues(): string[] {
		return parseMultiValue(this.value);
	}

	private setSelectedValues(values: string[]): void {
		this.value = serializeMultiValue(values);
	}

	private tabIndexFor(option: HTMLElement, tabStop: HTMLElement | undefined): number {
		if (this.embedded) {
			return -1;
		}
		return option === tabStop ? 0 : -1;
	}

	private sync(): void {
		const options = this.getOptions();
		const selected = new Set(this.getSelectedValues());
		const tabStop = options.find((option) => selected.has(getListboxOptionValue(option))) ?? options[0];
		const list = this.querySelector<HTMLElement>('[role="listbox"]');
		if (list) {
			if (this.selectionMode === 'multiple') list.setAttribute('aria-multiselectable', 'true');
			else list.removeAttribute('aria-multiselectable');
		}
		for (const option of options) {
			const isSelected = selected.has(getListboxOptionValue(option));
			option.setAttribute('aria-selected', String(isSelected));
			option.tabIndex = this.tabIndexFor(option, tabStop);
		}
	}

	private select(option: HTMLElement): void {
		if (this.disabled || option.getAttribute('aria-disabled') === 'true') return;
		const value = getListboxOptionValue(option);
		if (this.selectionMode === 'multiple') {
			const selected = new Set(this.getSelectedValues());
			if (selected.has(value)) selected.delete(value);
			else selected.add(value);
			this.setSelectedValues([...selected]);
		} else {
			this.setSelectedValues([value]);
		}
		this.sync();
		this.changeEvent.emit({ value: this.value });
		option.focus();
	}

	@onEvent({ selector: '[role="option"]', type: 'click' })
	onOptionClick(event: Event): void {
		if (this.embedded) {
			return;
		}

		const option = (event.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
		if (option && this.contains(option)) this.select(option);
	}

	@onEvent({ selector: '[role="option"]', type: 'keydown' })
	onOptionKeydown(event: KeyboardEvent): void {
		if (this.embedded) {
			return;
		}
		const options = this.getOptions();
		const current = (event.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
		if (!current) return;

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.select(current);
			return;
		}

		const result = navigateRovingTabindex({
			items: options,
			current,
			key: event.key,
			orientation: 'vertical',
		});
		if (!result.handled) return;

		event.preventDefault();
		if (this.selectionMode === 'multiple') {
			result.item.focus();
			return;
		}
		this.select(result.item);
	}
}
