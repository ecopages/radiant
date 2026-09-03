import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import {
	createNumericRange,
	formatNumericValue,
	type NumericRange,
	resolveValuePrecision,
	valueFromSliderKey,
	valuesAlignOnStep,
} from '../shared/numeric-range';

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
 * Host `@prop` defaults. The view reuses these so SSR readout and track
 * geometry match hydration.
 */
export const SLIDER_DEFAULT_VALUE = 50;
export const SLIDER_DEFAULT_RANGE_MIN = 25;
export const SLIDER_DEFAULT_RANGE_MAX = 75;
export const SLIDER_DEFAULT_MAX = 100;

function constrainSliderPair(
	range: NumericRange,
	low: number,
	high: number,
	minDistance: number,
	active?: RuiSliderThumb,
): [number, number] {
	let nextLow = range.clamp(low);
	let nextHigh = range.clamp(high);
	if (nextLow > nextHigh) {
		[nextLow, nextHigh] = [nextHigh, nextLow];
	}

	const gap = Math.max(0, minDistance);
	if (nextHigh - nextLow < gap) {
		if (active === 'min') {
			nextLow = range.clamp(nextHigh - gap);
		} else {
			nextHigh = range.clamp(nextLow + gap);
		}
	}

	return [nextLow, nextHigh];
}

/** Clamped values the view stamps for SSR and the host paints from props. */
export function resolveSliderValues(options: {
	variant?: RuiSliderVariant;
	value: number;
	rangeMin: number;
	rangeMax: number;
	min: number;
	max: number;
	step: number;
	minDistance?: number;
}): number[] {
	const range = createNumericRange(options.min, options.max, options.step);
	if (options.variant === 'range') {
		return constrainSliderPair(range, options.rangeMin, options.rangeMax, options.minDistance ?? 0);
	}
	return [range.clamp(options.value)];
}

/** Formats the live readout, tooltips, and `aria-valuetext`. */
export function formatSliderReadout(values: number[], step: number, valuePrecision?: number): string {
	const precision = resolveValuePrecision(step, valuePrecision);
	if (values.length === 2) {
		return `${formatNumericValue(values[0], precision)} – ${formatNumericValue(values[1], precision)}`;
	}
	return formatNumericValue(values[0], precision);
}

/** Clamped values, readout, and track CSS vars the view stamps for SSR. */
export function seedSliderView(options: {
	variant?: RuiSliderVariant;
	values?: [number, number];
	value?: number;
	rangeMin?: number;
	rangeMax?: number;
	min?: number;
	max?: number;
	step?: number;
	minDistance?: number;
	valuePrecision?: number;
}) {
	const variant = options.variant ?? 'single';
	const min = options.min ?? 0;
	const max = options.max ?? SLIDER_DEFAULT_MAX;
	const step = options.step ?? 1;
	const value = options.value ?? SLIDER_DEFAULT_VALUE;
	const minDistance = options.minDistance ?? 0;
	const rangeMin = options.rangeMin ?? SLIDER_DEFAULT_RANGE_MIN;
	const rangeMax = options.rangeMax ?? SLIDER_DEFAULT_RANGE_MAX;
	const resolvedRangeMin = options.values?.[0] ?? rangeMin;
	const resolvedRangeMax = options.values?.[1] ?? rangeMax;
	const committed = resolveSliderValues({
		variant,
		value,
		rangeMin: resolvedRangeMin,
		rangeMax: resolvedRangeMax,
		min,
		max,
		step,
		minDistance,
	});
	const range = createNumericRange(min, max, step);

	return {
		variant,
		min,
		max,
		step,
		value,
		minDistance,
		resolvedRangeMin,
		resolvedRangeMax,
		committed,
		readoutPrecision: resolveValuePrecision(step, options.valuePrecision),
		readoutText: formatSliderReadout(committed, step, options.valuePrecision),
		trackStyle: sliderTrackCssVars(committed, range),
		isRange: variant === 'range',
		valuePrecision:
			typeof options.valuePrecision === 'number' && Number.isFinite(options.valuePrecision)
				? options.valuePrecision
				: undefined,
	};
}

/** Inline track CSS variables for fill and thumb positions. */
export function sliderTrackCssVars(values: number[], range: NumericRange): Record<string, string> {
	const start = values[0];
	const end = values.length === 2 ? values[1] : values[0];
	const startPercent = `${range.ratioFor(start) * 100}%`;
	const endPercent = `${range.ratioFor(end) * 100}%`;
	const fillSize = `${(range.ratioFor(end) - range.ratioFor(start)) * 100}%`;
	return {
		'--rui-slider-fill-start': values.length === 2 ? startPercent : '0%',
		'--rui-slider-fill-size': values.length === 2 ? fillSize : endPercent,
		'--rui-slider-value': startPercent,
		'--rui-slider-min': startPercent,
		'--rui-slider-max': endPercent,
	};
}

/**
 * `<rui-slider>` — select a value from a continuous or discrete range.
 *
 * The custom element is a behavior host: it does not render slider markup.
 * Import the script and place light-DOM children that match the contract below,
 * or use `RuiSlider` / `RuiSliderValue`, which stamp the same targets.
 *
 * Single and range modes use a DOM track and `role="slider"` thumbs styled via CSS
 * variables — no `<canvas>` rendering.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — root wrapper. Host toggles `rui-slider--single`,
 *   `rui-slider--range`, and `rui-slider--vertical` classes.
 * - `[data-ref="rangeTrack"]` — pointer target and fill geometry host. Host sets
 *   inline `--rui-slider-*` CSS variables and optional `title` when `valueTitle`.
 *   The view seeds those variables so fill and thumbs match the value before hydration.
 * - `[data-thumb]` — thumb buttons inside the track (`value`, `min`, or `max`).
 *   Host sets `hidden`, `disabled`, `tabindex`, `aria-label`, `aria-orientation`,
 *   `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`,
 *   `aria-readonly`, and range-specific `aria-valuemin` / `aria-valuemax` on thumbs.
 *
 * Optional:
 * - `[data-ref="header"]` — label + readout row. Host toggles `hidden`.
 * - `[data-ref="label"]` — visible label. Host sets `hidden` and `textContent` from `label`.
 * - `[data-ref="value"]` — live readout. Host updates `textContent`. The view seeds
 *   the formatted value for SSR.
 * - `[data-default-value]` — default readout stamped by the view when `children` is omitted.
 *   Host toggles `hidden` via `showValue`.
 * - `[data-ref="input"]` — hidden form input for the primary value. Host syncs `value`,
 *   `name`, `disabled`, `readOnly`, and optional `title`.
 * - `[data-ref="maxInput"]` — hidden form input for range max. Host syncs `value`,
 *   `name` (`{name}-max`), `disabled`, `readOnly`, and optional `title`.
 * - `[data-ref="singleThumb"]`, `[data-ref="rangeMinThumb"]`, `[data-ref="rangeMaxThumb"]`
 *   — map to `[data-thumb]` targets above.
 *
 * Do not set thumb `tabindex`, `aria-*` value attrs, or track CSS variables — the host
 * owns those. Author `label` on the host for accessible names when no visible label node.
 *
 * Nested hosts: none.
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
 * @cssprop --rui-track-mix - Unfilled track mix against `--on-background`. Inherited. Default: `22%`.
 * @cssprop --rui-track-fill - Unfilled track color from that mix. Inherited.
 * @cssprop --rui-track-color - Unfilled track color for slider and knob. Inherited; unset uses `--rui-track-fill`.
 * @cssprop --rui-slider-track-color - Range track background. Default: `--rui-track-color` or `--rui-track-fill`.
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
 * `valuePrecision` formats the readout only. Committed values stay on the stepped model;
 * round or transform them in application code when needed. BEM classes live on the view;
 * the host never queries them.
 */
@customElement('rui-slider')
export class RuiSlider extends RadiantElement {
	@prop({ type: String, defaultValue: 'single' }) variant: RuiSliderVariant;
	@prop({ type: String, defaultValue: 'horizontal' }) orientation: RuiSliderOrientation;
	@prop({ type: Number, reflect: true, defaultValue: SLIDER_DEFAULT_VALUE }) value: number;
	@prop({ type: Number, reflect: true, attribute: 'range-min', defaultValue: SLIDER_DEFAULT_RANGE_MIN })
	rangeMin: number;
	@prop({ type: Number, reflect: true, attribute: 'range-max', defaultValue: SLIDER_DEFAULT_RANGE_MAX })
	rangeMax: number;
	@prop({ type: Number, defaultValue: 0 }) min: number;
	@prop({ type: Number, defaultValue: SLIDER_DEFAULT_MAX }) max: number;
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
		return formatSliderReadout(values, this.step, this.valuePrecision);
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
		return constrainSliderPair(this.numericRange, low, high, this.minDistance, active);
	}

	private committedValues(): number[] {
		return resolveSliderValues({
			variant: this.variant,
			value: this.value,
			rangeMin: this.rangeMin,
			rangeMax: this.rangeMax,
			min: this.min,
			max: this.max,
			step: this.step,
			minDistance: this.minDistance,
		});
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
			if (!valuesAlignOnStep(this.rangeMin, values[0], this.step)) {
				this.rangeMin = values[0];
			}
			if (!valuesAlignOnStep(this.rangeMax, values[1], this.step)) {
				this.rangeMax = values[1];
			}
			return;
		}

		if (!valuesAlignOnStep(this.value, values[0], this.step)) {
			this.value = values[0];
		}
	}

	private syncValues(values: number[]): void {
		this.paint(values);
		this.reflectValues(values);
	}

	private syncChrome(): void {
		this.syncRootChrome();
		this.syncThumbChrome();
	}

	private syncRootChrome(): void {
		const hasVisibleReadout = Boolean(this.valueTarget) && (!this.defaultValueTarget || this.showValue);
		this.rootTarget?.classList.toggle('rui-slider--single', !this.isRange);
		this.rootTarget?.classList.toggle('rui-slider--range', this.isRange);
		this.rootTarget?.classList.toggle('rui-slider--vertical', this.isVertical);
		this.labelTarget?.toggleAttribute('hidden', !this.label);
		if (this.labelTarget) this.labelTarget.textContent = this.label;
		this.defaultValueTarget?.toggleAttribute('hidden', !this.showValue);
		this.headerTarget?.toggleAttribute('hidden', !this.label && !hasVisibleReadout);
	}

	private syncThumbChrome(): void {
		const tabindex = this.disabled ? -1 : 0;
		const orientation = this.isVertical ? 'vertical' : 'horizontal';
		const rangeBounds = this.numericRange;
		for (const { id, label, visible } of this.getThumbChrome()) {
			const thumb = this.thumbFor(id);
			if (!thumb) continue;
			thumb.toggleAttribute('hidden', !visible);
			thumb.toggleAttribute('disabled', this.disabled || !visible);
			thumb.setAttribute('tabindex', String(visible ? tabindex : -1));
			thumb.setAttribute('aria-label', label);
			thumb.setAttribute('aria-orientation', orientation);
			thumb.setAttribute('aria-valuemin', String(rangeBounds.lowerBound));
			thumb.setAttribute('aria-valuemax', String(rangeBounds.upperBound));
			thumb.setAttribute('aria-readonly', String(this.readOnly));
		}
	}

	private getThumbChrome(): Array<{ id: RuiSliderThumb; label: string; visible: boolean }> {
		const range = this.isRange;
		return [
			{ id: 'value', label: this.label || 'Value', visible: !range },
			{ id: 'min', label: this.label ? `${this.label} minimum` : 'Minimum value', visible: range },
			{ id: 'max', label: this.label ? `${this.label} maximum` : 'Maximum value', visible: range },
		];
	}

	private paint(values: number[]): void {
		const start = values[0];
		const end = values.length === 2 ? values[1] : values[0];
		const track = this.rangeTrack;
		const vars = sliderTrackCssVars(values, this.numericRange);

		for (const [name, value] of Object.entries(vars)) {
			track?.style.setProperty(name, value);
		}

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
		const targets = [
			[this.inputTarget, 'input'],
			[this.maxInputTarget, 'maxInput'],
			[this.rangeTrack, 'track'],
			[this.singleThumb, 'value'],
			[this.rangeMinThumb, 'min'],
			[this.rangeMaxThumb, 'max'],
		] as const;
		const titles = this.getValueTitles(values);
		for (const [target, key] of targets) {
			const title = titles[key];
			if (title) target?.setAttribute('title', title);
			else target?.removeAttribute('title');
		}
	}

	private getValueTitles(values: number[]): Partial<Record<'input' | 'maxInput' | 'track' | RuiSliderThumb, string>> {
		if (!this.valueTitle) return {};
		if (values.length === 1) {
			const value = this.formatValue(values[0]);
			return { input: value, value };
		}
		const [low, high] = values;
		return {
			input: this.formatValue(low),
			maxInput: this.formatValue(high),
			min: this.formatValue(low),
			max: this.formatValue(high),
			track: this.formatValues(values),
		};
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
