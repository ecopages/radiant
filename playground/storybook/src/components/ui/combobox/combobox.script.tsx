import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiComboboxProps = {
	value?: string;
	/** Accessible name when there is no visible label element. */
	label?: string;
	placeholder?: string;
	disabled?: boolean;
};

export type RuiComboboxChangeDetail = { value: string };

/**
 * `<rui-combobox>` — a composition-first combobox with a listbox popup.
 *
 * Implements the APG Combobox pattern (list autocomplete, manual selection).
 * DOM focus stays on the combobox input; the active option is tracked with
 * `aria-activedescendant`.
 *
 * Compose with `data-combobox-input`, optional `data-combobox-trigger`,
 * `data-combobox-listbox`, and `data-combobox-option` (see view helpers).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * @element rui-combobox
 * @slot label - Visible label (`RuiComboboxLabel`).
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

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiComboboxChangeDetail>;

	private open = false;
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
		return this.querySelector<HTMLInputElement>('[data-combobox-input], [role="combobox"]');
	}

	private getListbox(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-combobox-listbox], [role="listbox"]');
	}

	private getOptions(): HTMLElement[] {
		const listbox = this.getListbox();
		if (!listbox) {
			return [];
		}

		return Array.from(listbox.querySelectorAll<HTMLElement>('[data-combobox-option], [role="option"]'));
	}

	private getVisibleOptions(): HTMLElement[] {
		return this.getOptions().filter((option) => !option.hidden);
	}

	private ensureOptionIds(): void {
		this.getOptions().forEach((option, index) => {
			if (!option.id) {
				option.id = `rui-combobox-option-${this.uid}-${index}`;
			}
		});
	}

	private syncLabel(): void {
		const input = this.getInput();
		if (!input) {
			return;
		}

		const labelElement = this.querySelector<HTMLElement>('[data-combobox-label]');
		if (labelElement) {
			if (!labelElement.id) {
				labelElement.id = `rui-combobox-label-${this.uid}`;
			}

			if (labelElement instanceof HTMLLabelElement && !labelElement.htmlFor) {
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

		if (this.placeholder && !input.placeholder) {
			input.placeholder = this.placeholder;
		}

		if (this.disabled) {
			input.disabled = true;
		}
	}

	private setActiveOption(index: number): void {
		const visible = this.getVisibleOptions();
		this.activeIndex = index;

		for (const option of this.getOptions()) {
			option.removeAttribute('data-active');
			option.setAttribute('aria-selected', 'false');
		}

		const active = visible[index];
		const input = this.getInput();
		if (active && input) {
			active.setAttribute('data-active', 'true');
			active.setAttribute('aria-selected', 'true');
			input.setAttribute('aria-activedescendant', active.id);
			return;
		}

		input?.removeAttribute('aria-activedescendant');
	}

	private setOpen(next: boolean): void {
		this.open = next;
		const input = this.getInput();
		const listbox = this.getListbox();
		if (!input || !listbox) {
			return;
		}

		input.setAttribute('aria-expanded', String(next));
		listbox.hidden = !next;

		if (next) {
			this.ensureOptionIds();
			const visible = this.getVisibleOptions();
			const selectedIndex = visible.findIndex((option) => option.getAttribute('data-value') === this.value);
			this.setActiveOption(selectedIndex >= 0 ? selectedIndex : visible.length ? 0 : -1);
			return;
		}

		this.activeIndex = -1;
		input.removeAttribute('aria-activedescendant');
		for (const option of this.getOptions()) {
			option.removeAttribute('data-active');
			option.setAttribute('aria-selected', 'false');
		}
	}

	private filterOptions(query: string): void {
		const q = query.trim().toLowerCase();
		for (const option of this.getOptions()) {
			const text = (option.getAttribute('data-label') || option.textContent || '').toLowerCase();
			option.hidden = q !== '' && !text.includes(q);
		}

		const visible = this.getVisibleOptions();
		this.setActiveOption(visible.length ? 0 : -1);
	}

	private select(option: HTMLElement): void {
		const value = option.getAttribute('data-value') || option.textContent?.trim() || '';
		const label = option.getAttribute('data-label') || option.textContent?.trim() || value;
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
		const label = match?.getAttribute('data-label') || match?.textContent?.trim() || this.value || '';
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

	@onUpdated(['value', 'label', 'placeholder', 'disabled'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.syncFromValue();
	}

	@onEvent({ selector: '[data-combobox-input], [role="combobox"]', type: 'focusin' })
	onInputFocus(): void {
		if (this.skipNextFocusOpen) {
			this.skipNextFocusOpen = false;
			return;
		}

		this.setOpen(true);
		this.filterOptions(this.getInput()?.value ?? '');
	}

	@onEvent({ selector: '[data-combobox-input], [role="combobox"]', type: 'input' })
	onInput(): void {
		const input = this.getInput();
		if (!input) {
			return;
		}

		this.setOpen(true);
		this.filterOptions(input.value);
	}

	@onEvent({ selector: '[data-combobox-input], [role="combobox"]', type: 'keydown' })
	onInputKeydown(event: KeyboardEvent): void {
		const visible = this.getVisibleOptions();

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!this.open) {
				this.setOpen(true);
				this.filterOptions(this.getInput()?.value ?? '');
				return;
			}

			const next = this.activeIndex >= 0 ? Math.min(visible.length - 1, this.activeIndex + 1) : 0;
			this.setActiveOption(next);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (!this.open) {
				this.setOpen(true);
				this.filterOptions(this.getInput()?.value ?? '');
				return;
			}

			const next = this.activeIndex > 0 ? this.activeIndex - 1 : Math.max(0, visible.length - 1);
			this.setActiveOption(next);
		} else if (event.key === 'Home' && this.open) {
			event.preventDefault();
			this.setActiveOption(0);
		} else if (event.key === 'End' && this.open) {
			event.preventDefault();
			this.setActiveOption(visible.length - 1);
		} else if (event.key === 'Escape') {
			if (this.open) {
				event.preventDefault();
				this.setOpen(false);
			}
		} else if (event.key === 'Enter' && this.open && this.activeIndex >= 0 && visible[this.activeIndex]) {
			event.preventDefault();
			this.select(visible[this.activeIndex]);
		} else if (event.altKey && event.key === 'ArrowDown') {
			event.preventDefault();
			if (!this.open) {
				this.setOpen(true);
				this.filterOptions(this.getInput()?.value ?? '');
			}
		} else if (event.altKey && event.key === 'ArrowUp' && this.open) {
			event.preventDefault();
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
			this.setOpen(true);
			this.filterOptions(input.value);
		}

		input.focus();
	}

	@onEvent({ selector: '[data-combobox-option], [role="option"]', type: 'mousedown' })
	onOptionMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ selector: '[data-combobox-option], [role="option"]', type: 'click' })
	onOptionClick(event: Event): void {
		const option = (event.target as HTMLElement).closest<HTMLElement>('[data-combobox-option], [role="option"]');
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
				<slot name="label"></slot>
				<slot name="control"></slot>
				<slot name="listbox"></slot>
			</div>
		);
	}
}
