import type { RuiListbox, RuiListboxSelectionMode } from '../listbox/listbox.script';
import type { RuiTagGroup } from '../tag-group/tag-group.script';
import { getListboxOptionLabel, getListboxOptionValue } from './listbox-option';
import { parseMultiValue, serializeMultiValue } from './multi-value';

export type ListboxHostControllerConfig = {
	getRoot: () => ParentNode | null;
	getSelectionMode: () => RuiListboxSelectionMode;
	getValue: () => string;
	setValue: (value: string) => void;
	/** Popup shell used when no `rui-listbox` host is present. */
	getPopup?: () => HTMLElement | null;
	/** Selector for an optional chip host, e.g. `[data-select-value] rui-tag-group`. */
	tagGroupSelector?: string;
};

/**
 * Selection and listbox-host sync shared by select and combobox.
 *
 * @remarks Popup open state, filtering, and trigger-kind policy stay on the
 * owning custom element. This controller owns the contract both hosts must
 * agree on: the embedded listbox, the comma-separated value array, option
 * `aria-selected`, and optional tag-group chips.
 */
export class ListboxHostController {
	private readonly config: ListboxHostControllerConfig;

	constructor(config: ListboxHostControllerConfig) {
		this.config = config;
	}

	getListboxHost(): RuiListbox | null {
		return this.config.getRoot()?.querySelector('rui-listbox') ?? null;
	}

	getListbox(): HTMLElement | null {
		const host = this.getListboxHost();
		if (host) {
			return host.querySelector<HTMLElement>('[role="listbox"]') ?? host;
		}
		return this.config.getPopup?.() ?? null;
	}

	getOptions(): HTMLElement[] {
		const listbox = this.getListbox();
		if (!listbox) {
			return [];
		}
		return Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
	}

	getSelectedValues(): string[] {
		return parseMultiValue(this.config.getValue());
	}

	setSelectedValues(values: string[]): void {
		this.config.setValue(serializeMultiValue(values));
	}

	toggleValue(optionValue: string): void {
		if (this.config.getSelectionMode() === 'multiple') {
			const selected = new Set(this.getSelectedValues());
			if (selected.has(optionValue)) {
				selected.delete(optionValue);
			} else {
				selected.add(optionValue);
			}
			this.setSelectedValues([...selected]);
			return;
		}
		this.setSelectedValues([optionValue]);
	}

	removeValue(optionValue: string): boolean {
		const selected = new Set(this.getSelectedValues());
		if (!selected.delete(optionValue)) {
			return false;
		}
		this.setSelectedValues([...selected]);
		return true;
	}

	clearValues(): boolean {
		if (!this.config.getValue()) {
			return false;
		}
		this.setSelectedValues([]);
		return true;
	}

	findOption(eventTarget: EventTarget | null): HTMLElement | null {
		if (!(eventTarget instanceof Element)) {
			return null;
		}
		const option = eventTarget.closest<HTMLElement>('[role="option"]');
		return option ?? null;
	}

	isSelectableOption(option: HTMLElement | null): option is HTMLElement {
		return (
			option != null && option.getAttribute('aria-disabled') !== 'true' && !option.hidden
		);
	}

	syncListboxHost(): void {
		const host = this.getListboxHost();
		if (!host) {
			return;
		}
		host.embedded = true;
		host.selectionMode = this.config.getSelectionMode();
		host.value = this.config.getValue();
	}

	syncOptionSelection(): void {
		const selected = new Set(this.getSelectedValues());
		for (const option of this.getOptions()) {
			option.setAttribute('aria-selected', String(selected.has(getListboxOptionValue(option))));
		}
	}

	syncMultiselectable(listbox: HTMLElement | null): void {
		if (!listbox) {
			return;
		}
		if (this.config.getSelectionMode() === 'multiple') {
			listbox.setAttribute('aria-multiselectable', 'true');
			return;
		}
		listbox.removeAttribute('aria-multiselectable');
	}

	getTagGroup(): RuiTagGroup | null {
		const selector = this.config.tagGroupSelector;
		if (!selector) {
			return null;
		}
		const tagGroup = this.config.getRoot()?.querySelector<RuiTagGroup>(selector) ?? null;
		if (!tagGroup || typeof tagGroup.setItems !== 'function') {
			return null;
		}
		return tagGroup;
	}

	syncTagGroup(): void {
		const tagGroup = this.getTagGroup();
		if (!tagGroup) {
			return;
		}
		const items = this.getSelectedValues().flatMap((value) => {
			const option = this.getOptions().find((item) => getListboxOptionValue(item) === value);
			return option ? [{ value, label: getListboxOptionLabel(option) }] : [];
		});
		tagGroup.embedded = true;
		tagGroup.setItems(items);
		tagGroup.value = this.config.getValue();
	}

	labelForValue(value: string): string {
		const match = this.getOptions().find((option) => getListboxOptionValue(option) === value);
		return match ? getListboxOptionLabel(match) : value;
	}
}
