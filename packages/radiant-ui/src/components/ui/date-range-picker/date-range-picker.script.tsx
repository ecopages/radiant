import {
	RadiantElement,
	bindTo,
	customElement,
	event,
	onEvent,
	onUpdated,
	prop,
	query,
	state,
} from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { isIsoInRange, parseIsoRange, serializeIsoRange } from '@/lib/intl-date';
import type { RuiCalendarChangeDetail } from '../calendar/calendar.script';
import { CalendarPopoverBehavior } from '../shared/calendar-popover-behavior';
import { effectiveVisibleMonths, listenMobileLayoutViewport } from '@/lib/viewport/mobile-layout';

export type RuiDateRangePickerProps = {
	value?: string;
	min?: string;
	max?: string;
	disabled?: boolean;
	readOnly?: boolean;
	locale?: string;
	startName?: string;
	endName?: string;
	name?: string;
	visibleMonths?: number;
};

export type RuiDateRangePickerChangeDetail = {
	value: string;
	start: string;
	end: string;
};

/**
 * `<rui-date-range-picker>` — start/end date segments with a range calendar popover.
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
 * - `[data-range-start]` — nested `rui-date-input` for the start date. Host sets
 *   `name`, `locale`, `min`, `max`, `disabled`, and `read-only`. Writes `value`
 *   only when committing a complete range.
 * - `[data-range-end]` — nested `rui-date-input` for the end date. Same host writes
 *   as start.
 * - `[data-range-trigger]` — calendar toggle (`data-ref="trigger"`). Host sets
 *   `aria-expanded` and `disabled`.
 * - `[data-range-popover]` — popup shell (`data-ref="popover"`). Host sets `hidden`.
 * - `[data-range-calendar]` — nested `rui-calendar` in range mode. Host syncs
 *   `selection-mode="range"`, `visible-months`, `value`, `min`, `max`, `locale`,
 *   and `disabled`.
 *
 * Nested hosts:
 * - `rui-date-input` at start/end — listen for `rui-change` and `rui-form-reset`.
 *   Nested inputs own in-progress segment state until both sides are a valid ISO date.
 * - `rui-calendar` at `[data-range-calendar]` — parent queries day targets when the popup opens.
 *
 * Do not set `aria-expanded` on the trigger — the host owns it.
 *
 * @see https://react-aria.adobe.com/DateRangePicker
 * @element rui-date-range-picker
 * @attr {string} value - Canonical `YYYY-MM-DD/YYYY-MM-DD` range. Default: `''`.
 * @attr {string} min - Earliest selectable ISO date. Default: `''`.
 * @attr {string} max - Latest selectable ISO date. Default: `''`.
 * @attr {boolean} disabled - Disable both inputs and the calendar. Default: `false`.
 * @attr {boolean} read-only - Disable editing while keeping values visible. Default: `false`.
 * @attr {string} locale - BCP 47 locale tag, or comma-separated fallback list. Default: `''`.
 * @attr {string} start-name - Form field name on the nested start `rui-date-input`. Default: `''`.
 * @attr {string} end-name - Form field name on the nested end `rui-date-input`. Default: `''`.
 * @attr {number} visible-months - Month grids shown in the range calendar popover (adapts to 1 on screens under 640px). Default: `2`.
 * @fires rui-change - Emitted when a valid range is committed, or when a committed range is cleared; detail carries `value`, `start`, and `end`.
 */
@customElement('rui-date-range-picker')
export class RuiDateRangePicker extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' })
	@bindTo({ selector: '[data-range-calendar]', attr: 'value' })
	value: string;
	@prop({ type: String, defaultValue: '' })
	@bindTo([
		{ selector: '[data-range-start]', attr: 'min' },
		{ selector: '[data-range-end]', attr: 'min' },
		{ selector: '[data-range-calendar]', attr: 'min' },
	])
	min: string;
	@prop({ type: String, defaultValue: '' })
	@bindTo([
		{ selector: '[data-range-start]', attr: 'max' },
		{ selector: '[data-range-end]', attr: 'max' },
		{ selector: '[data-range-calendar]', attr: 'max' },
	])
	max: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-range-start]', bool: 'disabled' },
		{ selector: '[data-range-end]', bool: 'disabled' },
		{ selector: '[data-range-calendar]', bool: 'disabled' },
	])
	disabled: boolean;

	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-range-start]', bool: 'read-only' },
		{ selector: '[data-range-end]', bool: 'read-only' },
	])
	readOnly: boolean;

	@prop({ type: String, defaultValue: '' })
	@bindTo([
		{ selector: '[data-range-start]', attr: 'locale' },
		{ selector: '[data-range-end]', attr: 'locale' },
		{ selector: '[data-range-calendar]', attr: 'locale' },
	])
	locale: string;

	@prop({ type: String, attribute: 'start-name', defaultValue: '' })
	@bindTo({ selector: '[data-range-start]', attr: 'name' })
	startName: string;

	@prop({ type: String, attribute: 'end-name', defaultValue: '' })
	@bindTo({ selector: '[data-range-end]', attr: 'name' })
	endName: string;

	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: Number, attribute: 'visible-months', defaultValue: 2 })
	visibleMonths: number;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiDateRangePickerChangeDetail>;

	@state
	@bindTo({ selector: '[data-range-trigger]', attr: 'aria-expanded' })
	open = false;

	private readonly calendarPopover = new CalendarPopoverBehavior({
		getHost: () => this,
		getAnchor: () => this.getToggle()?.parentElement ?? this,
		getFloating: () => this.popoverTarget,
		getOpen: () => this.open,
		getCalendar: () => this.getCalendar(),
		getFocusIso: () => parseIsoRange(this.isoValue)?.start,
	});
	private disposeMobileLayoutListener: (() => void) | null = null;

	@query({ ref: 'popover' }) popoverTarget: HTMLElement;

	private readonly onMediaChange = (): void => {
		this.syncCalendar();
		if (this.open) {
			this.calendarPopover.syncPopover();
		}
	};

	private get isoValue(): string {
		return this.value ?? '';
	}

	private getStartInput(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-range-start]');
	}

	private getEndInput(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-range-end]');
	}

	private getToggle(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-range-trigger]');
	}

	private getCalendar(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-range-calendar]');
	}

	private readInputIso(target: 'start' | 'end'): string {
		const host = target === 'start' ? this.getStartInput() : this.getEndInput();
		if (!host) {
			return '';
		}
		const reflected = Reflect.get(host, 'value');
		if (typeof reflected === 'string') {
			return reflected;
		}
		return host.getAttribute('value') ?? '';
	}

	/**
	 * @remarks Nested inputs own draft segments. Projecting an empty host `value`
	 * onto them would wipe a start date typed before the end date exists.
	 */
	private projectCompleteRangeOntoInputs(): void {
		const range = parseIsoRange(this.isoValue);
		if (!range) {
			return;
		}
		this.getStartInput()?.setAttribute('value', range.start);
		this.getEndInput()?.setAttribute('value', range.end);
	}

	private commitRange(start: string, end: string): void {
		const min = this.min || undefined;
		const max = this.max || undefined;
		if ((start && !isIsoInRange(start, min, max)) || (end && !isIsoInRange(end, min, max))) {
			return;
		}

		const serialized = start && end ? serializeIsoRange({ start, end }) : '';
		if (serialized === this.isoValue) {
			return;
		}

		this.value = serialized;
		this.changeEvent.emit({ value: serialized, start, end });
	}

	private commitFromInputs(): void {
		const start = this.readInputIso('start');
		const end = this.readInputIso('end');
		if (start && end) {
			this.commitRange(start, end);
			return;
		}
		this.commitRange('', '');
	}

	private setOpen(next: boolean): void {
		this.open = next;
		queueMicrotask(() => {
			this.calendarPopover.syncPopover();
			if (next) {
				this.calendarPopover.focusCalendarDay();
			}
		});
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
		calendar.setAttribute('visible-months', String(effectiveVisibleMonths(this.visibleMonths)));
	}

	private initialize(): void {
		this.projectCompleteRangeOntoInputs();
		this.syncToggle();
		this.syncCalendar();
		this.setOpen(false);
	}

	protected override onConnected(): void {
		this.disposeMobileLayoutListener = listenMobileLayoutViewport(this.onMediaChange);
		this.initialize();
	}

	override disconnectedCallback(): void {
		this.disposeMobileLayoutListener?.();
		this.disposeMobileLayoutListener = null;
		this.calendarPopover.destroy();
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'min', 'max', 'disabled', 'readOnly', 'locale', 'visibleMonths'])
	onPropsUpdated(): void {
		this.projectCompleteRangeOntoInputs();
		this.syncToggle();
		this.syncCalendar();
	}

	@onUpdated(['open'])
	onOpenUpdated(): void {
		this.syncToggle();
		this.calendarPopover.syncPopover();
	}

	@onEvent({ selector: '[data-range-start], [data-range-end]', type: 'rui-change' })
	onDateInputChange(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}
		if (!target.matches('[data-range-start], [data-range-end]')) {
			return;
		}
		this.commitFromInputs();
	}

	@onEvent({ selector: '[data-range-start], [data-range-end]', type: 'rui-form-reset' })
	onDateInputReset(): void {
		queueMicrotask(() => {
			const start = this.readInputIso('start');
			const end = this.readInputIso('end');
			this.value = start && end ? serializeIsoRange({ start, end }) : '';
		});
	}

	@onEvent({ ref: 'trigger', type: 'pointerdown' })
	onTriggerPointerDown(): void {
		this.calendarPopover.suppressDismiss();
	}

	@onEvent({ ref: 'trigger', type: 'click' })
	onTriggerClick(): void {
		if (this.disabled || this.readOnly) {
			return;
		}
		this.setOpen(!this.open);
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
		this.calendarPopover.handleFocusOut(event, () => this.setOpen(false));
	}
}
