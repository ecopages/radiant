import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { event } from '@ecopages/radiant/decorators/event';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiSpinbuttonProps = {
	value?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	label?: string;
	name?: string;
};

export type RuiSpinbuttonChangeDetail = { value: number };

/**
 * `<rui-spinbutton>` — an input restricted to a discrete numeric range.
 *
 * Implements the APG Spinbutton pattern with `role="spinbutton"` on a native
 * number-like text field, plus decrement/increment buttons.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
 *
 * @element rui-spinbutton
 * @slot decrease - Optional custom decrease control. Use `data-spinbutton-action="decrease"`.
 * @slot increase - Optional custom increase control. Use `data-spinbutton-action="increase"`.
 * @fires rui-change
 */
@customElement('rui-spinbutton')
export class RuiSpinbutton extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: Number, defaultValue: 1 }) step: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) name: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSpinbuttonChangeDetail>;

	private syncSlottedStepperControls(): void {
		const decreaseDisabled = this.isDecreaseDisabled();
		const increaseDisabled = this.isIncreaseDisabled();

		for (const button of this.querySelectorAll<HTMLButtonElement>('[slot][data-spinbutton-action="decrease"]')) {
			button.disabled = decreaseDisabled;
		}

		for (const button of this.querySelectorAll<HTMLButtonElement>('[slot][data-spinbutton-action="increase"]')) {
			button.disabled = increaseDisabled;
		}
	}

	private isDecreaseDisabled(): boolean {
		return this.disabled || this.value <= this.min;
	}

	private isIncreaseDisabled(): boolean {
		return this.disabled || this.value >= this.max;
	}

	private clamp(next: number): number {
		const stepped = Math.round(next / this.step) * this.step;
		return Math.min(this.max, Math.max(this.min, stepped));
	}

	private setValue(next: number): void {
		const value = this.clamp(next);
		if (value === this.value) {
			return;
		}

		this.value = value;
		this.changeEvent.emit({ value });
	}

	@onEvent({ selector: '[data-spinbutton-action="decrease"]', type: 'click' })
	decrement(): void {
		if (this.isDecreaseDisabled()) {
			return;
		}

		this.setValue(this.value - this.step);
	}

	@onEvent({ selector: '[data-spinbutton-action="increase"]', type: 'click' })
	increment(): void {
		if (this.isIncreaseDisabled()) {
			return;
		}

		this.setValue(this.value + this.step);
	}

	@onEvent({ ref: 'input', type: 'change' })
	onChange(event: Event): void {
		const input = event.target as HTMLInputElement;
		const parsed = Number(input.value);
		this.setValue(Number.isFinite(parsed) ? parsed : this.value);
		input.value = String(this.value);
	}

	@onEvent({ ref: 'input', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		if (this.disabled) {
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.increment();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.decrement();
		} else if (event.key === 'Home') {
			event.preventDefault();
			this.setValue(this.min);
		} else if (event.key === 'End') {
			event.preventDefault();
			this.setValue(this.max);
		}
	}

	override render() {
		const decreaseDisabled = this.isDecreaseDisabled();
		const increaseDisabled = this.isIncreaseDisabled();

		queueMicrotask(() => this.syncSlottedStepperControls());

		return (
			<div class="rui-spinbutton">
				{this.label ? (
					<span class="rui-spinbutton__label" id={`${this.id || 'spin'}-label`}>
						{this.label}
					</span>
				) : null}
				<div class="rui-spinbutton__control">
					<slot name="decrease">
						<button
							type="button"
							class="rui-button rui-button--outline rui-button--sm"
							data-spinbutton-action="decrease"
							aria-label="Decrease"
							disabled={decreaseDisabled}
						>
							−
						</button>
					</slot>
					<input
						type="text"
						inputmode="numeric"
						data-ref="input"
						data-rui-control
						data-rui-control-type="number"
						class="rui-spinbutton__input"
						role="spinbutton"
						value={String(this.value)}
						disabled={this.disabled}
						name={this.name || undefined}
						aria-valuemin={this.min}
						aria-valuemax={this.max}
						aria-valuenow={this.value}
						aria-label={this.label || undefined}
					/>
					<slot name="increase">
						<button
							type="button"
							class="rui-button rui-button--outline rui-button--sm"
							data-spinbutton-action="increase"
							aria-label="Increase"
							disabled={increaseDisabled}
						>
							+
						</button>
					</slot>
				</div>
			</div>
		);
	}
}
