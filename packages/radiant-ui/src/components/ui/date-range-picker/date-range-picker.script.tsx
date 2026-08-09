import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query, state } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import {
	dateToIso,
	formatDisplayDate,
	isoToDate,
	parseLocaleDateString,
	parseIsoRange,
	serializeIsoRange,
} from '@/lib/intl-date';
import type { DateDisplayStyle } from '@/lib/intl-date';
import { RuiIconCalendar } from '@/lib/icons';
import type { RuiCalendarChangeDetail } from '../calendar/calendar.script';
import '../calendar/calendar.script';
import { PopoverController, shouldDismissPopoverFocus } from '../shared/popover-controller';
import { resolveLocale } from '@/lib/intl/locale';

export type RuiDateRangePickerProps = {
	value?: string;
	min?: string;
	max?: string;
	disabled?: boolean;
	readOnly?: boolean;
	locale?: string;
	placeholderStart?: string;
	placeholderEnd?: string;
	startName?: string;
	endName?: string;
	name?: string;
	dateStyle?: DateDisplayStyle;
	visibleMonths?: number;
};

export type RuiDateRangePickerChangeDetail = {
	value: string;
	start: string;
	end: string;
};

type EditingField = 'start' | 'end' | null;

type RuiDateRangePickerBindings = {
	disabled: boolean;
	readOnly: boolean;
	open: boolean;
};

/**
 * `<rui-date-range-picker>` — start/end date fields with a range calendar popover.
 *
 * Canonical `value` is `YYYY-MM-DD/YYYY-MM-DD`. Pair with `RuiField` for validation.
 *
 * @remarks Range entry is intentionally free-text plus calendar based. Masked
 * segment editing is currently limited to `RuiDateField` so two range inputs do
 * not maintain separate partial-mask state.
 *
 * @see https://react-aria.adobe.com/DateRangePicker
 *
 * @element rui-date-range-picker
 *
 * @attr {string} value - Canonical `YYYY-MM-DD/YYYY-MM-DD` range. Default: `''`.
 * @attr {string} min - Earliest selectable ISO date. Default: `''`.
 * @attr {string} max - Latest selectable ISO date. Default: `''`.
 * @attr {boolean} disabled - Disable both inputs and the calendar. Default: `false`.
 * @attr {boolean} read-only - Disable editing while keeping values visible. Default: `false`.
 * @attr {string} locale - BCP 47 locale tag, or comma-separated fallback list. Default: `''`.
 * @attr {string} placeholder-start - Placeholder for the start input. Default: `Start date`.
 * @attr {string} placeholder-end - Placeholder for the end input. Default: `End date`.
 * @attr {string} start-name - Native `name` for the start input. Default: `''`.
 * @attr {string} end-name - Native `name` for the end input. Default: `''`.
 * @attr {string} date-style - How committed values are displayed in the inputs. Default: `medium`.
 * @attr {number} visible-months - Month grids shown in the range calendar popover. Default: `2`.
 *
 * @fires rui-change - Emitted when a valid range is committed; detail carries `value`, `start`, and `end`.
 *
 * @cssclass rui-date-range-picker - Root surface.
 * @cssclass rui-date-range-picker__group - Bordered control-height row wrapping inputs and toggle.
 * @cssclass rui-date-range-picker__values - Start / end input row.
 * @cssclass rui-date-range-picker__input - A range text input.
 * @cssclass rui-date-range-picker__separator - Em dash between the inputs.
 * @cssclass rui-date-range-picker__popover - Range calendar popup shell (`rui-popover` / `rui-floating`).
 */
@customElement('rui-date-range-picker')
export class RuiDateRangePicker extends RadiantElement<RuiDateRangePickerBindings> {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) min: string;
	@prop({ type: String, defaultValue: '' }) max: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false }) readOnly: boolean;
	@prop({ type: String, defaultValue: '' }) locale: string;
	@prop({ type: String, attribute: 'placeholder-start', defaultValue: '' }) placeholderStart: string;
	@prop({ type: String, attribute: 'placeholder-end', defaultValue: '' }) placeholderEnd: string;
	@prop({ type: String, attribute: 'start-name', defaultValue: '' }) startName: string;
	@prop({ type: String, attribute: 'end-name', defaultValue: '' }) endName: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, attribute: 'date-style', defaultValue: 'medium' }) dateStyle: DateDisplayStyle;
	@prop({ type: Number, attribute: 'visible-months', defaultValue: 2 }) visibleMonths: number;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiDateRangePickerChangeDetail>;

	@state open = false;
	@state startDisplay = '';
	@state endDisplay = '';
	@state editing: EditingField = null;

	private readonly uid = Math.random().toString(36).slice(2, 9);
	private popoverController: PopoverController | null = null;
	private suppressPopoverDismiss = false;

	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'popover' }) popoverTarget: HTMLElement;

	private get resolvedLocale(): string | string[] | undefined {
		return resolveLocale(this.locale);
	}

	private get isoValue(): string {
		return this.value ?? '';
	}

	private getStartInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-range-start]');
	}

	private getEndInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-range-end]');
	}

	private formatIso(iso: string): string {
		if (!iso) {
			return '';
		}
		const date = isoToDate(iso);
		return date ? formatDisplayDate(date, this.resolvedLocale, this.dateStyle) : '';
	}

	private syncDisplayValues(): void {
		if (this.editing === 'start' || this.editing === 'end') {
			return;
		}
		const range = parseIsoRange(this.isoValue);
		this.startDisplay = this.formatIso(range?.start ?? '');
		this.endDisplay = this.formatIso(range?.end ?? '');

		const startInput = this.getStartInput();
		const endInput = this.getEndInput();
		if (startInput) {
			startInput.value = this.startDisplay;
		}
		if (endInput) {
			endInput.value = this.endDisplay;
		}
	}

	private isIsoAllowed(iso: string): boolean {
		if (this.min && iso < this.min) {
			return false;
		}
		if (this.max && iso > this.max) {
			return false;
		}
		return true;
	}

	private commitRange(start: string, end: string): void {
		if (start && !this.isIsoAllowed(start)) {
			this.syncDisplayValues();
			return;
		}
		if (end && !this.isIsoAllowed(end)) {
			this.syncDisplayValues();
			return;
		}

		const serialized = start && end ? serializeIsoRange({ start, end }) : '';
		if (serialized === this.isoValue) {
			this.syncDisplayValues();
			return;
		}

		this.value = serialized;
		this.changeEvent.emit({ value: serialized, start, end });
		this.syncDisplayValues();
	}

	private parseField(raw: string): string {
		const trimmed = (raw ?? '').trim();
		if (!trimmed) {
			return '';
		}
		const parsed = parseLocaleDateString(trimmed, this.resolvedLocale);
		return parsed ? dateToIso(parsed) : '';
	}

	private commitFromInputs(): void {
		const start = this.parseField(this.getStartInput()?.value ?? '');
		const end = this.parseField(this.getEndInput()?.value ?? '');
		if (!start && !end) {
			this.commitRange('', '');
			return;
		}
		if (start && end) {
			this.commitRange(start, end);
			return;
		}
		const range = parseIsoRange(this.isoValue);
		this.commitRange(start || range?.start || '', end || range?.end || '');
	}

	private setOpen(next: boolean): void {
		this.open = next;
		queueMicrotask(() => this.syncPopoverPosition());
	}

	private ensurePopoverController(): PopoverController {
		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: () => this.rootTarget,
				getFloating: () => this.popoverTarget,
				getOpen: () => this.open,
				getPlacement: () => 'bottom-start',
				gap: 4,
				portal: false,
			});
		}
		return this.popoverController;
	}

	private syncPopoverPosition(): void {
		const popover = this.popoverTarget;
		if (!popover || !this.rootTarget) {
			return;
		}
		popover.hidden = !this.open;
		const controller = this.ensurePopoverController();
		controller.updateConfig({
			getOpen: () => this.open,
		});
		controller.sync();
	}

	private wireInputNames(): void {
		const startInput = this.getStartInput();
		const endInput = this.getEndInput();
		if (startInput && this.startName) {
			startInput.name = this.startName;
		}
		if (endInput && this.endName) {
			endInput.name = this.endName;
		}
	}

	private initialize(): void {
		this.wireInputNames();
		this.syncDisplayValues();
		this.setOpen(false);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.initialize());
	}

	override disconnectedCallback(): void {
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	@onUpdated([
		'value',
		'min',
		'max',
		'disabled',
		'readOnly',
		'locale',
		'dateStyle',
		'startName',
		'endName',
		'visibleMonths',
	])
	onPropsUpdated(): void {
		this.wireInputNames();
		this.syncDisplayValues();
	}

	@onUpdated(['open'])
	onOpenUpdated(): void {
		this.syncPopoverPosition();
	}

	@onEvent({ ref: 'trigger', type: 'pointerdown' })
	onTriggerPointerDown(): void {
		this.suppressPopoverDismiss = true;
	}

	@onEvent({ ref: 'trigger', type: 'click' })
	onTriggerClick(): void {
		if (this.disabled || this.readOnly) {
			return;
		}
		this.setOpen(!this.open);
	}

	@onEvent({ selector: '[data-range-start]', type: 'focus' })
	onStartFocus(): void {
		this.editing = 'start';
		const range = parseIsoRange(this.isoValue);
		const input = this.getStartInput();
		if (input) {
			input.value = range?.start ? this.formatIso(range.start) : '';
		}
	}

	@onEvent({ selector: '[data-range-end]', type: 'focus' })
	onEndFocus(): void {
		this.editing = 'end';
		const range = parseIsoRange(this.isoValue);
		const input = this.getEndInput();
		if (input) {
			input.value = range?.end ? this.formatIso(range.end) : '';
		}
	}

	@onEvent({ selector: '[data-range-start], [data-range-end]', type: 'blur' })
	onInputBlur(): void {
		this.editing = null;
		this.commitFromInputs();
	}

	@onEvent({ selector: '[data-range-start], [data-range-end]', type: 'input' })
	onInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (input.matches('[data-range-start]')) {
			this.startDisplay = input.value;
			return;
		}
		this.endDisplay = input.value;
	}

	@onEvent({ selector: '[data-range-popover]', type: 'mousedown' })
	onPopoverMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ ref: 'root', type: 'rui-change' })
	onCalendarChange(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLElement) || target.tagName.toLowerCase() !== 'rui-calendar') {
			return;
		}

		const detail = (event as CustomEvent<RuiCalendarChangeDetail>).detail;
		if (!detail?.start || !detail.end) {
			return;
		}
		this.commitRange(detail.start, detail.end);
		this.setOpen(false);
	}

	@onEvent({ ref: 'root', type: 'keydown' })
	onRootKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && this.open) {
			event.preventDefault();
			this.setOpen(false);
		}
	}

	@onEvent({ ref: 'root', type: 'focusout' })
	onRootFocusOut(event: FocusEvent): void {
		const relatedTarget = event.relatedTarget;

		queueMicrotask(() => {
			if (this.suppressPopoverDismiss) {
				this.suppressPopoverDismiss = false;
				return;
			}

			if (!this.open) {
				return;
			}

			const next = relatedTarget instanceof Node ? relatedTarget : document.activeElement;
			if (!shouldDismissPopoverFocus(this.rootTarget, this.popoverTarget, next)) {
				return;
			}
			this.setOpen(false);
		});
	}

	override render() {
		const calendarProps = {
			'prop:selectionMode': 'range',
			'prop:visibleMonths': this.visibleMonths,
			'prop:value': this.isoValue,
			'prop:min': this.min,
			'prop:max': this.max,
			'prop:locale': this.locale,
			'prop:disabled': this.disabled,
		};

		return (
			<div class="rui-date-range-picker" data-ref="root">
				<div class="rui-date-range-picker__group">
					<div class="rui-date-range-picker__values">
						<input
							type="text"
							class="rui-date-range-picker__input"
							data-range-start
							data-rui-control
							data-rui-control-type="text"
							id={`${this.uid}-start`}
							autocomplete="off"
							disabled={this.$.disabled}
							readOnly={this.$.readOnly}
							placeholder={this.placeholderStart || 'Start date'}
						/>
						<span class="rui-date-range-picker__separator" aria-hidden="true">
							–
						</span>
						<input
							type="text"
							class="rui-date-range-picker__input"
							data-range-end
							data-rui-control
							data-rui-control-type="text"
							id={`${this.uid}-end`}
							autocomplete="off"
							disabled={this.$.disabled}
							readOnly={this.$.readOnly}
							placeholder={this.placeholderEnd || 'End date'}
						/>
					</div>
					<button
						type="button"
						class="rui-control-toggle"
						data-ref="trigger"
						data-range-trigger
						aria-label="Open calendar"
						aria-haspopup="dialog"
						aria-expanded={this.open ? 'true' : 'false'}
						disabled={this.$.disabled || this.$.readOnly}
					>
						<RuiIconCalendar />
					</button>
				</div>
				<div
					class="rui-date-range-picker__popover rui-popover rui-floating"
					data-ref="popover"
					data-range-popover
					hidden={!this.open}
					role="dialog"
				>
					{this.open ? <rui-calendar {...calendarProps} /> : null}
				</div>
			</div>
		);
	}
}
