import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { textContains } from '@/lib/text-filter';
import type { RuiAutocomplete } from '../autocomplete/autocomplete.script';
import { findAssociatedLabel, syncFieldLabel } from '../shared/field-label';
import { ListboxPopoverBehavior } from '../shared/listbox-popover-behavior';

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
 * `data-combobox-listbox` (popup shell), and an embedded `RuiListbox`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 * @element rui-combobox
 * @slot control - Input row (`RuiComboboxControl` with input and trigger).
 * @slot listbox - Popup shell (`RuiComboboxListbox`) containing an embedded `RuiListbox`.
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
	private skipNextFocusOpen = false;
	private readonly uid = Math.random().toString(36).slice(2, 9);
	private readonly listboxBehavior = new ListboxPopoverBehavior({
		getAnchor: () => this.rootTarget,
		getFloating: () => this.getListboxPopup(),
		getOpen: () => this.open,
		getOptions: () => this.getOptions(),
		getActiveDescendantHost: () => this.getInput(),
		getOptionIdPrefix: () => `rui-combobox-option-${this.uid}`,
	});

	@query({ ref: 'root' }) rootTarget: HTMLElement;

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

	private getListboxPopup(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-combobox-listbox]');
	}

	private getListbox(): HTMLElement | null {
		const host = this.querySelector('rui-listbox');
		if (host instanceof HTMLElement) {
			return host.querySelector<HTMLElement>('[role="listbox"]') ?? host;
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

	private ensureOptionIds(): void {
		this.listboxBehavior.ensureOptionIds();
	}

	private getAccessibleName(): string {
		const labelElement = findAssociatedLabel(this);
		return labelElement?.textContent?.trim() || this.label || 'Suggestions';
	}

	private isComboboxInput(target: EventTarget | null): target is HTMLInputElement {
		return (
			target instanceof HTMLElement && target.localName === 'input' && target.hasAttribute('data-combobox-input')
		);
	}

	private syncLabel(): void {
		const input = this.getInput();
		syncFieldLabel(this, input, {
			controlId: this.inputId,
			label: this.label,
			labelId: `rui-combobox-label-${this.uid}`,
		});
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
		const popup = this.getListboxPopup();
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
		listbox.setAttribute('aria-label', this.getAccessibleName());

		if (popup) {
			popup.removeAttribute('role');
			popup.removeAttribute('aria-label');
		}

		if (this.placeholder && !input.placeholder) {
			input.placeholder = this.placeholder;
		}

		if (this.disabled) {
			input.disabled = true;
		}

		this.syncTrigger();
	}

	private syncListboxHost(): void {
		const host = this.getListboxHost();
		if (!host) {
			return;
		}

		host.embedded = true;
		host.value = this.value;
	}

	private syncOptionSelection(): void {
		for (const option of this.getOptions()) {
			const optionValue = option.getAttribute('data-value') || this.getOptionLabel(option);
			const isSelected = optionValue === this.value && this.value !== '';
			option.setAttribute('aria-selected', String(isSelected));
		}
	}

	private setVisualFocusCombobox(): void {
		this.listboxBehavior.clearActiveOption();
		this.syncOptionSelection();
	}

	private setOpen(next: boolean, options: { activate?: 'first' | 'last' | 'none' } = {}): void {
		const activate = options.activate ?? 'none';
		this.open = next;
		const input = this.getInput();
		const popup = this.getListboxPopup();
		if (!input || !popup) {
			return;
		}

		input.setAttribute('aria-expanded', String(next));
		popup.hidden = !next;
		this.syncTrigger();

		if (!next) {
			this.listboxBehavior.clearActiveOption();
			this.listboxBehavior.syncPopoverPosition();
			return;
		}

		this.ensureOptionIds();
		this.listboxBehavior.syncPopoverPosition();

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

	private getAutocomplete(): RuiAutocomplete | null {
		return this.querySelector('rui-autocomplete');
	}

	private syncAutocompleteFilter(): void {
		const autocomplete = this.getAutocomplete();
		if (autocomplete) {
			autocomplete.syncFilter();
			return;
		}

		const query = this.getInput()?.value ?? '';
		for (const option of this.getOptions()) {
			const matches = textContains(this.getOptionLabel(option), query, 'base');
			option.hidden = query.trim() !== '' && !matches;
		}
	}

	/** Restores the unfiltered collection when arrow navigation has no match to enter. */
	private showAllOptions(): void {
		for (const option of this.getOptions()) {
			option.hidden = false;
		}
	}

	private syncFilter(): void {
		this.syncAutocompleteFilter();
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
		this.syncOptionSelection();
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
		this.syncListboxHost();
		this.syncFromValue();
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

	@onUpdated(['value', 'label', 'placeholder', 'disabled', 'openOnFocus'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.syncListboxHost();
		this.syncFromValue();
		this.syncOptionSelection();
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

		this.syncFilter();
		this.setOpen(true);
		this.setVisualFocusCombobox();
	}

	@onEvent({ ref: 'root', type: 'input' })
	onRootInput(event: Event): void {
		if (!this.isComboboxInput(event.target)) {
			return;
		}

		const input = event.target;
		this.syncFilter();
		if (input.value.trim() !== '' && this.listboxBehavior.getVisibleOptions().length) {
			this.setOpen(true);
		} else if (input.value.trim() === '' && this.openOnFocus) {
			this.setOpen(true);
		} else if (input.value.trim() === '' || !this.listboxBehavior.getVisibleOptions().length) {
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

		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			this.syncFilter();
			if (!this.listboxBehavior.getVisibleOptions().length) {
				this.showAllOptions();
			}
		}

		this.listboxBehavior.handleKeydown(event, {
			isOpen: this.open,
			canUseSpace: false,
			closesOnTab: true,
			enterWhenClosed: 'ignore',
			enterWithoutActive: 'close',
			onOpen: (activation = 'none') => {
				this.syncFilter();
				this.setOpen(true, { activate: activation });
			},
			onClose: () => this.setOpen(false),
			onSelectActive: () => {
				const option = this.listboxBehavior.getVisibleOptions()[this.listboxBehavior.activeOptionIndex];
				if (option) {
					this.select(option);
				}
			},
			onEscapeWhenClosed: () => {
				const input = this.getInput();
				if (input && input.value) {
					input.value = '';
					this.value = '';
					this.changeEvent.emit({ value: '' });
					this.syncFilter();
				}
			},
		});
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
			this.syncFilter();
			this.setOpen(true);
			this.setVisualFocusCombobox();
		}

		input.focus();
	}

	@onEvent({ selector: '[data-combobox-listbox] [role="option"]', type: 'pointerover' })
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

	@onEvent({ selector: '[data-combobox-listbox] [role="option"]', type: 'mousedown' })
	onOptionMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ selector: '[data-combobox-listbox] [role="option"]', type: 'click' })
	onOptionClick(event: Event): void {
		const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
		if (option) {
			this.select(option);
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
			<div class="rui-combobox" data-ref="root">
				<slot name="control"></slot>
				<slot name="listbox"></slot>
			</div>
		);
	}
}
