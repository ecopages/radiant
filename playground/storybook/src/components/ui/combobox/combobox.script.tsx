import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiComboboxProps = {
	value?: string;
	/** Accessible name when there is no visible `RuiLabel` associated with the input. */
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	/**
	 * When true, focusing the input opens the listbox (visual focus stays on the
	 * input until ArrowDown / ArrowUp). Defaults to false — APG list autocomplete
	 * opens on ArrowDown, typing, or the trigger button.
	 */
	openOnFocus?: boolean;
};

export type RuiComboboxChangeDetail = { value: string };

/**
 * `<rui-combobox>` — a composition-first combobox with a listbox popup.
 *
 * Implements the APG Combobox pattern (list autocomplete, manual selection).
 * DOM focus stays on the combobox input; visual focus moves into the popup via
 * `aria-activedescendant` when the user presses ArrowDown / ArrowUp.
 *
 * Pair with `RuiLabel` (sibling, or via `RuiField`) for the visible name.
 * Compose with `data-combobox-input`, optional `data-combobox-trigger`,
 * `data-combobox-listbox`, and `data-combobox-option` (see view helpers).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 * @element rui-combobox
 * @slot control - Input row (`RuiComboboxControl` with input and trigger).
 * @slot listbox - Popup listbox (`RuiComboboxListbox`).
 * @fires rui-change
 */
@customElement('rui-combobox')
export class RuiCombobox extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) placeholder: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) openOnFocus: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiComboboxChangeDetail>;

	private open = false;
	/** True when visual focus is in the listbox (aria-activedescendant is set). */
	private listboxHasVisualFocus = false;
	private activeIndex = -1;
	private skipNextFocusOpen = false;
	private readonly uid = Math.random().toString(36).slice(2, 9);

	private get listboxId(): string {
		return `rui-combobox-list-${this.uid}`;
	}

	private get inputId(): string {
		return `rui-combobox-input-${this.uid}`;
	}

	private getInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-combobox-input]');
	}

	private getTrigger(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-combobox-trigger]');
	}

	private getListbox(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-combobox-listbox]');
	}

	private getOptions(): HTMLElement[] {
		const listbox = this.getListbox();
		if (!listbox) {
			return [];
		}

		return Array.from(listbox.querySelectorAll<HTMLElement>('[data-combobox-option]'));
	}

	private getVisibleOptions(): HTMLElement[] {
		return this.getOptions().filter(
			(option) => !option.hidden && option.getAttribute('aria-disabled') !== 'true',
		);
	}

	private getOptionLabel(option: HTMLElement): string {
		return option.getAttribute('data-label') || option.textContent?.trim() || '';
	}

	private ensureOptionIds(): void {
		this.getOptions().forEach((option, index) => {
			if (!option.id) {
				option.id = `rui-combobox-option-${this.uid}-${index}`;
			}
		});
	}

	private getAccessibleName(): string {
		const labelElement = this.findAssociatedLabel();
		return labelElement?.textContent?.trim() || this.label || 'Suggestions';
	}

	private isComboboxInput(target: EventTarget | null): target is HTMLInputElement {
		return target instanceof HTMLInputElement && target.hasAttribute('data-combobox-input');
	}

	/** Prefer `RuiLabel` as a previous sibling or Field-managed label. */
	private findAssociatedLabel(): HTMLLabelElement | null {
		const previous = this.previousElementSibling;
		if (previous instanceof HTMLLabelElement) {
			return previous;
		}

		const parent = this.parentElement;
		if (parent) {
			const fieldLabel = parent.querySelector<HTMLLabelElement>('[data-rui-field-label], label.rui-label');
			if (fieldLabel) {
				return fieldLabel;
			}
		}

		return null;
	}

	private syncLabel(): void {
		const input = this.getInput();
		if (!input) {
			return;
		}

		if (input.hasAttribute('data-rui-field-managed')) {
			return;
		}

		const labelElement = this.findAssociatedLabel();
		if (labelElement) {
			if (!labelElement.id) {
				labelElement.id = `rui-combobox-label-${this.uid}`;
			}

			if (!labelElement.htmlFor) {
				labelElement.htmlFor = this.inputId;
			}

			input.setAttribute('aria-labelledby', labelElement.id);
			input.removeAttribute('aria-label');
			return;
		}

		if (this.label) {
			input.setAttribute('aria-label', this.label);
			input.removeAttribute('aria-labelledby');
			return;
		}

		input.removeAttribute('aria-label');
		input.removeAttribute('aria-labelledby');
	}

	private syncTrigger(): void {
		const trigger = this.getTrigger();
		const listbox = this.getListbox();
		if (!trigger || !listbox) {
			return;
		}

		trigger.setAttribute('aria-expanded', String(this.open));
		trigger.setAttribute('aria-controls', listbox.id || this.listboxId);
		trigger.tabIndex = -1;

		if (this.disabled) {
			trigger.disabled = true;
		}
	}

	private syncInput(): void {
		const input = this.getInput();
		const listbox = this.getListbox();
		if (!input || !listbox) {
			return;
		}

		if (!input.id) {
			input.id = this.inputId;
		}

		if (!listbox.id) {
			listbox.id = this.listboxId;
		}

		input.setAttribute('role', 'combobox');
		input.setAttribute('aria-haspopup', 'listbox');
		input.setAttribute('aria-autocomplete', 'list');
		input.setAttribute('aria-expanded', String(this.open));
		input.setAttribute('aria-controls', this.listboxId);
		listbox.setAttribute('role', 'listbox');
		listbox.setAttribute('aria-label', this.getAccessibleName());

		if (this.placeholder && !input.placeholder) {
			input.placeholder = this.placeholder;
		}

		if (this.disabled) {
			input.disabled = true;
		}

		this.syncTrigger();
	}

	private clearActiveOption(): void {
		this.activeIndex = -1;
		this.listboxHasVisualFocus = false;

		const input = this.getInput();
		input?.removeAttribute('aria-activedescendant');

		for (const option of this.getOptions()) {
			option.removeAttribute('data-active');
			option.removeAttribute('aria-selected');
		}
	}

	private setActiveOption(index: number): void {
		const visible = this.getVisibleOptions();
		if (index < 0 || index >= visible.length) {
			this.clearActiveOption();
			return;
		}

		this.activeIndex = index;
		this.listboxHasVisualFocus = true;

		for (const option of this.getOptions()) {
			option.removeAttribute('data-active');
			option.removeAttribute('aria-selected');
		}

		const active = visible[index];
		const input = this.getInput();
		if (!active || !input) {
			return;
		}

		if (!active.id) {
			active.id = `rui-combobox-option-${this.uid}-${index}`;
		}

		active.setAttribute('data-active', 'true');
		active.setAttribute('aria-selected', 'true');
		input.setAttribute('aria-activedescendant', active.id);
		active.scrollIntoView({ block: 'nearest' });
	}

	private setVisualFocusCombobox(): void {
		this.clearActiveOption();
	}

	private setOpen(next: boolean, options: { activate?: 'first' | 'last' | 'none' } = {}): void {
		const activate = options.activate ?? 'none';
		this.open = next;
		const input = this.getInput();
		const listbox = this.getListbox();
		if (!input || !listbox) {
			return;
		}

		input.setAttribute('aria-expanded', String(next));
		listbox.hidden = !next;
		this.syncTrigger();

		if (!next) {
			this.clearActiveOption();
			return;
		}

		this.ensureOptionIds();

		if (activate === 'first') {
			const visible = this.getVisibleOptions();
			this.setActiveOption(visible.length ? 0 : -1);
			return;
		}

		if (activate === 'last') {
			const visible = this.getVisibleOptions();
			this.setActiveOption(visible.length ? visible.length - 1 : -1);
			return;
		}

		// Manual selection: popup can open without moving visual focus into it.
		this.clearActiveOption();
	}

	private filterOptions(query: string): void {
		const q = query.trim().toLowerCase();
		for (const option of this.getOptions()) {
			const text = this.getOptionLabel(option).toLowerCase();
			option.hidden = q !== '' && !text.startsWith(q);
		}
	}

	private select(option: HTMLElement): void {
		if (option.getAttribute('aria-disabled') === 'true') {
			return;
		}

		const value = option.getAttribute('data-value') || this.getOptionLabel(option);
		const label = this.getOptionLabel(option) || value;
		this.value = value;

		const input = this.getInput();
		if (input) {
			input.value = label;
		}

		this.changeEvent.emit({ value });
		this.skipNextFocusOpen = true;
		this.setOpen(false);
		input?.focus();
	}

	private syncFromValue(): void {
		const input = this.getInput();
		if (!input) {
			return;
		}

		const match = this.getOptions().find((option) => option.getAttribute('data-value') === this.value);
		const label = match ? this.getOptionLabel(match) : this.value || '';
		input.value = label;
	}

	private initialize(): void {
		this.ensureOptionIds();
		this.syncLabel();
		this.syncInput();
		this.syncFromValue();
		this.setOpen(false);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.initialize());
	}

	@onUpdated(['value', 'label', 'placeholder', 'disabled', 'openOnFocus'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.syncFromValue();
	}

	@onEvent({ ref: 'root', type: 'focusin' })
	onRootFocusIn(event: FocusEvent): void {
		if (!this.isComboboxInput(event.target)) {
			return;
		}

		if (this.skipNextFocusOpen) {
			this.skipNextFocusOpen = false;
			return;
		}

		if (!this.openOnFocus) {
			return;
		}

		this.filterOptions(this.getInput()?.value ?? '');
		this.setOpen(true);
		this.setVisualFocusCombobox();
	}

	@onEvent({ ref: 'root', type: 'input' })
	onRootInput(event: Event): void {
		if (!this.isComboboxInput(event.target)) {
			return;
		}

		const input = event.target;
		this.filterOptions(input.value);
		if (input.value.trim() !== '' && this.getVisibleOptions().length) {
			this.setOpen(true);
		} else if (input.value.trim() === '' && this.openOnFocus) {
			this.setOpen(true);
		} else if (input.value.trim() === '' || !this.getVisibleOptions().length) {
			this.setOpen(false);
		}

		// Typing returns visual focus to the textbox.
		this.setVisualFocusCombobox();
	}

	@onEvent({ ref: 'root', type: 'keydown', options: { capture: true } })
	onRootKeydown(event: KeyboardEvent): void {
		if (!this.isComboboxInput(event.target)) {
			return;
		}

		this.handleInputKeydown(event);
	}

	private handleInputKeydown(event: KeyboardEvent): void {
		if (event.ctrlKey || event.shiftKey || event.metaKey) {
			return;
		}

		const altKey = event.altKey;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();

			if (altKey) {
				if (!this.open) {
					this.filterOptions(this.getInput()?.value ?? '');
					this.setOpen(true);
				}
				return;
			}

			this.filterOptions(this.getInput()?.value ?? '');
			if (!this.getVisibleOptions().length) {
				// Show all options when the current filter has no matches.
				this.filterOptions('');
			}
			const visible = this.getVisibleOptions();
			if (!visible.length) {
				return;
			}

			if (!this.open) {
				this.setOpen(true, { activate: 'first' });
				return;
			}

			if (this.listboxHasVisualFocus) {
				const next = this.activeIndex >= visible.length - 1 ? 0 : this.activeIndex + 1;
				this.setActiveOption(next);
				return;
			}

			// First ArrowDown while open: jump visual focus into the listbox.
			this.setActiveOption(0);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();

			if (altKey) {
				if (this.open) {
					this.setOpen(false);
				}
				return;
			}

			this.filterOptions(this.getInput()?.value ?? '');
			let visible = this.getVisibleOptions();
			if (!visible.length) {
				this.filterOptions('');
				visible = this.getVisibleOptions();
			}
			if (!visible.length) {
				return;
			}

			if (!this.open) {
				this.setOpen(true, { activate: 'last' });
				return;
			}

			if (this.listboxHasVisualFocus) {
				const next = this.activeIndex <= 0 ? visible.length - 1 : this.activeIndex - 1;
				this.setActiveOption(next);
				return;
			}

			this.setActiveOption(visible.length - 1);
			return;
		}

		if (event.key === 'Home') {
			const input = this.getInput();
			if (!input) {
				return;
			}
			event.preventDefault();
			input.setSelectionRange(0, 0);
			this.setVisualFocusCombobox();
			return;
		}

		if (event.key === 'End') {
			const input = this.getInput();
			if (!input) {
				return;
			}
			event.preventDefault();
			const length = input.value.length;
			input.setSelectionRange(length, length);
			this.setVisualFocusCombobox();
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			if (this.open) {
				this.setOpen(false);
				return;
			}

			const input = this.getInput();
			if (input && input.value) {
				input.value = '';
				this.value = '';
				this.changeEvent.emit({ value: '' });
				this.filterOptions('');
			}
			return;
		}

		if (event.key === 'Enter') {
			const visible = this.getVisibleOptions();
			if (this.open && this.listboxHasVisualFocus && visible[this.activeIndex]) {
				event.preventDefault();
				this.select(visible[this.activeIndex]);
				return;
			}

			if (this.open) {
				event.preventDefault();
				this.setOpen(false);
			}
			return;
		}

		if (event.key === 'Tab' && this.open) {
			const visible = this.getVisibleOptions();
			if (this.listboxHasVisualFocus && visible[this.activeIndex]) {
				this.select(visible[this.activeIndex]);
				return;
			}
			this.setOpen(false);
		}
	}

	@onEvent({ selector: '[data-combobox-trigger]', type: 'click' })
	onTriggerClick(event: Event): void {
		event.preventDefault();
		const input = this.getInput();
		if (!input || input.disabled) {
			return;
		}

		if (this.open) {
			this.skipNextFocusOpen = true;
			this.setOpen(false);
		} else {
			this.filterOptions(input.value);
			this.setOpen(true);
			this.setVisualFocusCombobox();
		}

		input.focus();
	}

	@onEvent({ selector: '[data-combobox-option]', type: 'pointerover' })
	onOptionPointerOver(event: Event): void {
		if (!this.open) {
			return;
		}

		const option = (event.target as HTMLElement).closest<HTMLElement>('[data-combobox-option]');
		if (!option || option.getAttribute('aria-disabled') === 'true' || option.hidden) {
			return;
		}

		const visible = this.getVisibleOptions();
		const index = visible.indexOf(option);
		if (index >= 0) {
			this.setActiveOption(index);
		}
	}

	@onEvent({ selector: '[data-combobox-option]', type: 'mousedown' })
	onOptionMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ selector: '[data-combobox-option]', type: 'click' })
	onOptionClick(event: Event): void {
		const option = (event.target as HTMLElement).closest<HTMLElement>('[data-combobox-option]');
		if (option) {
			this.select(option);
		}
	}

	@onEvent({ ref: 'root', type: 'focusout' })
	onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget;
		if (next instanceof Node && this.contains(next)) {
			return;
		}

		this.setOpen(false);
	}

	@onEvent({ document: true, type: 'click' })
	onDocumentClick(event: Event): void {
		if (!this.contains(event.target as Node)) {
			this.setOpen(false);
		}
	}

	override render() {
		return (
			<div class="rui-combobox" data-ref="root">
				<slot name="control"></slot>
				<slot name="listbox"></slot>
			</div>
		);
	}
}
