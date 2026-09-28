import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconCalendar } from '@/lib/icons';
import { RuiCalendar, type RuiCalendarElement, type RuiCalendarProps } from '../calendar';
import { RuiDateInput, type RuiDateInputElement, type RuiDateInputProps } from '../date-input';
import type { RuiDateField as RuiDateFieldElement, RuiDateFieldProps } from './date-field.script';
import './date-field.script';
import '../date-input/date-input.script';

export type RuiDateFieldControlProps = JsxElementProps<HTMLDivElement>;

/** Bordered control row containing the date segments and calendar toggle. */
export function RuiDateFieldControl({ children, class: className, ...props }: RuiDateFieldControlProps) {
	return (
		<div {...props} class={cx('rui-date-field', className)}>
			<div class="rui-date-field__group" data-ref="control">
				{children}
			</div>
		</div>
	);
}

export type RuiDateFieldInputProps = JsxCustomElementAttributes<RuiDateInputElement, RuiDateInputProps>;

/** Nested `rui-date-input`. Stamps `[data-date-field-input]`. */
export function RuiDateFieldInput({ class: className, ...props }: RuiDateFieldInputProps) {
	return <RuiDateInput {...props} data-date-field-input class={cx('rui-date-field__input', className)} />;
}

export type RuiDateFieldToggleProps = JsxElementProps<HTMLButtonElement>;

/** Calendar toggle. Stamps `[data-date-field-trigger]` and `data-ref="trigger"`. */
export function RuiDateFieldToggle({ children, class: className, aria, ...props }: RuiDateFieldToggleProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Open calendar')}
			type="button"
			data-ref="trigger"
			data-date-field-trigger
			class={cx('rui-control-toggle', className)}
			aria-haspopup="dialog"
		>
			{children ?? <RuiIconCalendar />}
		</button>
	);
}

export type RuiDateFieldPopoverProps = JsxElementProps<HTMLDivElement>;

/** Popup shell. Stamps `[data-date-field-popover]` and `data-ref="popover"`. */
export function RuiDateFieldPopover({ children, class: className, ...props }: RuiDateFieldPopoverProps) {
	return (
		<div
			{...props}
			data-ref="popover"
			data-date-field-popover
			class={cx('rui-date-field__popover rui-popover rui-floating', className)}
			hidden
			role="dialog"
		>
			{children}
		</div>
	);
}

export type RuiDateFieldCalendarProps = JsxCustomElementAttributes<RuiCalendarElement, RuiCalendarProps>;

/** Nested `rui-calendar`. Stamps `[data-date-field-calendar]`. */
export function RuiDateFieldCalendar(props: RuiDateFieldCalendarProps) {
	return <RuiCalendar {...props} data-date-field-calendar />;
}

/**
 * Locale-aware date field with segment editing and a calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateField(props: JsxCustomElementAttributes<RuiDateFieldElement, RuiDateFieldProps>) {
	const { children, value, min, max, disabled, readOnly, label, name, locale } = props;

	return (
		<rui-date-field data-rui-aria-target='[data-date-field-input] [data-ref="root"]' {...props}>
			{children ?? (
				<>
					<RuiDateFieldControl>
						<RuiDateFieldInput
							value={value}
							min={min}
							max={max}
							disabled={disabled}
							readOnly={readOnly}
							label={label}
							name={name}
							locale={locale}
						/>
						<RuiDateFieldToggle />
					</RuiDateFieldControl>
					<RuiDateFieldPopover>
						<RuiDateFieldCalendar />
					</RuiDateFieldPopover>
				</>
			)}
		</rui-date-field>
	);
}
