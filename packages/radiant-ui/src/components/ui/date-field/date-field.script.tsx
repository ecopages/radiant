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
import { effectiveVisibleMonths, listenMobileLayoutViewport } from '@/lib/viewport/mobile-layout';
import { uniqueId } from '@/lib/unique-id';
import type { RuiCalendarChangeDetail } from '../calendar/calendar.script';
import type { RuiDateInputChangeDetail } from '../date-input/date-input.script';
import { CalendarPopoverBehavior } from '../shared/calendar-popover-behavior';
import { syncFieldLabel } from '../shared/field-label';

export type RuiDateFieldProps = {
	value?: string;
	min?: string;
	max?: string;
	disabled?: boolean;
	readOnly?: boolean;
	label?: string;
	name?: string;
	/** BCP 47 locale tag, or comma-separated fallback list (e.g. `en-US,en`). */
	locale?: string;
	/** Month grids shown in the calendar popover. @default 1 */
	visibleMonths?: number;
};

export type RuiDateFieldChangeDetail = { value: string };

/**
 * `<rui-date-field>` — locale-aware date segments with an optional calendar popup.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiDateField*` view helpers which stamp the same targets.
 * `RuiDateField` supplies the default composition when it has no children.
 *
 * Canonical `value` is ISO `YYYY-MM-DD`.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-date-field-input]` — nested `rui-date-input`. Host syncs `value`, `name`,
 *   `locale`, `min`, `max`, `disabled`, and `read-only`.
 * - `[data-date-field-trigger]` — calendar toggle (`data-ref="trigger"`). Host sets
 *   `aria-expanded` and `disabled`.
 * - `[data-date-field-popover]` — popup shell (`data-ref="popover"`). Host sets `hidden`.
 * - `[data-date-field-calendar]` — nested `rui-calendar`. Host syncs `selection-mode`,
 *   `visible-months`, `value`, `min`, `max`, `locale`, and `disabled`.
 *
 * Nested hosts:
 * - `rui-date-input` at `[data-date-field-input]` — segment editor; listen for
 *   `rui-change` and `rui-form-reset` to keep the parent value aligned.
 * - `rui-calendar` at `[data-date-field-calendar]` — parent queries day targets when the popup opens.
 *
 * Do not set `aria-expanded` on the trigger — the host owns it.
 *
 * @see https://react-aria.adobe.com/DatePicker
 * @element rui-date-field
 * @attr {string} value - Canonical ISO `YYYY-MM-DD` value. Default: `''`.
 * @attr {string} min - Earliest selectable ISO date. Default: `''`.
 * @attr {string} max - Latest selectable ISO date. Default: `''`.
 * @attr {boolean} disabled - Disable the field and calendar. Default: `false`.
 * @attr {boolean} read-only - Disable editing while keeping the value visible. Default: `false`.
 * @attr {string} label - Accessible name when there is no associated label. Default: `''`.
 * @attr {string} name - Form field name on the nested `rui-date-input`. Default: `''`.
 * @attr {string} locale - BCP 47 locale tag, or comma-separated fallback list. Default: `''`.
 * @attr {number} visible-months - Month grids in the popover (adapts to 1 on screens under 640px when greater than 1). Default: `1`.
 * @fires rui-change - Emitted when a valid date is committed (typing or calendar pick).
 *
 * @remarks
 * BEM classes live on the view helpers; the host never queries them.
 */
@customElement('rui-date-field')
export class RuiDateField extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' })
	@bindTo([
		{ selector: '[data-date-field-input]', attr: 'value' },
		{ selector: '[data-date-field-calendar]', attr: 'value' },
	])
	value: string;
	@prop({ type: String, defaultValue: '' })
	@bindTo([
		{ selector: '[data-date-field-input]', attr: 'min' },
		{ selector: '[data-date-field-calendar]', attr: 'min' },
	])
	min: string;
	@prop({ type: String, defaultValue: '' })
	@bindTo([
		{ selector: '[data-date-field-input]', attr: 'max' },
		{ selector: '[data-date-field-calendar]', attr: 'max' },
	])
	max: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([
		{ selector: '[data-date-field-input]', bool: 'disabled' },
		{ selector: '[data-date-field-calendar]', bool: 'disabled' },
	])
	disabled: boolean;

	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false })
	@bindTo({ selector: '[data-date-field-input]', bool: 'read-only' })
	readOnly: boolean;

	@prop({ type: String, defaultValue: '' }) label: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo({ selector: '[data-date-field-input]', attr: 'name' })
	name: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo([
		{ selector: '[data-date-field-input]', attr: 'locale' },
		{ selector: '[data-date-field-calendar]', attr: 'locale' },
	])
	locale: string;
	@prop({ type: Number, attribute: 'visible-months', defaultValue: 1 })
	visibleMonths: number;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiDateFieldChangeDetail>;

	@state
	@bindTo({ selector: '[data-date-field-trigger]', attr: 'aria-expanded' })
	open = false;

	private readonly uid = uniqueId('rui-date-field');
	private readonly calendarPopover = new CalendarPopoverBehavior({
		getHost: () => this,
		getAnchor: () => this.getToggle()?.parentElement ?? this,
		getFloating: () => this.popoverTarget,
		getOpen: () => this.open,
		getCalendar: () => this.getCalendar(),
		getFocusIso: () => this.isoValue || undefined,
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

	private get inputId(): string {
		return `${this.uid}-input`;
	}

	private getDateInput(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-date-field-input]');
	}

	private getToggle(): HTMLButtonElement | null {
		return this.querySelector<HTMLButtonElement>('[data-date-field-trigger]');
	}

	private getCalendar(): HTMLElement | null {
		return this.querySelector<HTMLElement>('[data-date-field-calendar]');
	}

	private syncLabel(): void {
		const input = this.getDateInput();
		syncFieldLabel(this, input, {
			controlId: this.inputId,
			label: this.label,
			labelId: `${this.uid}-label`,
		});
	}

	private syncInput(): void {
		const input = this.getDateInput();
		if (!input?.id) {
			input?.setAttribute('id', this.inputId);
		}
	}

	private syncToggle(): void {
		const toggle = this.getToggle();
		if (!toggle) {
			return;
		}

		toggle.disabled = this.disabled || this.readOnly;
	}

	private commitValue(iso: string): void {
		if (iso === this.isoValue) {
			return;
		}

		this.value = iso;
		this.changeEvent.emit({ value: iso });
	}

	private syncCalendar(): void {
		const calendar = this.getCalendar();
		if (!calendar) {
			return;
		}
		calendar.setAttribute('selection-mode', 'single');
		calendar.setAttribute('visible-months', String(effectiveVisibleMonths(this.visibleMonths)));
	}

	private initialize(): void {
		this.syncLabel();
		this.syncInput();
		this.syncToggle();
		this.syncCalendar();
		this.setOpen(false);
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

	@onUpdated(['value', 'min', 'max', 'label', 'disabled', 'readOnly', 'locale', 'visibleMonths'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.syncToggle();
		this.syncCalendar();
	}

	@onUpdated(['open'])
	onOpenUpdated(): void {
		this.syncToggle();
		this.calendarPopover.syncPopover();
	}

	@onEvent({ selector: '[data-date-field-input]', type: 'rui-change' })
	onDateInputChange(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLElement) || !target.matches('[data-date-field-input]')) {
			return;
		}
		const detail = (event as CustomEvent<RuiDateInputChangeDetail>).detail;
		this.commitValue(detail?.value ?? '');
	}

	@onEvent({ selector: '[data-date-field-input]', type: 'rui-form-reset' })
	onDateInputReset(): void {
		const input = this.getDateInput();
		const value = input && Reflect.get(input, 'value');
		this.value = typeof value === 'string' ? value : '';
	}

	@onEvent({
		selector: '[data-date-field-input], [data-date-field-trigger], [data-date-field-popover]',
		type: 'focusout',
	})
	onRootFocusOut(event: FocusEvent): void {
		this.calendarPopover.handleFocusOut(event, () => this.setOpen(false));
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

	@onEvent({ selector: '[data-date-field-popover]', type: 'mousedown' })
	onPopoverMouseDown(event: Event): void {
		event.preventDefault();
	}

	@onEvent({ selector: '[data-date-field-calendar]', type: 'rui-change' })
	onCalendarChange(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLElement) || !target.matches('[data-date-field-calendar]')) {
			return;
		}

		const detail = (event as CustomEvent<RuiCalendarChangeDetail>).detail;
		if (!detail?.value) {
			return;
		}
		this.commitValue(detail.value);
		this.setOpen(false);
	}

	@onEvent({
		selector: '[data-date-field-input], [data-date-field-trigger], [data-date-field-calendar]',
		type: 'keydown',
	})
	onRootKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && this.open) {
			event.preventDefault();
			this.setOpen(false);
		}
	}
}
