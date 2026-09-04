import { RadiantElement, bindTo, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { uniqueId } from '@/lib/unique-id';
import { findAssociatedLabel, syncFieldLabel } from '../shared/field-label';
import { ListboxHostController } from '../shared/listbox-host-controller';
import { getListboxOptionValue } from '../shared/listbox-option';
import { ListboxPopoverBehavior } from '../shared/listbox-popover-behavior';

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
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiSelect*` view helpers which stamp the same targets.
 *
 * Implements the APG Combobox pattern (select-only variant). DOM focus stays on the
 * trigger button; visual focus moves into the popup via `aria-activedescendant`.
 * Pair with `RuiLabel` (sibling, or via `RuiField`) for the visible name.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — shell for popover anchoring.
 * - `[data-select-trigger]` — combobox surface (a `div`, not a native button).
 *   Host sets `id`, `role="combobox"`, `aria-haspopup="listbox"`,
 *   `aria-autocomplete="none"`, `aria-expanded`, `aria-controls`, `tabIndex`,
 *   and `aria-disabled`. Do not use a `<button>` here: multi-select chips include
 *   remove buttons, and `<button>` in `<button>` aborts HTML parsing.
 * - `[data-select-value]` — selected value inside the trigger. Host sets
 *   `data-placeholder` when empty and may inject `[data-select-placeholder]`.
 * - `[data-select-listbox]` — popup shell. Host toggles `hidden`.
 *
 * Per option (inside embedded listbox):
 * - `[role="option"]` — selection identity; see `rui-listbox`.
 *
 * Optional:
 * - `[data-select-toggle]` — popup toggle beside the trigger. Host sets
 *   `aria-expanded` and `disabled`.
 * - `[data-select-clear]` — clears selection. Host toggles `hidden` and `disabled`.
 * - `[data-autocomplete-input]` — search field inside the listbox. When the popup
 *   is open the host moves `role="combobox"` and related `aria-*` to this input.
 *
 * Do not set `role`, `aria-expanded`, `aria-controls`, or `aria-haspopup` on
 * the trigger — the host owns those. The trigger must be a `div`, not a
 * `<button>`: multi-select chips render remove buttons inside it.
 *
 * Nested hosts:
 * - `rui-listbox` (`embedded`) — options at `[role="option"]`; host drives
 *   `aria-selected` and `aria-multiselectable` on the inner listbox.
 * - `rui-tag-group` inside `[data-select-value]` — multi-select chips; host listens
 *   for `rui-remove` and `[data-tag]` clicks.
 * - `rui-autocomplete` (optional) — filter wrapper inside `[data-select-listbox]`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
 * @element rui-select
 * @attr {string} value - Comma-separated selected values.
 * @attr {string} label - Accessible name when there is no associated `RuiLabel`.
 * @attr {string} placeholder - Shown when nothing is selected.
 * @attr {boolean} disabled - Disable the trigger and popup. Default: `false`.
 * @attr {('single'|'multiple')} selection-mode - Single or multi-select. Default: `single`.
 * @attr {boolean} should-close-on-select - Whether selecting closes the popup (defaults to `true` for single, `false` for multiple).
 * @fires rui-change - Emitted when the selected `value` changes; `detail.value` is comma-separated.
 *
 * @remarks
 * Minimum tree: `[data-ref="root"]` > `[data-select-trigger]` > `[data-select-value]`,
 * sibling `[data-select-listbox]` > `rui-listbox[embedded]` > `[role="option"]`.
 * BEM classes live on the view helpers; the host never queries them.
 */
@customElement('rui-select')
export class RuiSelect extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) placeholder: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-select-trigger]', attr: 'aria-disabled', map: (disabled) => (disabled ? 'true' : undefined) },
		{ selector: '[data-select-trigger]', prop: 'tabIndex', map: (disabled) => (disabled ? -1 : 0) },
		{ selector: '[data-select-toggle]', prop: 'disabled' },
		{ selector: '[data-select-clear]', prop: 'disabled' },
	])
	disabled: boolean;

	@prop({ type: String, attribute: 'selection-mode', defaultValue: 'single' }) selectionMode: RuiSelectSelectionMode;
	@prop({ type: Boolean, attribute: 'should-close-on-select' }) shouldCloseOnSelect: boolean | undefined;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSelectChangeDetail>;

	private open = false;
	private readonly uid = uniqueId('rui-select');
	private readonly collection = new ListboxHostController({
		getRoot: () => this,
		getSelectionMode: () => this.selectionMode,
		getValue: () => this.value,
		setValue: (value) => {
			this.value = value;
		},
		getPopup: () => this.getListboxPopup(),
		tagGroupSelector: '[data-select-value] rui-tag-group',
	});
	private readonly listboxBehavior = new ListboxPopoverBehavior({
		getAnchor: () => this.rootTarget,
		getFloating: () => this.getListboxPopup(),
		getOpen: () => this.open,
		getOptions: () => this.collection.getOptions(),
		getActiveDescendantHost: () => this.getActiveDescendantHost(),
		getOptionIdPrefix: () => `${this.uid}-option`,
	});

	@query({ ref: 'root' }) rootTarget: HTMLElement;

	private get listboxId(): string {
		return `${this.uid}-list`;
	}

	private get triggerId(): string {
		return `${this.uid}-trigger`;
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
		const listbox = this.collection.getListbox();
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

	private hasTagGroup(): boolean {
		return this.collection.getTagGroup() != null;
	}

	private syncTagGroup(): void {
		const valueElement = this.getValueElement();
		this.collection.syncTagGroup();
		if (!valueElement || !this.hasTagGroup()) {
			return;
		}
		this.syncTagGroupPlaceholder(valueElement, this.collection.getSelectedValues().length);
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
		if (!this.collection.removeValue(value)) {
			return;
		}
		this.syncValueDisplay();
		this.collection.syncOptionSelection();
		this.syncTagGroup();
		this.syncClear();
		this.changeEvent.emit({ value: this.value });
	}

	private clearSelection(): void {
		if (!this.collection.clearValues()) return;
		this.syncValueDisplay();
		this.collection.syncOptionSelection();
		this.syncTagGroup();
		this.syncClear();
		this.changeEvent.emit({ value: '' });
		this.getTrigger()?.focus();
	}

	private getTrigger(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-select-trigger]');
	}

	private getToggle(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-select-toggle]');
	}

	private getClear(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-select-clear]');
	}

	private getValueElement(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-select-value]');
	}

	private getListboxPopup(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-select-listbox]');
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
			labelId: `${this.uid}-label`,
		});
	}

	private syncTrigger(): void {
		const trigger = this.getTrigger();
		const listbox = this.collection.getListbox();
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
		this.collection.syncMultiselectable(listbox);

		if (popup) {
			popup.removeAttribute('role');
			popup.removeAttribute('aria-label');
			popup.removeAttribute('aria-multiselectable');
		}

		this.syncToggle();
		this.syncClear();
		this.syncSearchInput();
	}

	private syncClear(): void {
		const clear = this.getClear();
		if (!clear) return;

		clear.hidden = this.collection.getSelectedValues().length === 0;
	}

	private syncToggle(): void {
		const toggle = this.getToggle();
		if (!toggle) {
			return;
		}

		toggle.setAttribute('aria-expanded', String(this.open));
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

		const selected = this.collection.getSelectedValues();
		if (selected.length === 0) {
			valueElement.textContent = '';
			valueElement.toggleAttribute('data-placeholder', true);
			if (this.placeholder) {
				valueElement.textContent = this.placeholder;
			}
			return;
		}

		valueElement.toggleAttribute('data-placeholder', false);
		if (this.isMultiple()) {
			valueElement.textContent = selected.map((value) => this.collection.labelForValue(value)).join(', ');
			return;
		}

		valueElement.textContent = this.collection.labelForValue(selected[0]);
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
		popup.toggleAttribute('hidden', !next);

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
		if (!this.collection.isSelectableOption(option)) {
			return;
		}

		this.collection.toggleValue(getListboxOptionValue(option));
		this.syncValueDisplay();
		this.collection.syncOptionSelection();
		this.syncClear();
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
		this.collection.syncListboxHost();
		this.syncValueDisplay();
		this.collection.syncOptionSelection();
		this.setOpen(false);
	}

	protected override onConnected(): void {
		this.initialize();
	}

	override disconnectedCallback(): void {
		this.listboxBehavior.destroy();
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'label', 'placeholder', 'disabled', 'selectionMode', 'shouldCloseOnSelect'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncTrigger();
		this.collection.syncListboxHost();
		this.syncValueDisplay();
		this.collection.syncOptionSelection();
	}

	@onEvent({ selector: '[data-select-trigger], [data-select-toggle]', type: 'click' })
	onTriggerClick(event: Event): void {
		event.preventDefault();
		const trigger = this.getTrigger();
		if (!trigger || this.disabled) {
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

	@onEvent({
		selector: '[data-select-listbox] [data-autocomplete-input]',
		type: 'keydown',
		options: { capture: true },
	})
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

	@onEvent({ selector: '[data-select-clear]', type: 'click' })
	onClearClick(event: Event): void {
		event.preventDefault();
		event.stopPropagation();
		this.clearSelection();
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

	@onEvent({ selector: '[data-select-listbox] [role="option"]', type: 'mousedown' })
	onOptionMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ selector: '[data-select-listbox] [role="option"]', type: 'click' })
	onOptionClick(event: Event): void {
		const option = this.collection.findOption(event.target);
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
}
