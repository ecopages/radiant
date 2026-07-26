import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiSliderVariant = 'single' | 'range';

export type RuiSliderProps = {
	variant?: RuiSliderVariant;
	value?: number;
	rangeMin?: number;
	rangeMax?: number;
	min?: number;
	max?: number;
	step?: number;
	minDistance?: number;
	disabled?: boolean;
	label?: string;
	name?: string;
};

export type RuiSliderChangeDetail = { value: number } | { values: [number, number] };

type RuiSliderBindings = {
	disabled: boolean;
	name: string;
	label: string;
};

/**
 * `<rui-slider>` — select a value from a continuous or discrete range.
 *
 * Single mode uses native `<input type="range">`. Range mode implements the APG
 * multi-thumb slider pattern with two `role="slider"` thumbs on one track.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/slider/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/
 *
 * @element rui-slider
 * @fires rui-change
 */
@customElement('rui-slider')
export class RuiSlider extends RadiantElement<RuiSliderBindings> {
	@prop({ type: String, defaultValue: 'single' }) variant: RuiSliderVariant;
	@prop({ type: Number, reflect: true, defaultValue: 50 }) value: number;
	@prop({ type: Number, reflect: true, attribute: 'range-min', defaultValue: 25 }) rangeMin: number;
	@prop({ type: Number, reflect: true, attribute: 'range-max', defaultValue: 75 }) rangeMax: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: Number, defaultValue: 1 }) step: number;
	@prop({ type: Number, defaultValue: 0 }) minDistance: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) name: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSliderChangeDetail>;

	@query({ ref: 'input' }) inputTarget: HTMLInputElement;
	@query({ ref: 'value' }) valueTarget: HTMLElement;
	@query({ ref: 'rangeMinThumb' }) rangeMinThumb: HTMLElement;
	@query({ ref: 'rangeMaxThumb' }) rangeMaxThumb: HTMLElement;
	@query({ ref: 'rangeFill' }) rangeFill: HTMLElement;

	private interacting = false;
	private activeThumb: 'min' | 'max' | null = null;
	/** Live range while dragging — avoids reactive prop updates that re-render mid-drag. */
	private pendingRange: [number, number] | null = null;

	/**
	 * Only disabled/tabindex/aria-label/name are bound below — none of them
	 * change during a drag. The value text and every aria-value* attribute
	 * stay plain reads + imperative writes (paintRangeUi/updateDisplayedValue)
	 * deliberately: they must show the LIVE pointer position while dragging,
	 * before pendingRange commits to the reactive value/rangeMin/rangeMax
	 * props. A binding only reacts to committed prop changes, so it cannot
	 * replace that live-preview write without losing drag feedback — this
	 * isn't a caution-driven exception, it's the correct tool for the job.
	 */
	private readonly resolvedDisabledTabindex = this.$.disabled.map((disabled) => (disabled ? -1 : 0));
	private readonly resolvedMinLabel = this.$.label.map((label) => (label ? `${label} minimum` : 'Minimum value'));
	private readonly resolvedMaxLabel = this.$.label.map((label) => (label ? `${label} maximum` : 'Maximum value'));
	private readonly resolvedName = this.$.name.map((name) => name || undefined);

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			if (this.variant === 'single') {
				this.syncInputFromValue();
			} else {
				this.syncRangeUi();
			}
		});
	}

	@onUpdated(['value', 'min', 'max', 'step', 'variant'])
	onSinglePropsUpdated(): void {
		if (this.variant !== 'single' || this.interacting) {
			return;
		}

		this.syncInputFromValue();
	}

	@onUpdated(['rangeMin', 'rangeMax', 'min', 'max', 'step', 'minDistance', 'variant'])
	onRangePropsUpdated(): void {
		if (this.variant !== 'range' || this.activeThumb) {
			return;
		}

		this.syncRangeUi();
	}

	private clamp(next: number): number {
		const stepped = Math.round(next / this.step) * this.step;
		return Math.min(this.max, Math.max(this.min, stepped));
	}

	private normalizeRange(low = this.rangeMin, high = this.rangeMax): [number, number] {
		let nextLow = this.clamp(low);
		let nextHigh = this.clamp(high);

		if (nextLow > nextHigh) {
			[nextLow, nextHigh] = [nextHigh, nextLow];
		}

		if (nextHigh - nextLow < this.minDistance) {
			if (this.activeThumb === 'min') {
				nextLow = this.clamp(nextHigh - this.minDistance);
			} else {
				nextHigh = this.clamp(nextLow + this.minDistance);
			}
		}

		return [nextLow, nextHigh];
	}

	private getActiveRange(): [number, number] {
		return this.normalizeRange(...(this.pendingRange ?? [this.rangeMin, this.rangeMax]));
	}

	private percentFor(value: number): number {
		if (this.max === this.min) {
			return 0;
		}

		return ((value - this.min) / (this.max - this.min)) * 100;
	}

	private valueFromPointer(clientX: number, track: HTMLElement): number {
		const rect = track.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
		return this.clamp(this.min + ratio * (this.max - this.min));
	}

	private syncInputFromValue(): void {
		const input = this.inputTarget;
		if (!input) {
			return;
		}

		const nextValue = String(this.value);
		if (input.value !== nextValue) {
			input.value = nextValue;
		}

		input.min = String(this.min);
		input.max = String(this.max);
		input.step = String(this.step);
		this.updateDisplayedValue(this.value);
	}

	private updateDisplayedValue(next: number): void {
		if (this.valueTarget) {
			this.valueTarget.textContent = String(next);
		}

		if (this.inputTarget) {
			this.inputTarget.setAttribute('aria-valuenow', String(next));
		}
	}

	private syncRangeUi(): void {
		const [low, high] = this.getActiveRange();

		if (!this.activeThumb) {
			if (low !== this.rangeMin) {
				this.rangeMin = low;
			}
			if (high !== this.rangeMax) {
				this.rangeMax = high;
			}
		}

		this.paintRangeUi(low, high);
	}

	private paintRangeUi(low: number, high: number): void {
		const lowPercent = this.percentFor(low);
		const highPercent = this.percentFor(high);
		const track = this.querySelector<HTMLElement>('.rui-slider__range-track');

		if (track) {
			track.style.setProperty('--rui-slider-min', `${lowPercent}%`);
			track.style.setProperty('--rui-slider-max', `${highPercent}%`);
		}

		if (this.rangeMinThumb) {
			this.rangeMinThumb.setAttribute('aria-valuemin', String(this.min));
			this.rangeMinThumb.setAttribute('aria-valuemax', String(high));
			this.rangeMinThumb.setAttribute('aria-valuenow', String(low));
		}

		if (this.rangeMaxThumb) {
			this.rangeMaxThumb.setAttribute('aria-valuemin', String(low));
			this.rangeMaxThumb.setAttribute('aria-valuemax', String(this.max));
			this.rangeMaxThumb.setAttribute('aria-valuenow', String(high));
		}

		if (this.rangeFill) {
			this.rangeFill.style.left = `${lowPercent}%`;
			this.rangeFill.style.width = `${highPercent - lowPercent}%`;
		}

		if (this.valueTarget) {
			this.valueTarget.textContent = `${low} – ${high}`;
		}
	}

	private commitRange(emit = true): void {
		const [low, high] = this.getActiveRange();
		const changed = low !== this.rangeMin || high !== this.rangeMax;
		this.pendingRange = null;
		this.rangeMin = low;
		this.rangeMax = high;
		this.paintRangeUi(low, high);

		if (emit && changed) {
			this.changeEvent.emit({ values: [low, high] });
		}
	}

	private setRangeValue(thumb: 'min' | 'max', next: number): void {
		this.activeThumb = thumb;
		const [currentLow, currentHigh] = this.pendingRange ?? [this.rangeMin, this.rangeMax];
		const [low, high] = this.normalizeRange(
			thumb === 'min' ? next : currentLow,
			thumb === 'max' ? next : currentHigh,
		);
		this.pendingRange = [low, high];
		this.paintRangeUi(low, high);
	}

	private commitSingleValue(input: HTMLInputElement): void {
		const next = Number(input.value);
		this.updateDisplayedValue(next);

		if (next === this.value) {
			return;
		}

		this.value = next;
		this.changeEvent.emit({ value: next });
	}

	@onEvent({ ref: 'input', type: 'pointerdown' })
	onPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.variant !== 'single') {
			return;
		}

		this.interacting = true;
	}

	@onEvent({ ref: 'input', type: 'pointerup' })
	onPointerUp(event: Event): void {
		if (!this.interacting || this.variant !== 'single') {
			return;
		}

		this.interacting = false;
		this.commitSingleValue(event.target as HTMLInputElement);
	}

	@onEvent({ ref: 'input', type: 'pointercancel' })
	onPointerCancel(event: Event): void {
		if (!this.interacting || this.variant !== 'single') {
			return;
		}

		this.interacting = false;
		this.commitSingleValue(event.target as HTMLInputElement);
	}

	@onEvent({ ref: 'input', type: 'input' })
	onInput(event: Event): void {
		if (this.variant !== 'single') {
			return;
		}

		const input = event.target as HTMLInputElement;
		const next = Number(input.value);
		this.updateDisplayedValue(next);

		if (this.interacting) {
			this.changeEvent.emit({ value: next });
			return;
		}

		this.commitSingleValue(input);
	}

	@onEvent({ ref: 'input', type: 'change' })
	onChange(event: Event): void {
		if (this.variant !== 'single') {
			return;
		}

		this.interacting = false;
		this.commitSingleValue(event.target as HTMLInputElement);
	}

	@onEvent({ selector: '[data-thumb]', type: 'pointerdown' })
	onThumbPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.variant !== 'range' || this.disabled) {
			return;
		}

		const thumbElement = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
		if (!thumbElement) {
			return;
		}

		const thumb = thumbElement.getAttribute('data-thumb') as 'min' | 'max';
		this.activeThumb = thumb;
		this.pendingRange = [this.rangeMin, this.rangeMax];
		thumbElement.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	@onEvent({ selector: '[data-thumb]', type: 'pointermove' })
	onThumbPointerMove(event: PointerEvent): void {
		if (!this.activeThumb || this.variant !== 'range') {
			return;
		}

		const track = this.querySelector<HTMLElement>('.rui-slider__range-track');
		if (!track) {
			return;
		}

		this.setRangeValue(this.activeThumb, this.valueFromPointer(event.clientX, track));

		if (this.pendingRange) {
			this.changeEvent.emit({ values: this.pendingRange });
		}
	}

	@onEvent({ selector: '[data-thumb]', type: 'pointerup' })
	onThumbPointerUp(): void {
		if (!this.activeThumb || this.variant !== 'range') {
			return;
		}

		this.commitRange();
		this.activeThumb = null;
	}

	@onEvent({ selector: '[data-thumb]', type: 'pointercancel' })
	onThumbPointerCancel(): void {
		if (!this.activeThumb || this.variant !== 'range') {
			return;
		}

		this.pendingRange = null;
		this.syncRangeUi();
		this.activeThumb = null;
	}

	@onEvent({ selector: '[data-thumb]', type: 'keydown' })
	onThumbKeydown(event: KeyboardEvent): void {
		if (this.variant !== 'range' || this.disabled) {
			return;
		}

		const thumbElement = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
		if (!thumbElement) {
			return;
		}

		const thumb = thumbElement.getAttribute('data-thumb') as 'min' | 'max';
		const current = thumb === 'min' ? this.rangeMin : this.rangeMax;
		let next = current;

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				next = this.clamp(current + this.step);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				next = this.clamp(current - this.step);
				break;
			case 'Home':
				next = this.min;
				break;
			case 'End':
				next = this.max;
				break;
			case 'PageUp':
				next = this.clamp(current + this.step * 10);
				break;
			case 'PageDown':
				next = this.clamp(current - this.step * 10);
				break;
			default:
				return;
		}

		event.preventDefault();
		this.setRangeValue(thumb, next);
		this.commitRange(false);
		this.changeEvent.emit({ values: [this.rangeMin, this.rangeMax] });
		this.activeThumb = null;
	}

	override render() {
		if (this.variant === 'range') {
			return (
				<div class="rui-slider rui-slider--range">
					{this.label ? <span class="rui-slider__label">{this.label}</span> : null}
					<div class="rui-slider__range">
						<div class="rui-slider__range-track">
							<div class="rui-slider__range-fill" data-ref="rangeFill" />
							<button
								type="button"
								class="rui-slider__thumb"
								data-ref="rangeMinThumb"
								data-thumb="min"
								role="slider"
								tabindex={this.resolvedDisabledTabindex}
								aria-label={this.resolvedMinLabel}
								aria-valuemin={this.min}
								aria-valuemax={this.rangeMax}
								aria-valuenow={this.rangeMin}
								disabled={this.$.disabled}
							/>
							<button
								type="button"
								class="rui-slider__thumb"
								data-ref="rangeMaxThumb"
								data-thumb="max"
								role="slider"
								tabindex={this.resolvedDisabledTabindex}
								aria-label={this.resolvedMaxLabel}
								aria-valuemin={this.rangeMin}
								aria-valuemax={this.max}
								aria-valuenow={this.rangeMax}
								disabled={this.$.disabled}
							/>
						</div>
					</div>
					<span class="rui-slider__value" data-ref="value" aria-hidden="true">
						{this.rangeMin} – {this.rangeMax}
					</span>
				</div>
			);
		}

		return (
			<label class="rui-slider">
				{this.label ? <span class="rui-slider__label">{this.label}</span> : null}
				<input
					type="range"
					data-ref="input"
					data-rui-control
					data-rui-control-type="number"
					class="rui-slider__input"
					disabled={this.$.disabled}
					name={this.resolvedName}
					aria-valuemin={this.min}
					aria-valuemax={this.max}
					aria-valuenow={this.value}
				/>
				<span class="rui-slider__value" data-ref="value" aria-hidden="true">
					{this.value}
				</span>
			</label>
		);
	}
}
