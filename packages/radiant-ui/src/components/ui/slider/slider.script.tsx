import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { createNumericRange, formatNumericValue, resolveValuePrecision, valueFromSliderKey } from '../shared/numeric-range';

export type RuiSliderVariant = 'single' | 'range';
export type RuiSliderOrientation = 'horizontal' | 'vertical';
export type RuiSliderThumb = 'value' | 'min' | 'max';

export type RuiSliderProps = {
	variant?: RuiSliderVariant;
	orientation?: RuiSliderOrientation;
	value?: number;
	rangeMin?: number;
	rangeMax?: number;
	min?: number;
	max?: number;
	step?: number;
	/**
	 * Maximum fraction digits in the value readout, tooltips, and `aria-valuetext`.
	 * Defaults to the decimal places in `step`.
	 */
	valuePrecision?: number;
	minDistance?: number;
	disabled?: boolean;
	readOnly?: boolean;
	label?: string;
	name?: string;
	/** Shows the default value readout below the track when no `RuiSliderValue` child is provided. */
	showValue?: boolean;
	/** Mirrors the live value in the control `title` for hover tooltips. */
	valueTitle?: boolean;
};

export type RuiSliderChangeDetail = { value: number } | { values: [number, number] };

/**
 * `<rui-slider>` — select a value from a continuous or discrete range.
 *
 * Single and range modes use a DOM track and `role="slider"` thumbs styled via CSS
 * variables — no `<canvas>` rendering.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/slider/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/
 *
 * @element rui-slider
 *
 * @attr {('single'|'range')} variant - Single-thumb or dual-thumb range. Default: `single`.
 * @attr {('horizontal'|'vertical')} orientation - Track axis. Default: `horizontal`.
 * @attr {number} value - Selected value (single mode). Reflects to markup. Default: `50`.
 * @attr {number} range-min - Lower thumb value (range mode). Reflects to markup. Default: `25`.
 * @attr {number} range-max - Upper thumb value (range mode). Reflects to markup. Default: `75`.
 * @attr {number} min - Range minimum. Default: `0`.
 * @attr {number} max - Range maximum. Default: `100`.
 * @attr {number} step - Arrow-key and pointer snap interval. Default: `1`.
 * @attr {number} value-precision - Maximum fraction digits in the value readout. Defaults to the decimal places in `step`.
 * @attr {number} min-distance - Minimum gap enforced between range thumbs. Default: `0`.
 * @attr {boolean} disabled - Disables interaction. Default: `false`.
 * @attr {boolean} read-only - Blocks value changes while leaving thumbs focusable. Default: `false`.
 * @attr {string} label - Accessible name for the slider. Default: `''`.
 * @attr {string} name - Form field name. Range mode also writes `{name}-max`. Default: `''`.
 * @attr {boolean} show-value - Shows the default value readout below the track. Default: `false`.
 * @attr {boolean} value-title - Mirrors the live value in control `title` tooltips on hover. Default: `false`.
 *
 * @cssprop --rui-slider-track-size - Track thickness. Default: `0.375rem`.
 * @cssprop --rui-slider-track-length - Track length for vertical sliders and horizontal max length. Default: `12rem`.
 * @cssprop --rui-slider-width - Root control width. Default: `100%` (`auto` when vertical).
 * @cssprop --rui-slider-height - Root control height. Default: `auto`.
 * @cssprop --rui-slider-gap - Spacing between label, track, and value. Default: `--space-inline`.
 * @cssprop --rui-slider-track-color - Range track background. Default: `--surface`.
 * @cssprop --rui-slider-fill-color - Range selected fill. Default: `--primary`.
 * @cssprop --rui-slider-track-radius - Track and fill corner radius. Default: `--radius-control`.
 * @cssprop --rui-slider-thumb-size - Range thumb diameter. Default: `1.25rem`.
 * @cssprop --rui-slider-thumb-border-width - Range thumb border width. Default: `2px`.
 * @cssprop --rui-slider-thumb-border-color - Range thumb border color. Default: `--primary`.
 * @cssprop --rui-slider-thumb-background - Range thumb fill. Default: `--background`.
 * @cssprop --rui-slider-thumb-shadow - Range thumb shadow. Default: `0 2px 8px rgb(0 0 0 / 0.12)`.
 * @cssprop --rui-slider-thumb-radius - Thumb corner radius. Default: `--radius-control`.
 * @cssprop --rui-slider-value-color - Value readout color. Default: `--on-surface`.
 * @cssprop --rui-slider-focus-ring - Focus ring color. Default: `--focus-ring`.
 * @cssprop --rui-slider-focus-ring-width - Focus ring width. Default: `2px`.
 *
 * @fires rui-change - Emitted when the committed value changes; `detail.value` (single) or
 *   `detail.values` `[min, max]` (range). Pointer drags emit on each distinct snap.
 *
 * @remarks
 * The composed surface is authored in `RuiSlider` / `RuiSliderValue`. The element
 * queries `data-ref` targets and updates live values imperatively.
 * `valuePrecision` formats the readout only. Committed values stay on the stepped model;
 * round or transform them in application code when needed.
 */
@customElement('rui-slider')
export class RuiSlider extends RadiantElement {
	@prop({ type: String, defaultValue: 'single' }) variant: RuiSliderVariant;
	@prop({ type: String, defaultValue: 'horizontal' }) orientation: RuiSliderOrientation;
	@prop({ type: Number, reflect: true, defaultValue: 50 }) value: number;
	@prop({ type: Number, reflect: true, attribute: 'range-min', defaultValue: 25 }) rangeMin: number;
	@prop({ type: Number, reflect: true, attribute: 'range-max', defaultValue: 75 }) rangeMax: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: 100 }) max: number;
	@prop({ type: Number, defaultValue: 1 }) step: number;
	@prop({ type: Number, attribute: 'value-precision', defaultValue: Number.NaN }) valuePrecision: number;
	@prop({ type: Number, defaultValue: 0 }) minDistance: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false }) readOnly: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: Boolean, attribute: 'show-value', defaultValue: false }) showValue: boolean;
	@prop({ type: Boolean, attribute: 'value-title', defaultValue: false }) valueTitle: boolean;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiSliderChangeDetail>;

	@query({ ref: 'input' }) inputTarget: HTMLInputElement;
	@query({ ref: 'maxInput' }) maxInputTarget: HTMLInputElement;
	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'header' }) headerTarget: HTMLElement;
	@query({ ref: 'label' }) labelTarget: HTMLElement;
	@query({ ref: 'rangeTrack' }) rangeTrack: HTMLElement;
	@query({ ref: 'value' }) valueTarget: HTMLElement;
	@query({ ref: 'singleThumb' }) singleThumb: HTMLButtonElement;
	@query({ ref: 'rangeMinThumb' }) rangeMinThumb: HTMLButtonElement;
	@query({ ref: 'rangeMaxThumb' }) rangeMaxThumb: HTMLButtonElement;

	private activeThumb: RuiSliderThumb | null = null;
	private activePointerId: number | null = null;
	private pending: number[] | null = null;
	private lastEmitted = '';

	protected override onConnected(): void {
		this.syncChrome();
		this.syncValues(this.committedValues());
	}

	@onUpdated([
		'value',
		'rangeMin',
		'rangeMax',
		'min',
		'max',
		'step',
		'valuePrecision',
		'minDistance',
		'variant',
		'orientation',
		'disabled',
		'readOnly',
		'label',
		'name',
		'showValue',
		'valueTitle',
	])
	onPropsUpdated(): void {
		if (this.activeThumb) {
			return;
		}

		this.syncChrome();
		this.syncValues(this.committedValues());
	}

	private get isRange(): boolean {
		return this.variant === 'range';
	}

	private get isVertical(): boolean {
		return this.orientation === 'vertical';
	}

	private get numericRange() {
		return createNumericRange(this.min, this.max, this.step);
	}

	private get resolvedValuePrecision(): number {
		return resolveValuePrecision(this.step, this.valuePrecision);
	}

	private formatValue(value: number): string {
		return formatNumericValue(value, this.resolvedValuePrecision);
	}

	private formatValues(values: number[]): string {
		return values.length === 2
			? `${this.formatValue(values[0])} – ${this.formatValue(values[1])}`
			: this.formatValue(values[0]);
	}

	private get defaultValueTarget(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-default-value]');
	}

	private thumbFor(id: RuiSliderThumb): HTMLButtonElement | undefined {
		if (id === 'value') {
			return this.singleThumb;
		}
		return id === 'min' ? this.rangeMinThumb : this.rangeMaxThumb;
	}

	private parseThumb(value: string | null): RuiSliderThumb | null {
		if (this.isRange) {
			return value === 'min' || value === 'max' ? value : null;
		}
		return value === 'value' ? value : null;
	}

	private constrainPair(low: number, high: number, active?: RuiSliderThumb): [number, number] {
		const range = this.numericRange;
		let nextLow = range.clamp(low);
		let nextHigh = range.clamp(high);
		if (nextLow > nextHigh) {
			[nextLow, nextHigh] = [nextHigh, nextLow];
		}

		const minDistance = Math.max(0, this.minDistance);
		if (nextHigh - nextLow < minDistance) {
			if (active === 'min') {
				nextLow = range.clamp(nextHigh - minDistance);
			} else {
				nextHigh = range.clamp(nextLow + minDistance);
			}
		}

		return [nextLow, nextHigh];
	}

	private committedValues(): number[] {
		if (this.isRange) {
			return this.constrainPair(this.rangeMin, this.rangeMax);
		}
		return [this.numericRange.clamp(this.value)];
	}

	private liveValues(): number[] {
		return this.pending ?? this.committedValues();
	}

	private changeDetail(values: number[]): RuiSliderChangeDetail {
		return values.length === 2 ? { values: [values[0], values[1]] } : { value: values[0] };
	}

	private emitIfChanged(values: number[]): void {
		const key = values.join(',');
		if (key === this.lastEmitted) {
			return;
		}
		this.lastEmitted = key;
		this.changeEvent.emit(this.changeDetail(values));
	}

	private reflectValues(values: number[]): void {
		if (values.length === 2) {
			if (this.rangeMin !== values[0]) {
				this.rangeMin = values[0];
			}
			if (this.rangeMax !== values[1]) {
				this.rangeMax = values[1];
			}
			return;
		}

		if (this.value !== values[0]) {
			this.value = values[0];
		}
	}

	private syncValues(values: number[]): void {
		this.paint(values);
		this.reflectValues(values);
	}

	private syncChrome(): void {
		const disabled = this.disabled;
		const range = this.isRange;
		const tabindex = disabled ? -1 : 0;
		const orientation = this.isVertical ? 'vertical' : 'horizontal';
		const hasDefaultValue = Boolean(this.defaultValueTarget);
		const hasVisibleReadout = Boolean(this.valueTarget) && (!hasDefaultValue || this.showValue);
		const rangeBounds = this.numericRange;

		this.rootTarget?.classList.toggle('rui-slider--single', !range);
		this.rootTarget?.classList.toggle('rui-slider--range', range);
		this.rootTarget?.classList.toggle('rui-slider--vertical', this.isVertical);
		this.labelTarget?.toggleAttribute('hidden', !this.label);
		if (this.labelTarget) {
			this.labelTarget.textContent = this.label;
		}
		this.defaultValueTarget?.toggleAttribute('hidden', !this.showValue);
		this.headerTarget?.toggleAttribute('hidden', !this.label && !hasVisibleReadout);

		const thumbs: Array<[RuiSliderThumb, string, boolean]> = [
			['value', this.label || 'Value', !range],
			['min', this.label ? `${this.label} minimum` : 'Minimum value', range],
			['max', this.label ? `${this.label} maximum` : 'Maximum value', range],
		];

		for (const [id, ariaLabel, visible] of thumbs) {
			const thumb = this.thumbFor(id);
			if (!thumb) {
				continue;
			}
			thumb.toggleAttribute('hidden', !visible);
			thumb.toggleAttribute('disabled', disabled || !visible);
			thumb.setAttribute('tabindex', String(visible ? tabindex : -1));
			thumb.setAttribute('aria-label', ariaLabel);
			thumb.setAttribute('aria-orientation', orientation);
			thumb.setAttribute('aria-valuemin', String(rangeBounds.lowerBound));
			thumb.setAttribute('aria-valuemax', String(rangeBounds.upperBound));
			thumb.setAttribute('aria-readonly', String(this.readOnly));
		}
	}

	private paint(values: number[]): void {
		const range = this.numericRange;
		const start = values[0];
		const end = values.length === 2 ? values[1] : values[0];
		const startPercent = `${range.ratioFor(start) * 100}%`;
		const endPercent = `${range.ratioFor(end) * 100}%`;
		const fillSize = `${(range.ratioFor(end) - range.ratioFor(start)) * 100}%`;
		const track = this.rangeTrack;

		track?.style.setProperty('--rui-slider-fill-start', values.length === 2 ? startPercent : '0%');
		track?.style.setProperty('--rui-slider-fill-size', values.length === 2 ? fillSize : endPercent);
		track?.style.setProperty('--rui-slider-value', startPercent);
		track?.style.setProperty('--rui-slider-min', startPercent);
		track?.style.setProperty('--rui-slider-max', endPercent);

		if (this.singleThumb) {
			this.singleThumb.setAttribute('aria-valuenow', String(start));
			this.singleThumb.setAttribute('aria-valuetext', this.formatValue(start));
		}
		if (this.rangeMinThumb) {
			this.rangeMinThumb.setAttribute('aria-valuenow', String(start));
			this.rangeMinThumb.setAttribute('aria-valuetext', this.formatValue(start));
			this.rangeMinThumb.setAttribute('aria-valuemax', String(end));
		}
		if (this.rangeMaxThumb) {
			this.rangeMaxThumb.setAttribute('aria-valuemin', String(start));
			this.rangeMaxThumb.setAttribute('aria-valuenow', String(end));
			this.rangeMaxThumb.setAttribute('aria-valuetext', this.formatValue(end));
		}

		if (this.valueTarget) {
			this.valueTarget.textContent = this.formatValues(values);
		}

		this.syncInputs(values);
		this.syncValueTitle(values);
	}

	private syncInputs(values: number[]): void {
		if (this.inputTarget) {
			this.inputTarget.disabled = this.disabled;
			this.inputTarget.readOnly = this.readOnly;
			this.inputTarget.value = String(values[0]);
			if (this.name) {
				this.inputTarget.name = this.name;
			} else {
				this.inputTarget.removeAttribute('name');
			}
		}

		if (!this.maxInputTarget) {
			return;
		}

		this.maxInputTarget.disabled = this.disabled;
		this.maxInputTarget.readOnly = this.readOnly;

		if (values.length === 2) {
			this.maxInputTarget.value = String(values[1]);
			if (this.name) {
				this.maxInputTarget.name = `${this.name}-max`;
			} else {
				this.maxInputTarget.removeAttribute('name');
			}
			return;
		}

		this.maxInputTarget.value = '';
		this.maxInputTarget.removeAttribute('name');
	}

	private syncValueTitle(values: number[]): void {
		const thumbs = [this.singleThumb, this.rangeMinThumb, this.rangeMaxThumb];
		if (!this.valueTitle) {
			this.inputTarget?.removeAttribute('title');
			this.maxInputTarget?.removeAttribute('title');
			this.rangeTrack?.removeAttribute('title');
			for (const thumb of thumbs) {
				thumb?.removeAttribute('title');
			}
			return;
		}

		if (values.length === 1) {
			const title = this.formatValue(values[0]);
			this.inputTarget?.setAttribute('title', title);
			this.maxInputTarget?.removeAttribute('title');
			this.rangeTrack?.removeAttribute('title');
			this.singleThumb?.setAttribute('title', title);
			this.rangeMinThumb?.removeAttribute('title');
			this.rangeMaxThumb?.removeAttribute('title');
			return;
		}

		const [low, high] = values;
		this.inputTarget?.setAttribute('title', this.formatValue(low));
		this.maxInputTarget?.setAttribute('title', this.formatValue(high));
		this.rangeTrack?.setAttribute('title', this.formatValues(values));
		this.singleThumb?.removeAttribute('title');
		this.rangeMinThumb?.setAttribute('title', this.formatValue(low));
		this.rangeMaxThumb?.setAttribute('title', this.formatValue(high));
	}

	private valueFromPointer(event: PointerEvent): number {
		const track = this.rangeTrack;
		if (!track) {
			return this.numericRange.lowerBound;
		}

		const rect = track.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return this.numericRange.lowerBound;
		}

		const ratio = this.isVertical
			? 1 - (event.clientY - rect.top) / rect.height
			: (event.clientX - rect.left) / rect.width;
		return this.numericRange.valueFromRatio(ratio);
	}

	private nearestThumb(next: number): RuiSliderThumb {
		if (!this.isRange) {
			return 'value';
		}
		const [low, high] = this.liveValues();
		return Math.abs(next - low) <= Math.abs(next - high) ? 'min' : 'max';
	}

	private moveThumb(thumb: RuiSliderThumb, next: number): number[] {
		this.activeThumb = thumb;
		if (this.isRange) {
			const current = this.pending ?? this.committedValues();
			this.pending = this.constrainPair(
				thumb === 'min' ? next : current[0],
				thumb === 'max' ? next : current[1],
				thumb,
			);
		} else {
			this.pending = [this.numericRange.clamp(next)];
		}

		const values = this.pending;
		this.paint(values);
		this.emitIfChanged(values);
		return values;
	}

	private commit(): void {
		const values = this.liveValues();
		this.pending = null;
		this.activeThumb = null;
		this.activePointerId = null;
		this.syncValues(values);
	}

	private revert(): void {
		this.pending = null;
		this.activeThumb = null;
		this.activePointerId = null;
		this.lastEmitted = this.committedValues().join(',');
		this.paint(this.committedValues());
	}

	private releasePointer(event: PointerEvent): void {
		const track = this.rangeTrack;
		if (track?.hasPointerCapture(event.pointerId)) {
			track.releasePointerCapture(event.pointerId);
		}
	}

	@onEvent({ ref: 'rangeTrack', type: 'pointerdown' })
	onPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.disabled || this.readOnly) {
			return;
		}

		const thumbElement = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
		const fromThumb = this.parseThumb(thumbElement?.getAttribute('data-thumb') ?? null);
		const next = this.valueFromPointer(event);
		const thumb = fromThumb ?? this.nearestThumb(next);
		this.pending = this.committedValues();
		this.lastEmitted = this.pending.join(',');
		this.activeThumb = thumb;
		this.activePointerId = event.pointerId;
		this.rangeTrack?.setPointerCapture(event.pointerId);
		this.thumbFor(thumb)?.focus();
		if (!fromThumb) {
			this.moveThumb(thumb, next);
		}
		event.preventDefault();
	}

	/**
	 * @remarks Pointermove is observed on `document` so drag still tracks when
	 * testing-library dispatches move events off the thumb/track (no capture retarget).
	 */
	@onEvent({ document: true, type: 'pointermove' })
	onPointerMove(event: PointerEvent): void {
		if (!this.activeThumb || event.pointerId !== this.activePointerId) {
			return;
		}

		this.moveThumb(this.activeThumb, this.valueFromPointer(event));
	}

	@onEvent({ document: true, type: 'pointerup' })
	onPointerUp(event: PointerEvent): void {
		if (!this.activeThumb || event.pointerId !== this.activePointerId) {
			return;
		}

		this.releasePointer(event);
		this.commit();
	}

	@onEvent({ document: true, type: 'pointercancel' })
	onPointerCancel(event: PointerEvent): void {
		if (!this.activeThumb || event.pointerId !== this.activePointerId) {
			return;
		}

		this.releasePointer(event);
		this.revert();
	}

	@onEvent({ selector: '[data-thumb]', type: 'keydown' })
	onThumbKeydown(event: KeyboardEvent): void {
		if (this.disabled || this.readOnly) {
			return;
		}

		const thumbElement = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
		const thumb = this.parseThumb(thumbElement?.getAttribute('data-thumb') ?? null);
		if (!thumb) {
			return;
		}

		const values = this.committedValues();
		const current = thumb === 'max' ? values[values.length - 1] : values[0];
		const next = valueFromSliderKey(this.numericRange, current, event.key);
		if (next == null) {
			return;
		}

		event.preventDefault();
		this.lastEmitted = values.join(',');
		this.moveThumb(thumb, next);
		this.commit();
	}
}
