import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import type { RuiTagGroup } from '../tag-group/tag-group.script';
import { findAssociatedLabel, syncFieldLabel } from '../shared/field-label';
import { ListboxPopoverBehavior } from '../shared/listbox-popover-behavior';
import { parseMultiValue, serializeMultiValue } from '../shared/multi-value';

export type RuiSelectSelectionMode = 'single' | 'multiple';

export type RuiSelectProps = {
	value?: string;
	/** Accessible name when there is no visible `RuiLabel` associated with the trigger. */
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	selectionMode?: RuiSelectSelectionMode;
	/**
	 * When `selectionMode` is `multiple`, whether selecting an option closes the popup.
	 * Defaults to false for multiple and true for single.
	 */
	shouldCloseOnSelect?: boolean;
};

export type RuiSelectChangeDetail = { value: string };

/**
 * `<rui-select>` — a select-only combobox with a button trigger and listbox popup.
 *
 * Implements the APG Combobox pattern (select-only variant). DOM focus stays on the
 * trigger button; visual focus moves into the popup via `aria-activedescendant`.
 *
 * Pair with `RuiLabel` (sibling, or via `RuiField`) for the visible name.
 * Compose with `data-select-trigger`, `data-select-toggle`, `data-select-value`, `data-select-listbox`
 * (popup shell), and `RuiListbox` with `embedded` for options.
 *
 * Wrap the listbox in `RuiAutocomplete` to add search filtering.
 * Use `RuiTagGroup` inside `RuiSelectValue` for multi-select chip display.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
 * @element rui-select
 * @slot trigger - Control row (`RuiSelectControl` with value button and toggle).
 * @slot listbox - Popup shell (`RuiSelectListbox`) containing an embedded `RuiListbox`.
 * @fires rui-change
 */
@customElement('rui-select')
export class RuiSelect extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) placeholder: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, attribute: 'selection-mode', defaultValue: 'single' }) selectionMode: RuiSelectSelectionMode;
	@prop({ type: Boolean, attribute: 'should-close-on-select' }) shouldCloseOnSelect: boolean | undefined;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSelectChangeDetail>;

	private open = false;
	private readonly uid = Math.random().toString(36).slice(2, 9);
	private readonly listboxBehavior = new ListboxPopoverBehavior({
		getAnchor: () => this.rootTarget,
		getFloating: () => this.getListboxPopup(),
		getOpen: () => this.open,
		getOptions: () => this.getOptions(),
		getActiveDescendantHost: () => this.getActiveDescendantHost(),
		getOptionIdPrefix: () => `rui-select-option-${this.uid}`,
	});

	@query({ ref: 'root' }) rootTarget: HTMLElement;

	private get listboxId(): string {
		return `rui-select-list-${this.uid}`;
	}

	private get triggerId(): string {
		return `rui-select-trigger-${this.uid}`;
	}

	private isMultiple(): boolean {
		return this.selectionMode === 'multiple';
	}

	private closesOnSelect(): boolean {
		if (this.shouldCloseOnSelect != null) {
			return this.shouldCloseOnSelect;
		}
		return !this.isMultiple();
	}

	private getSelectedValues(): string[] {
		if (!this.value) {
			return [];
		}
		return parseMultiValue(this.value);
	}

	private setSelectedValues(values: string[]): void {
		this.value = serializeMultiValue(values);
	}

	private getSearchInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-select-listbox] [data-autocomplete-input]');
	}

	private hasSearchInput(): boolean {
		return this.getSearchInput() != null;
	}

	/** Element that receives `aria-activedescendant` while the popup is open. */
	private getActiveDescendantHost(): HTMLElement | null {
		if (this.open && this.hasSearchInput()) {
			return this.getSearchInput();
		}

		return this.getTrigger();
	}

	private resetSearchFilter(): void {
		const search = this.getSearchInput();
		if (!search || search.value === '') {
			return;
		}

		search.value = '';
		search.dispatchEvent(new Event('input', { bubbles: true }));
	}

	private syncSearchInput(): void {
		const search = this.getSearchInput();
		const trigger = this.getTrigger();
		const listbox = this.getListbox();
		if (!search || !listbox || !trigger) {
			return;
		}

		if (this.open) {
			search.setAttribute('role', 'combobox');
			search.setAttribute('aria-autocomplete', 'list');
			search.setAttribute('aria-expanded', 'true');
			search.setAttribute('aria-controls', this.listboxId);
			trigger.removeAttribute('aria-activedescendant');
			return;
		}

		search.removeAttribute('role');
		search.removeAttribute('aria-autocomplete');
		search.removeAttribute('aria-expanded');
		search.removeAttribute('aria-controls');
		search.removeAttribute('aria-activedescendant');
	}

	private focusPopupInput(): void {
		queueMicrotask(() => {
			this.getSearchInput()?.focus();
		});
	}

	private getTagGroup(): RuiTagGroup | null {
		return this.querySelector<RuiTagGroup>('[data-select-value] rui-tag-group');
	}

	private hasTagGroup(): boolean {
		return this.getTagGroup() != null;
	}

	private syncTagGroup(): void {
		const tagGroup = this.getTagGroup();
		const valueElement = this.getValueElement();
		if (!tagGroup || !valueElement) {
			return;
		}

		const selected = this.getSelectedValues();
		const items = selected.flatMap((value) => {
			const option = this.getOptions().find((item) => this.getOptionValue(item) === value);
			return option ? [{ value, label: this.getOptionLabel(option) }] : [];
		});
		tagGroup.embedded = true;
		tagGroup.setItems(items);
		tagGroup.value = this.value;
		this.syncTagGroupPlaceholder(valueElement, selected.length);
	}

	private syncTagGroupPlaceholder(valueElement: HTMLElement, selectedCount: number): void {
		let placeholder = valueElement.querySelector<HTMLElement>('[data-select-placeholder]');
		if (!this.placeholder) {
			placeholder?.remove();
			return;
		}

		if (!placeholder) {
			placeholder = document.createElement('span');
			placeholder.setAttribute('data-select-placeholder', 'true');
			valueElement.insertBefore(placeholder, valueElement.firstChild);
		}

		placeholder.textContent = this.placeholder;
		placeholder.hidden = selectedCount > 0;
		valueElement.toggleAttribute('data-placeholder', selectedCount === 0);
	}

	private removeSelectedValue(value: string): void {
		const selected = new Set(this.getSelectedValues());
		if (!selected.has(value)) {
			return;
		}

		selected.delete(value);
		this.setSelectedValues([...selected]);
		this.syncValueDisplay();
		this.syncOptionSelection();
		this.syncTagGroup();
		this.changeEvent.emit({ value: this.value });
	}

	private getTrigger(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-select-trigger]');
	}

	private getToggle(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-select-toggle]');
	}

	private getValueElement(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-select-value]');
	}

	private getListboxPopup(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-select-listbox]');
	}

	private getListbox(): HTMLElement | null {
		const host = this.querySelector('rui-listbox');
		if (host) {
			return host.querySelector<HTMLElement>('[role="listbox"]');
		}

		return this.getListboxPopup();
	}

	private getListboxHost(): (HTMLElement & { value?: string; embedded?: boolean }) | null {
		return this.querySelector('rui-listbox');
	}

	private getOptions(): HTMLElement[] {
		const listbox = this.getListbox();
		if (!listbox) {
			return [];
		}

		return Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
	}

	private getOptionLabel(option: HTMLElement): string {
		return option.getAttribute('data-label') || option.textContent?.trim() || '';
	}

	private getOptionValue(option: HTMLElement): string {
		return option.getAttribute('data-value') || this.getOptionLabel(option);
	}

	private ensureOptionIds(): void {
		this.listboxBehavior.ensureOptionIds();
	}

	private getAccessibleName(): string {
		const labelElement = findAssociatedLabel(this);
		return labelElement?.textContent?.trim() || this.label || 'Options';
	}

	private syncLabel(): void {
		const trigger = this.getTrigger();
		syncFieldLabel(this, trigger, {
			controlId: this.triggerId,
			label: this.label,
			labelId: `rui-select-label-${this.uid}`,
		});
	}

	private syncTrigger(): void {
		const trigger = this.getTrigger();
		const listbox = this.getListbox();
		const popup = this.getListboxPopup();
		if (!trigger || !listbox) {
			return;
		}

		if (!trigger.id) {
			trigger.id = this.triggerId;
		}

		if (!listbox.id) {
			listbox.id = this.listboxId;
		}

		trigger.setAttribute('role', 'combobox');
		trigger.setAttribute('aria-haspopup', 'listbox');
		trigger.setAttribute('aria-autocomplete', 'none');
		trigger.setAttribute('aria-expanded', String(this.open));
		trigger.setAttribute('aria-controls', this.listboxId);
		listbox.setAttribute('aria-label', this.getAccessibleName());

		if (this.isMultiple()) {
			listbox.setAttribute('aria-multiselectable', 'true');
		} else {
			listbox.removeAttribute('aria-multiselectable');
		}

		if (popup) {
			popup.removeAttribute('role');
			popup.removeAttribute('aria-label');
			popup.removeAttribute('aria-multiselectable');
		}

		if (this.disabled) {
			trigger.disabled = true;
		}

		this.syncToggle();
		this.syncSearchInput();
	}

	private syncToggle(): void {
		const toggle = this.getToggle();
		if (!toggle) {
			return;
		}

		toggle.setAttribute('aria-expanded', String(this.open));
		toggle.disabled = this.disabled;
	}

	private syncListboxHost(): void {
		const host = this.getListboxHost();
		if (!host) {
			return;
		}

		host.embedded = true;
		if (!this.isMultiple()) {
			host.value = this.value;
		}
	}

	private syncValueDisplay(): void {
		if (this.hasTagGroup()) {
			this.syncTagGroup();
			return;
		}

		const valueElement = this.getValueElement();
		if (!valueElement || valueElement.childElementCount > 0) {
			return;
		}

		const selected = this.getSelectedValues();
		if (selected.length === 0) {
			valueElement.textContent = '';
			valueElement.setAttribute('data-placeholder', 'true');
			if (this.placeholder) {
				valueElement.textContent = this.placeholder;
			}
			return;
		}

		valueElement.removeAttribute('data-placeholder');
		if (this.isMultiple()) {
			const labels = selected.map((value) => {
				const match = this.getOptions().find((option) => this.getOptionValue(option) === value);
				return match ? this.getOptionLabel(match) : value;
			});
			valueElement.textContent = labels.join(', ');
			return;
		}

		const match = this.getOptions().find((option) => this.getOptionValue(option) === selected[0]);
		valueElement.textContent = match ? this.getOptionLabel(match) : selected[0];
	}

	private syncOptionSelection(): void {
		const selected = new Set(this.getSelectedValues());
		for (const option of this.getOptions()) {
			const value = this.getOptionValue(option);
			const isSelected = selected.has(value);
			option.setAttribute('aria-selected', String(isSelected));
		}
	}

	private setOpen(next: boolean, options: { activate?: 'first' | 'last' | 'none' } = {}): void {
		const activate = options.activate ?? 'none';
		this.open = next;
		const trigger = this.getTrigger();
		const popup = this.getListboxPopup();
		if (!trigger || !popup) {
			return;
		}

		trigger.setAttribute('aria-expanded', String(next));
		popup.hidden = !next;

		if (!next) {
			this.listboxBehavior.clearActiveOption();
			this.resetSearchFilter();
			this.syncSearchInput();
			this.listboxBehavior.syncPopoverPosition();
			return;
		}

		this.ensureOptionIds();
		this.syncSearchInput();
		this.listboxBehavior.syncPopoverPosition();

		if (this.hasSearchInput()) {
			this.focusPopupInput();
		}

		if (activate === 'first') {
			const visible = this.listboxBehavior.getVisibleOptions();
			this.listboxBehavior.setActiveOption(visible.length ? 0 : -1);
			return;
		}

		if (activate === 'last') {
			const visible = this.listboxBehavior.getVisibleOptions();
			this.listboxBehavior.setActiveOption(visible.length ? visible.length - 1 : -1);
			return;
		}

		this.listboxBehavior.clearActiveOption();
	}

	private selectOption(option: HTMLElement): void {
		if (option.getAttribute('aria-disabled') === 'true') {
			return;
		}

		const optionValue = this.getOptionValue(option);

		if (this.isMultiple()) {
			const selected = new Set(this.getSelectedValues());
			if (selected.has(optionValue)) {
				selected.delete(optionValue);
			} else {
				selected.add(optionValue);
			}
			this.setSelectedValues([...selected]);
		} else {
			this.value = optionValue;
		}

		this.syncValueDisplay();
		this.syncOptionSelection();
		this.changeEvent.emit({ value: this.value });

		if (this.closesOnSelect()) {
			this.resetSearchFilter();
			this.setOpen(false);
			this.getTrigger()?.focus();
		}
	}

	private handleListboxKeydown(event: KeyboardEvent): void {
		this.listboxBehavior.handleKeydown(event, {
			isOpen: this.open,
			canUseSpace: !this.hasSearchInput(),
			closesOnTab: this.closesOnSelect(),
			enterWhenClosed: 'open',
			enterWithoutActive: 'ignore',
			onOpen: (activation = 'none') => this.setOpen(true, { activate: activation }),
			onClose: (reason) => {
				this.setOpen(false);
				if (reason === 'arrow' || reason === 'escape') {
					this.getTrigger()?.focus();
				}
			},
			onSelectActive: () => {
				const option = this.listboxBehavior.getVisibleOptions()[this.listboxBehavior.activeOptionIndex];
				if (option) {
					this.selectOption(option);
				}
			},
		});
	}

	private handleTriggerKeydown(event: KeyboardEvent): void {
		this.handleListboxKeydown(event);
	}

	private initialize(): void {
		this.ensureOptionIds();
		this.syncLabel();
		this.syncTrigger();
		this.syncListboxHost();
		this.syncValueDisplay();
		this.syncOptionSelection();
		this.setOpen(false);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.initialize());
	}

	override disconnectedCallback(): void {
		this.listboxBehavior.destroy();
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'label', 'placeholder', 'disabled', 'selectionMode', 'shouldCloseOnSelect'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncTrigger();
		this.syncListboxHost();
		this.syncValueDisplay();
		this.syncOptionSelection();
	}

	@onEvent({ selector: '[data-select-trigger], [data-select-toggle]', type: 'click' })
	onTriggerClick(event: Event): void {
		event.preventDefault();
		const trigger = this.getTrigger();
		if (!trigger || trigger.disabled) {
			return;
		}

		if (this.open) {
			this.setOpen(false);
		} else {
			this.setOpen(true);
		}

		if (this.open && this.hasSearchInput()) {
			this.focusPopupInput();
			return;
		}

		trigger.focus();
	}

	@onEvent({ selector: '[data-select-trigger]', type: 'keydown', options: { capture: true } })
	onTriggerKeydown(event: KeyboardEvent): void {
		this.handleTriggerKeydown(event);
	}

	@onEvent({ selector: '[data-select-listbox] [data-autocomplete-input]', type: 'keydown', options: { capture: true } })
	onSearchKeydown(event: KeyboardEvent): void {
		this.handleListboxKeydown(event);
	}

	@onEvent({ selector: '[data-select-listbox] [data-autocomplete-input]', type: 'input' })
	onSearchInput(): void {
		if (!this.open) {
			return;
		}

		this.listboxBehavior.clearActiveOption();
	}

	@onEvent({ selector: '[data-select-value] rui-tag-group', type: 'rui-remove' })
	onTagRemove(event: Event): void {
		const detail = (event as CustomEvent<{ value?: string }>).detail;
		if (!detail?.value) {
			return;
		}

		this.removeSelectedValue(detail.value);
	}

	@onEvent({ selector: '[data-select-value] [data-tag]', type: 'click' })
	onTagClick(event: Event): void {
		const target = event.target as HTMLElement;
		if (target.closest('[data-tag-remove]')) {
			return;
		}

		event.stopPropagation();
	}

	@onEvent({ selector: '[data-select-listbox] [role="option"]', type: 'pointerover' })
	onOptionPointerOver(event: Event): void {
		if (!this.open) {
			return;
		}

		const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
		if (!option || option.getAttribute('aria-disabled') === 'true' || option.hidden) {
			return;
		}

		const visible = this.listboxBehavior.getVisibleOptions();
		const index = visible.indexOf(option);
		if (index >= 0) {
			this.listboxBehavior.setActiveOption(index);
		}
	}

	@onEvent({ selector: '[data-select-listbox] [role="option"]', type: 'mousedown' })
	onOptionMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ selector: '[data-select-listbox] [role="option"]', type: 'click' })
	onOptionClick(event: Event): void {
		const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
		if (option) {
			this.selectOption(option);
		}
	}

	@onEvent({ ref: 'root', type: 'focusout' })
	onFocusOut(event: FocusEvent): void {
		if (!this.listboxBehavior.shouldDismissFocus(event.relatedTarget)) {
			return;
		}

		this.setOpen(false);
	}

	@onEvent({ document: true, type: 'pointerdown' })
	onDocumentPointerDown(event: PointerEvent): void {
		if (!this.open) {
			return;
		}
		if (!this.listboxBehavior.shouldDismissPointer(event.target as Node)) {
			return;
		}
		this.setOpen(false);
	}

	override render() {
		return (
			<div class="rui-select" data-ref="root">
				<slot name="trigger"></slot>
				<slot name="listbox"></slot>
			</div>
		);
	}
}
