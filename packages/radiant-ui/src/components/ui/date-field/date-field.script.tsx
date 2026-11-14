import type { JSX_PROPS } from '@ecopages/jsx';
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
import { effectiveVisibleMonths } from '@/lib/viewport/mobile-layout';
import { uniqueId } from '@/lib/unique-id';
import type { RuiCalendarChangeDetail } from '../calendar/calendar.script';
import type { RuiDateInputChangeDetail } from '../date-input/date-input.script';
import { createCalendarPopoverController } from '../../../controllers/calendar-popover-controller';
import { createEventListenerController } from '../../../controllers/event-listener-controller';
import {
	portalContainerPropOptions,
	resolvePortalContainer,
	type RuiPortalContainer,
} from '../shared/portal-container';
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
	/** Render the calendar popup in `document.body`, or in `portalContainer`, while it is open. Default: `false`. */
	portal?: boolean;
	/** CSS selector of the element a portaled popup goes to, resolved when the popup opens. */
	portalContainer?: string;
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
 * @attr {boolean} portal - Render the calendar popup in `document.body`, or in `portal-container`, while it is open. Default: `false`.
 * @attr {string} portal-container - CSS selector of the element a portaled popup goes to, resolved each time it opens. The `portalContainer` property also takes an element or a function that returns one.
 * @fires rui-change - Emitted when a valid date is committed (typing or calendar pick).
 *
 * @remarks
 * BEM classes live on the view helpers; the host never queries them.
 */
@customElement('rui-date-field')
export class RuiDateField extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiDateFieldProps;
	@prop({ type: String, reflect: true, defaultValue: '' })
	@bindTo([{ selector: '[data-date-field-input]', attr: 'value' }])
	value: string;
	@prop({ type: String, defaultValue: '' })
	@bindTo([{ selector: '[data-date-field-input]', attr: 'min' }])
	min: string;
	@prop({ type: String, defaultValue: '' })
	@bindTo([{ selector: '[data-date-field-input]', attr: 'max' }])
	max: string;

	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo([{ selector: '[data-date-field-input]', bool: 'disabled' }])
	disabled: boolean;

	@prop({ type: Boolean, attribute: 'read-only', reflect: true, defaultValue: false })
	@bindTo({ selector: '[data-date-field-input]', bool: 'read-only' })
	readOnly: boolean;

	@prop({ type: String, defaultValue: '' }) label: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo({ selector: '[data-date-field-input]', attr: 'name' })
	name: string;

	@prop({ type: String, defaultValue: '' })
	@bindTo([{ selector: '[data-date-field-input]', attr: 'locale' }])
	locale: string;
	@prop({ type: Number, attribute: 'visible-months', defaultValue: 1 })
	visibleMonths: number;
	@prop({ type: Boolean, defaultValue: false }) portal: boolean;
	@prop(portalContainerPropOptions) portalContainer: RuiPortalContainer | null;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiDateFieldChangeDetail>;

	@state
	@bindTo({ selector: '[data-date-field-trigger]', attr: 'aria-expanded' })
	open = false;

	private readonly uid = uniqueId('rui-date-field');
	private readonly calendarPopover = createCalendarPopoverController(this, {
		getHost: () => this,
		getAnchor: () => this.getToggle()?.parentElement ?? this,
		getFloating: () => this.popoverTarget,
		getOpen: () => this.open,
		getCalendar: () => this.getCalendar(),
		getFocusIso: () => this.isoValue || undefined,
		getToggle: () => this.getToggle(),
		setOpenState: (next) => {
			this.open = next;
		},
		onLayoutChange: () => this.syncCalendar(),
		getPortalContainer: () => resolvePortalContainer(this.portalContainer),
	});

	/** @remarks Cached because a portaled popup is no longer inside the host to be found again. */
	@query({ ref: 'popover', cache: true }) popoverTarget: HTMLElement | null;

	/** @remarks The popup is a separate listener target, not host delegation, because a portaled popup is outside the host and its events never bubble through it. */
	constructor() {
		super();
		createEventListenerController(this, {
			getTarget: () => this.popoverTarget,
			type: ['mousedown', 'rui-change'],
			listener: (event) => this.onPopupEvent(event),
		});
	}

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
		return this.popoverTarget?.querySelector<HTMLElement>('[data-date-field-calendar]') ?? null;
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
		calendar.setAttribute('value', this.value);
		calendar.setAttribute('min', this.min);
		calendar.setAttribute('max', this.max);
		calendar.setAttribute('locale', this.locale);
		calendar.toggleAttribute('disabled', this.disabled);
		calendar.setAttribute('selection-mode', 'single');
		calendar.setAttribute('visible-months', String(effectiveVisibleMonths(this.visibleMonths)));
	}

	private syncPortal(): void {
		this.calendarPopover.updateConfig({ portal: this.portal });
	}

	private initialize(): void {
		this.syncPortal();
		this.syncLabel();
		this.syncInput();
		this.syncToggle();
		this.syncCalendar();
		this.calendarPopover.setOpen(false);
	}

	protected override onConnected(): void {
		this.initialize();
	}

	@onUpdated(['value', 'min', 'max', 'label', 'disabled', 'readOnly', 'locale', 'visibleMonths', 'portal'])
	onPropsUpdated(): void {
		this.syncPortal();
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

	@onEvent({ ref: 'trigger', type: 'pointerdown' })
	onTriggerPointerDown(): void {
		this.calendarPopover.suppressDismiss();
	}

	@onEvent({ ref: 'trigger', type: 'click' })
	onTriggerClick(): void {
		if (this.disabled || this.readOnly) {
			return;
		}
		this.calendarPopover.setOpen(!this.open);
	}

	private onPopupEvent(event: Event): void {
		if (event.type === 'mousedown') {
			event.preventDefault();
			return;
		}
		if (event.target !== this.getCalendar()) {
			return;
		}

		const detail = (event as CustomEvent<RuiCalendarChangeDetail>).detail;
		if (!detail?.value) {
			return;
		}
		this.commitValue(detail.value);
		this.calendarPopover.closeAndRestoreFocus();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-date-field': RuiDateField;
	}
}
