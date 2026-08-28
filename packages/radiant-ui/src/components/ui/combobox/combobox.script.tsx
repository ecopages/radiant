import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { textContains } from '@/lib/text-filter';
import type { RuiAutocomplete } from '../autocomplete/autocomplete.script';
import { findAssociatedLabel, syncFieldLabel } from '../shared/field-label';
import { ListboxHostController } from '../shared/listbox-host-controller';
import { getListboxOptionLabel, getListboxOptionValue } from '../shared/listbox-option';
import { ListboxPopoverBehavior } from '../shared/listbox-popover-behavior';

export type RuiComboboxSelectionMode = 'single' | 'multiple';
export type RuiComboboxTriggerKind = 'input' | 'focus' | 'manual';

export type RuiComboboxProps = {
	value?: string;
	/** Accessible name when there is no visible `RuiLabel` associated with the input. */
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	selectionMode?: RuiComboboxSelectionMode;
	/** Whether selecting an option closes the popup; defaults to false for multiple. */
	shouldCloseOnSelect?: boolean;
	/**
	 * Controls what opens the listbox. `input` opens on typing (the default),
	 * `focus` also opens when the input receives focus, and `manual` requires the
	 * trigger button or an arrow key.
	 */
	triggerKind?: RuiComboboxTriggerKind;
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
 *
 * @element rui-combobox
 *
 * @attr {string} value - Selected option value. Default: `''`.
 * @attr {string} label - Accessible name when there is no visible `RuiLabel`. Default: `''`.
 * @attr {string} placeholder - Placeholder text for the input. Default: `''`.
 * @attr {boolean} disabled - Disable the input and trigger. Default: `false`.
 * @attr {('single'|'multiple')} selection-mode - Single or multi-select. Default: `single`.
 * @attr {boolean} should-close-on-select - Whether selection closes the popup. Defaults to `true` for single and `false` for multiple.
 * @attr {('input'|'focus'|'manual')} trigger-kind - Controls what opens the listbox. Default: `input`.
 *
 * @fires rui-change - Emitted when an option is selected; detail carries `value`.
 *
 * @cssclass rui-combobox - Root surface.
 */
@customElement('rui-combobox')
export class RuiCombobox extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) placeholder: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, attribute: 'selection-mode', defaultValue: 'single' })
	selectionMode: RuiComboboxSelectionMode;
	@prop({ type: Boolean, attribute: 'should-close-on-select' }) shouldCloseOnSelect: boolean | undefined;
	@prop({ type: String, attribute: 'trigger-kind', reflect: true, defaultValue: 'input' })
	triggerKind: RuiComboboxTriggerKind;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiComboboxChangeDetail>;

	private open = false;
	private skipNextFocusOpen = false;
	private readonly uid = Math.random().toString(36).slice(2, 9);
	private readonly collection = new ListboxHostController({
		getRoot: () => this,
		getSelectionMode: () => this.selectionMode,
		getValue: () => this.value,
		setValue: (value) => {
			this.value = value;
		},
		getPopup: () => this.getListboxPopup(),
		tagGroupSelector: '[data-combobox-value] rui-tag-group',
	});
	private readonly listboxBehavior = new ListboxPopoverBehavior({
		getAnchor: () => this.rootTarget,
		getFloating: () => this.getListboxPopup(),
		getOpen: () => this.open,
		getOptions: () => this.collection.getOptions(),
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

	private isMultiple(): boolean {
		return this.selectionMode === 'multiple';
	}

	private closesOnSelect(): boolean {
		return this.shouldCloseOnSelect ?? !this.isMultiple();
	}

	private getInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-combobox-input]');
	}

	private getTrigger(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-combobox-trigger]');
	}

	private getClear(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-combobox-clear]');
	}

	private getListboxPopup(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-combobox-listbox]');
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
		const listbox = this.collection.getListbox();
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
		const listbox = this.collection.getListbox();
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
		this.collection.syncMultiselectable(listbox);

		if (popup) {
			popup.removeAttribute('role');
			popup.removeAttribute('aria-label');
		}

		if (this.placeholder) {
			input.placeholder =
				this.isMultiple() && this.collection.getSelectedValues().length ? '' : this.placeholder;
		}

		if (this.disabled) {
			input.disabled = true;
		}

		this.syncClear();
		this.syncTrigger();
	}

	private syncClear(): void {
		const clear = this.getClear();
		if (!clear) return;

		clear.hidden = this.collection.getSelectedValues().length === 0 && !(this.getInput()?.value ?? '');
		clear.disabled = this.disabled;
	}

	private setVisualFocusCombobox(): void {
		this.listboxBehavior.clearActiveOption();
		this.collection.syncOptionSelection();
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
		popup.toggleAttribute('hidden', !next);
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
		for (const option of this.collection.getOptions()) {
			const matches = textContains(getListboxOptionLabel(option), query, 'base');
			option.hidden = query.trim() !== '' && !matches;
		}
	}

	/** Restores the unfiltered collection when arrow navigation has no match to enter. */
	private showAllOptions(): void {
		for (const option of this.collection.getOptions()) {
			option.hidden = false;
		}
	}

	private syncFilter(): void {
		this.syncAutocompleteFilter();
	}

	private select(option: HTMLElement): void {
		if (!this.collection.isSelectableOption(option)) {
			return;
		}

		const value = getListboxOptionValue(option);
		const label = getListboxOptionLabel(option) || value;
		this.collection.toggleValue(value);

		const input = this.getInput();
		if (input) {
			input.value = this.isMultiple() ? '' : label;
		}

		this.collection.syncTagGroup();
		this.syncInput();
		this.collection.syncOptionSelection();
		this.changeEvent.emit({ value: this.value });
		if (this.closesOnSelect()) {
			this.skipNextFocusOpen = true;
			this.setOpen(false);
		}
		this.syncFilter();
		input?.focus();
	}

	private syncFromValue(): void {
		const input = this.getInput();
		if (!input) {
			return;
		}

		if (this.isMultiple()) {
			input.value = '';
			return;
		}
		const selected = this.collection.getSelectedValues()[0] ?? '';
		input.value = selected ? this.collection.labelForValue(selected) : '';
	}

	private removeSelectedValue(value: string): void {
		if (!this.collection.removeValue(value)) return;
		this.collection.syncTagGroup();
		this.syncInput();
		this.collection.syncOptionSelection();
		this.changeEvent.emit({ value: this.value });
		this.getInput()?.focus();
	}

	private clearSelection(): void {
		const input = this.getInput();
		const hadValue = this.value !== '';
		const hadInput = Boolean(input?.value);
		this.collection.clearValues();
		if (input) input.value = '';
		this.syncFilter();
		this.syncInput();
		this.collection.syncTagGroup();
		this.collection.syncOptionSelection();
		if (hadValue) this.changeEvent.emit({ value: '' });
		if (hadInput || hadValue) input?.focus();
	}

	private initialize(): void {
		this.ensureOptionIds();
		this.syncLabel();
		this.syncInput();
		this.collection.syncListboxHost();
		this.syncFromValue();
		this.collection.syncOptionSelection();
		this.collection.syncTagGroup();
		this.setOpen(false);
	}

	protected override onConnected(): void {
		this.initialize();
	}

	override disconnectedCallback(): void {
		this.listboxBehavior.destroy();
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'label', 'placeholder', 'disabled', 'triggerKind', 'selectionMode', 'shouldCloseOnSelect'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.collection.syncListboxHost();
		this.syncFromValue();
		this.collection.syncOptionSelection();
		this.collection.syncTagGroup();
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

		if (this.triggerKind !== 'focus') {
			return;
		}

		this.syncFilter();
		this.setOpen(true);
		this.setVisualFocusCombobox();
	}

	/** @remarks Typing returns visual focus to the textbox. */
	@onEvent({ ref: 'root', type: 'input' })
	onRootInput(event: Event): void {
		if (!this.isComboboxInput(event.target)) {
			return;
		}

		const input = event.target;
		this.syncFilter();
		const hasQuery = input.value.trim() !== '';
		const hasVisibleOptions = this.listboxBehavior.getVisibleOptions().length > 0;
		if (hasQuery && hasVisibleOptions && (this.open || this.triggerKind !== 'manual')) {
			this.setOpen(true);
		} else if (!hasQuery && this.triggerKind === 'focus') {
			this.setOpen(true);
		} else if (!hasQuery || !hasVisibleOptions) {
			this.setOpen(false);
		}

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

		const option = this.collection.findOption(event.target);
		if (!this.collection.isSelectableOption(option)) {
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
		const option = this.collection.findOption(event.target);
		if (option) {
			this.select(option);
		}
	}

	@onEvent({ selector: '[data-combobox-value] rui-tag-group', type: 'rui-remove' })
	onTagRemove(event: Event): void {
		const detail = (event as CustomEvent<{ value?: string }>).detail;
		if (detail?.value) this.removeSelectedValue(detail.value);
	}

	@onEvent({ selector: '[data-combobox-clear]', type: 'click' })
	onClearClick(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.clearSelection();
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
}
