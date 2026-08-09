import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { navigateRovingTabindex } from '@/lib/roving-tabindex';

export type RuiListboxProps = {
	value?: string;
	label?: string;
	disabled?: boolean;
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

type RuiListboxBindings = {
	label: string;
	disabled: boolean;
};

/**
 * `<rui-listbox>` — a list of options where one may be selected.
 *
 * Implements the APG Listbox pattern with roving tabindex on `[role="option"]`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *
 * @element rui-listbox
 *
 * @attr {string} value - Selected option value. Default: `''`.
 * @attr {string} label - Accessible name for the list. Default: `''`.
 * @attr {boolean} disabled - Disable all selection. Default: `false`.
 * @attr {boolean} embedded - Parent-owned listbox: border chrome omitted, selection handled by the parent. Default: `false`.
 * @attr {boolean} bordered - Override the border (`true` standalone, `false` embedded). Default: follows `embedded`.
 *
 * @slot - Option elements (`RuiListboxOption`), each with `role="option"`.
 *
 * @fires rui-change - Emitted when an option is selected; detail carries `value`.
 *
 * @cssclass rui-listbox - Scrollable option list surface (`role="listbox"`).
 * @cssclass rui-listbox--bordered - Bordered standalone listbox.
 */
@customElement('rui-listbox')
export class RuiListbox extends RadiantElement<RuiListboxBindings> {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) embedded: boolean;
	@prop({ type: Boolean, reflect: true }) bordered: boolean | undefined;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiListboxChangeDetail>;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);
	private readonly resolvedAriaDisabled = this.$.disabled.map((disabled) => (disabled ? 'true' : undefined));

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.sync();
			this.syncPresentation();
		});
	}

	@onUpdated(['value', 'disabled', 'embedded', 'bordered'])
	onPropsUpdated(): void {
		this.sync();
		this.syncPresentation();
	}

	private getOptions(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="option"]'));
	}

	private sync(): void {
		const options = this.getOptions();
		for (const option of options) {
			const selected = option.getAttribute('data-value') === this.value;
			option.setAttribute('aria-selected', String(selected));
			option.tabIndex = this.embedded ? -1 : selected || (!this.value && option === options[0]) ? 0 : -1;
		}
	}

	private select(option: HTMLElement): void {
		if (this.disabled || option.getAttribute('aria-disabled') === 'true') return;
		this.value = option.getAttribute('data-value') || option.textContent?.trim() || '';
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
		this.select(result.item);
	}

	private isBordered(): boolean {
		if (this.bordered != null) {
			return this.bordered;
		}

		return !this.embedded;
	}

	private syncPresentation(): void {
		const root = this.querySelector<HTMLElement>('.rui-listbox');
		if (!root) {
			return;
		}

		root.classList.toggle('rui-listbox--bordered', this.isBordered());
	}

	override render() {
		const bordered = this.isBordered();

		return (
			<div
				class={`rui-listbox${bordered ? ' rui-listbox--bordered' : ''}`}
				role="listbox"
				data-rui-control
				data-rui-control-type="text"
				aria-label={this.resolvedAriaLabel}
				aria-disabled={this.resolvedAriaDisabled}
			>
				<slot></slot>
			</div>
		);
	}
}
