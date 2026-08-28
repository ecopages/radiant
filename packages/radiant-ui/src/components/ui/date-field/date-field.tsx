import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconCalendar } from '@/lib/icons';
import { RuiCalendar, type RuiCalendarElement, type RuiCalendarProps } from '../calendar';
import type { RuiDateField as RuiDateFieldElement, RuiDateFieldProps } from './date-field.script';
import './date-field.script';

export type RuiDateFieldControlProps = JsxElementProps<HTMLDivElement>;

/** Bordered control row containing the date input and calendar toggle. */
export function RuiDateFieldControl({ children, class: className, ...props }: RuiDateFieldControlProps) {
	return (
		<div {...props} class={cx('rui-date-field', className)}>
			<div class="rui-date-field__group">{children}</div>
		</div>
	);
}

export type RuiDateFieldInputProps = JsxElementProps<HTMLInputElement>;

/** Text input. Stamps `[data-date-field-input]`. */
export function RuiDateFieldInput({ class: className, ...props }: RuiDateFieldInputProps) {
	return (
		<input
			{...props}
			type="text"
			data-date-field-input
			data-rui-control
			data-rui-control-type="text"
			class={cx('rui-date-field__input', className)}
			autocomplete="off"
		/>
	);
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
 * Locale-aware date field with optional digit masking, flexible parsing, and a calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateField({
	children,
	...props
}: JsxCustomElementAttributes<RuiDateFieldElement, RuiDateFieldProps>) {
	return (
		<rui-date-field {...props}>
			{children ?? (
				<>
					<RuiDateFieldControl>
						<RuiDateFieldInput />
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
