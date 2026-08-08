import { RadiantElement, customElement, event, onEvent, onUpdated, prop, query, state } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { dateToIso, formatDisplayDate, isoToDate, parseLocaleDateString } from '@/lib/intl-date';
import type { DateDisplayStyle } from '@/lib/intl-date';
import { RuiIconCalendar } from '@/lib/icons';
import { resolveLocale } from '@/lib/intl/locale';
import type { RuiCalendarChangeDetail } from '../calendar/calendar.script';
import '../calendar/calendar.script';
import { PopoverController, shouldDismissPopoverFocus } from '../shared/popover-controller';
import { syncFieldLabel } from '../shared/field-label';
import {
	applyDateMask,
	buildDateMaskPattern,
	extractDateMaskDigits,
	getDefaultDatePlaceholder,
	getNumericPartOrder,
	maskDigitCapacity,
} from '@/lib/mask';

export type RuiDateFieldProps = {
	value?: string;
	min?: string;
	max?: string;
	disabled?: boolean;
	readOnly?: boolean;
	label?: string;
	name?: string;
	placeholder?: string;
	/** BCP 47 locale tag, or comma-separated fallback list (e.g. `en-US,en`). */
	locale?: string;
	/** How the committed value is shown when the field is not being edited. */
	dateStyle?: DateDisplayStyle;
	/**
	 * When true (default), digits are guided by a locale mask while typing (`08/21/2002`).
	 * When false, free text is accepted (`Aug 21, 2002`, `2022/08/22`, …) and parsed on blur.
	 */
	masked?: boolean;
	/** Month grids shown in the calendar popover. @default 1 */
	visibleMonths?: number;
};

export type RuiDateFieldChangeDetail = { value: string };

type RuiDateFieldBindings = {
	value: string;
	disabled: boolean;
	readOnly: boolean;
	label: string;
	name: string;
	placeholder: string;
	displayValue: string;
	open: boolean;
};

/**
 * `<rui-date-field>` — a locale-aware date text field powered by `Intl`.
 *
 * While typing, optional digit masking follows the locale pattern from `formatToParts()`.
 * On blur, values are parsed flexibly (numeric, masked, or month names like "Aug 21, 2002")
 * and displayed with `dateStyle`. Canonical `value` is ISO `YYYY-MM-DD`.
 *
 * A calendar button toggles a popover grid for picking dates.
 *
 * @see https://react-aria.adobe.com/DatePicker
 * @element rui-date-field
 * @fires rui-change
 */
@customElement('rui-date-field')
export class RuiDateField extends RadiantElement<RuiDateFieldBindings> {
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, defaultValue: '' }) min: string;
	@prop({ type: String, defaultValue: '' }) max: string;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false }) readOnly: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, defaultValue: '' }) name: string;
	@prop({ type: String, defaultValue: '' }) placeholder: string;
	@prop({ type: String, defaultValue: '' }) locale: string;
	@prop({ type: String, attribute: 'date-style', defaultValue: 'medium' }) dateStyle: DateDisplayStyle;
	@prop({ type: Boolean, reflect: true, defaultValue: true }) masked: boolean;
	@prop({ type: Number, attribute: 'visible-months', defaultValue: 1 }) visibleMonths: number;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiDateFieldChangeDetail>;

	@state displayValue = '';
	@state editing = false;
	@state open = false;

	private readonly uid = Math.random().toString(36).slice(2, 9);
	private popoverController: PopoverController | null = null;
	private suppressPopoverDismiss = false;

	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'popover' }) popoverTarget: HTMLElement;

	private get isoValue(): string {
		return this.value ?? '';
	}

	private get resolvedLocale(): string | string[] | undefined {
		return resolveLocale(this.locale);
	}

	private get inputId(): string {
		return `rui-date-field-input-${this.uid}`;
	}

	private get resolvedPlaceholder(): string {
		return this.placeholder || getDefaultDatePlaceholder(this.resolvedLocale);
	}

	private getInput(): HTMLInputElement | null {
		return this.querySelector<HTMLInputElement>('[data-date-field-input]');
	}

	private syncLabel(): void {
		const input = this.getInput();
		syncFieldLabel(this, input, {
			controlId: this.inputId,
			label: this.label,
			labelId: `rui-date-field-label-${this.uid}`,
		});
	}

	private syncInput(): void {
		const input = this.getInput();
		if (!input) {
			return;
		}

		if (!input.id) {
			input.id = this.inputId;
		}

		if (this.name) {
			input.name = this.name;
		}
		if (this.disabled) {
			input.disabled = true;
		}

		const placeholder = this.resolvedPlaceholder;
		if (placeholder) {
			input.placeholder = placeholder;
		}
	}

	private formatForDisplay(iso: string): string {
		if (!iso) {
			return '';
		}
		const date = isoToDate(iso);
		if (!date) {
			return '';
		}
		return formatDisplayDate(date, this.resolvedLocale, this.dateStyle);
	}

	private formatForEditing(iso: string): string {
		if (!iso) {
			return '';
		}
		if (!this.masked) {
			return this.formatForDisplay(iso);
		}
		const date = isoToDate(iso);
		if (!date) {
			return '';
		}
		const pattern = buildDateMaskPattern(this.resolvedLocale);
		const digits = dateToMaskDigits(date, this.resolvedLocale);
		return applyDateMask(digits, pattern);
	}

	private syncDisplayValue(): void {
		if (this.editing) {
			return;
		}
		this.displayValue = this.formatForDisplay(this.isoValue);
		const input = this.getInput();
		if (input) {
			input.value = this.displayValue;
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

	private commitValue(iso: string): void {
		if (iso && !this.isIsoAllowed(iso)) {
			this.syncDisplayValue();
			return;
		}

		if (iso === this.isoValue) {
			this.syncDisplayValue();
			return;
		}

		this.value = iso;
		this.changeEvent.emit({ value: iso });
		this.syncDisplayValue();
	}

	private parseAndCommit(raw: string | null | undefined): void {
		const trimmed = (raw ?? '').trim();
		if (!trimmed) {
			this.commitValue('');
			return;
		}

		const parsed = parseLocaleDateString(trimmed, this.resolvedLocale);
		if (!parsed) {
			this.syncDisplayValue();
			return;
		}

		this.commitValue(dateToIso(parsed));
	}

	private handleMaskedInput(raw: string): string {
		const pattern = buildDateMaskPattern(this.resolvedLocale);
		const digits = extractDateMaskDigits(raw);
		const masked = applyDateMask(digits, pattern);
		if (digits.length >= maskDigitCapacity(pattern)) {
			this.parseAndCommit(masked);
		}
		return masked;
	}

	private initialize(): void {
		this.syncLabel();
		this.syncInput();
		this.syncDisplayValue();
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

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.initialize());
	}

	override disconnectedCallback(): void {
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'min', 'max', 'label', 'placeholder', 'disabled', 'readOnly', 'locale', 'dateStyle', 'masked'])
	onPropsUpdated(): void {
		this.syncLabel();
		this.syncInput();
		this.syncDisplayValue();
	}

	@onUpdated(['open'])
	onOpenUpdated(): void {
		this.syncPopoverPosition();
	}

	@onEvent({ selector: '[data-date-field-input]', type: 'focusin' })
	onInputFocus(): void {
		this.editing = true;
		const input = this.getInput();
		if (!input) {
			return;
		}
		input.value = this.isoValue ? this.formatForEditing(this.isoValue) : '';
		this.displayValue = input.value;
	}

	@onEvent({ selector: '[data-date-field-input]', type: 'input' })
	onInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (this.masked) {
			const masked = this.handleMaskedInput(input.value);
			input.value = masked;
			this.displayValue = masked;
			return;
		}
		this.displayValue = input.value;
	}

	@onEvent({ selector: '[data-date-field-input]', type: 'change' })
	onInputChange(): void {
		const input = this.getInput();
		if (input) {
			this.parseAndCommit(input.value);
		}
	}

	@onEvent({ selector: '[data-date-field-input]', type: 'keydown' })
	onInputKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			if (this.open) {
				event.preventDefault();
				this.setOpen(false);
				return;
			}
			this.editing = false;
			this.syncDisplayValue();
		}
	}

	@onEvent({ ref: 'root', type: 'focusout' })
	onRootFocusOut(event: FocusEvent): void {
		const target = event.target as HTMLElement;
		const relatedTarget = event.relatedTarget;

		if (target.matches('[data-date-field-input]') && target.localName === 'input') {
			const input = target as HTMLInputElement;
			queueMicrotask(() => {
				if (!this.editing) {
					return;
				}
				this.editing = false;
				this.parseAndCommit(input.value);
			});
		}

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

	@onEvent({ selector: '[data-date-field-popover]', type: 'mousedown' })
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
		if (!detail?.value) {
			return;
		}
		this.commitValue(detail.value);
		this.setOpen(false);
	}

	@onEvent({ ref: 'root', type: 'keydown' })
	onRootKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && this.open) {
			event.preventDefault();
			this.setOpen(false);
		}
	}

	override render() {
		const calendarProps = {
			'prop:selectionMode': 'single',
			'prop:visibleMonths': this.visibleMonths,
			'prop:value': this.isoValue,
			'prop:min': this.min,
			'prop:max': this.max,
			'prop:locale': this.locale,
			'prop:disabled': this.disabled,
		};

		return (
			<div class="rui-date-field" data-ref="root">
				<div class="rui-date-field__group">
					<input
						type="text"
						data-date-field-input
						data-rui-control
						data-rui-control-type="text"
						class="rui-date-field__input"
						id={this.inputId}
						autocomplete="off"
						inputmode={this.masked ? 'numeric' : 'text'}
						disabled={this.$.disabled}
						readOnly={this.$.readOnly}
						placeholder={this.$.placeholder || this.resolvedPlaceholder}
					/>
					<button
						type="button"
						class="rui-control-toggle"
						data-ref="trigger"
						data-date-field-trigger
						aria-label="Open calendar"
						aria-haspopup="dialog"
						aria-expanded={this.open ? 'true' : 'false'}
						disabled={this.$.disabled || this.$.readOnly}
					>
						<RuiIconCalendar />
					</button>
				</div>
				<div
					class="rui-date-field__popover rui-popover rui-floating"
					data-ref="popover"
					data-date-field-popover
					hidden={!this.open}
					role="dialog"
				>
					{this.open ? <rui-calendar {...calendarProps} /> : null}
				</div>
			</div>
		);
	}
}

function dateToMaskDigits(date: Date, locale: string | string[] | undefined): string {
	const order = getNumericPartOrder(locale);
	const values = {
		month: String(date.getMonth() + 1).padStart(2, '0'),
		day: String(date.getDate()).padStart(2, '0'),
		year: String(date.getFullYear()),
	};
	return order.map((part) => values[part]).join('');
}
