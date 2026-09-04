import { RadiantElement, bindTo, customElement, event, onEvent, onUpdated, prop, query, state } from '@ecopages/radiant';
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
import type { RuiCalendarChangeDetail } from '../calendar/calendar.script';
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

/**
 * `<rui-date-range-picker>` — start/end date fields with a range calendar popover.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiDateRangePicker*` view helpers which stamp the same targets.
 * `RuiDateRangePicker` supplies the default composition when it has no children.
 *
 * Canonical `value` is `YYYY-MM-DD/YYYY-MM-DD`. Pair with `RuiField` for validation.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-range-start]` — start text input. Host sets `name`, `disabled`, `readOnly`,
 *   and `placeholder`.
 * - `[data-range-end]` — end text input. Host sets the same attrs as the start input.
 * - `[data-range-trigger]` — calendar toggle (`data-ref="trigger"`). Host sets
 *   `aria-expanded` and `disabled`.
 * - `[data-range-popover]` — popup shell (`data-ref="popover"`). Host sets `hidden`.
 * - `[data-range-calendar]` — nested `rui-calendar` in range mode. Host syncs
 *   `selection-mode="range"`, `visible-months`, `value`, `min`, `max`, `locale`,
 *   and `disabled`.
 *
 * Nested hosts:
 * - `rui-calendar` at `[data-range-calendar]` — parent queries
 *   `[data-calendar-day][data-iso="…"]` and `[data-calendar-day][tabindex="0"]`
 *   inside it when the popup opens; listens for `rui-change`.
 *
 * Do not set `aria-expanded` on the trigger — the host owns it.
 *
 * @remarks
 * Range entry is intentionally free-text plus calendar based. Masked segment editing
 * is currently limited to `RuiDateField` so two range inputs do not maintain separate
 * partial-mask state. BEM classes live on the view helpers.
 *
 * @see https://react-aria.adobe.com/DateRangePicker
 * @element rui-date-range-picker
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
 * @fires rui-change - Emitted when a valid range is committed; detail carries `value`, `start`, and `end`.
 */
@customElement('rui-date-range-picker')
export class RuiDateRangePicker extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) min: string;
	@prop({ type: String, defaultValue: '' }) max: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-range-start]', prop: 'disabled' },
		{ selector: '[data-range-end]', prop: 'disabled' },
		{ selector: '[data-range-calendar]', bool: 'disabled' },
	])
	disabled: boolean;

	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-range-start]', prop: 'readOnly' },
		{ selector: '[data-range-end]', prop: 'readOnly' },
	])
	readOnly: boolean;

	@prop({ type: String, defaultValue: '' }) locale: string;

	@prop({ type: String, attribute: 'placeholder-start', defaultValue: '' })
	@bindTo({
		selector: '[data-range-start]',
		prop: 'placeholder',
		map: (value) => value || 'Start date',
	})
	placeholderStart: string;

	@prop({ type: String, attribute: 'placeholder-end', defaultValue: '' })
	@bindTo({
		selector: '[data-range-end]',
		prop: 'placeholder',
		map: (value) => value || 'End date',
	})
	placeholderEnd: string;

	@prop({ type: String, attribute: 'start-name', defaultValue: '' })
	@bindTo({ selector: '[data-range-start]', prop: 'name' })
	startName: string;

	@prop({ type: String, attribute: 'end-name', defaultValue: '' })
	@bindTo({ selector: '[data-range-end]', prop: 'name' })
	endName: string;

	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, attribute: 'date-style', defaultValue: 'medium' }) dateStyle: DateDisplayStyle;
	@prop({ type: Number, attribute: 'visible-months', defaultValue: 2 }) visibleMonths: number;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiDateRangePickerChangeDetail>;

	@state
	@bindTo({ selector: '[data-range-trigger]', attr: 'aria-expanded' })
	open = false;

	@state startDisplay = '';
	@state endDisplay = '';
	@state editing: EditingField = null;

	private popoverController: PopoverController | null = null;
	private suppressPopoverDismiss = false;

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

	private getToggle(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-range-trigger]');
	}

	private getCalendar(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-range-calendar]');
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
		queueMicrotask(() => {
			this.syncCalendar();
			this.syncPopoverPosition();
			if (next) {
				this.focusCalendarDay();
			}
		});
	}

	/** Focus the calendar's roving day, falling back to its first available day. */
	private focusCalendarDay(): void {
		requestAnimationFrame(() => {
			if (!this.open) {
				return;
			}

			const calendar = this.getCalendar();
			const start = parseIsoRange(this.isoValue)?.start;
			const selectedDay = start
				? calendar?.querySelector<HTMLButtonElement>(`[data-calendar-day][data-iso="${start}"]:not(:disabled)`)
				: null;
			(
				selectedDay ??
				calendar?.querySelector<HTMLButtonElement>(
					'[data-calendar-day][tabindex="0"]:not(:disabled), [data-calendar-day]:not(:disabled)',
				)
			)?.focus();
		});
	}

	private ensurePopoverController(): PopoverController {
		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: () => this.getToggle()?.parentElement ?? this,
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
		if (!popover) {
			return;
		}
		popover.hidden = !this.open;
		const controller = this.ensurePopoverController();
		controller.updateConfig({
			getOpen: () => this.open,
		});
		controller.sync();
	}

	private syncToggle(): void {
		const toggle = this.getToggle();
		if (!toggle) {
			return;
		}

		toggle.disabled = this.disabled || this.readOnly;
	}

	private syncCalendar(): void {
		const calendar = this.getCalendar();
		if (!calendar) {
			return;
		}

		calendar.setAttribute('selection-mode', 'range');
		calendar.setAttribute('visible-months', String(this.visibleMonths));
		calendar.setAttribute('value', this.isoValue);
		calendar.setAttribute('min', this.min);
		calendar.setAttribute('max', this.max);
		calendar.setAttribute('locale', this.locale);
	}

	private initialize(): void {
		this.syncDisplayValues();
		this.syncToggle();
		this.syncCalendar();
		this.setOpen(false);
	}

	protected override onConnected(): void {
		this.initialize();
	}

	override disconnectedCallback(): void {
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'min', 'max', 'disabled', 'readOnly', 'locale', 'dateStyle', 'visibleMonths'])
	onPropsUpdated(): void {
		this.syncDisplayValues();
		this.syncToggle();
		this.syncCalendar();
	}

	@onUpdated(['open'])
	onOpenUpdated(): void {
		this.syncToggle();
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

	@onEvent({ selector: '[data-range-calendar]', type: 'rui-change' })
	onCalendarChange(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLElement) || !target.matches('[data-range-calendar]')) {
			return;
		}

		const detail = (event as CustomEvent<RuiCalendarChangeDetail>).detail;
		if (!detail?.start || !detail.end) {
			return;
		}
		this.commitRange(detail.start, detail.end);
		this.setOpen(false);
	}

	@onEvent({
		selector: '[data-range-start], [data-range-end], [data-range-trigger], [data-range-calendar]',
		type: 'keydown',
	})
	onRootKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && this.open) {
			event.preventDefault();
			this.setOpen(false);
		}
	}

	@onEvent({
		selector: '[data-range-start], [data-range-end], [data-range-trigger], [data-range-popover]',
		type: 'focusout',
	})
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
			if (!shouldDismissPopoverFocus(this, this.popoverTarget, next)) {
				return;
			}
			this.setOpen(false);
		});
	}
}
