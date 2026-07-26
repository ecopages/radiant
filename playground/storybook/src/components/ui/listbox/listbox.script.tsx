import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { navigateRovingTabindex } from '../../../lib/roving-tabindex';

export type RuiListboxProps = {
	value?: string;
	label?: string;
	disabled?: boolean;
};

export type RuiListboxChangeDetail = { value: string };

/**
 * `<rui-listbox>` — a list of options where one may be selected.
 *
 * Implements the APG Listbox pattern with roving tabindex on `[role="option"]`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 * @element rui-listbox
 * @fires rui-change
 */
@customElement('rui-listbox')
export class RuiListbox extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiListboxChangeDetail>;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.sync());
	}

	@onUpdated(['value', 'disabled'])
	onPropsUpdated(): void {
		this.sync();
	}

	private getOptions(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="option"]'));
	}

	private sync(): void {
		const options = this.getOptions();
		for (const option of options) {
			const selected = option.getAttribute('data-value') === this.value;
			option.setAttribute('aria-selected', String(selected));
			option.tabIndex = selected || (!this.value && option === options[0]) ? 0 : -1;
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
		const option = (event.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
		if (option && this.contains(option)) this.select(option);
	}

	@onEvent({ selector: '[role="option"]', type: 'keydown' })
	onOptionKeydown(event: KeyboardEvent): void {
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

	override render() {
		return (
			<div
				class="rui-listbox"
				role="listbox"
				data-rui-control
				data-rui-control-type="text"
				aria-label={this.label || undefined}
				aria-disabled={this.disabled ? 'true' : undefined}
			>
				<slot></slot>
			</div>
		);
	}
}
