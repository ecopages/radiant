import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconCalendar } from '@/lib/icons';
import { RuiCalendar, type RuiCalendarProps } from '../calendar';
import type { RuiDateFieldProps } from './date-field.script';
import './date-field.script';

export type RuiDateFieldControlProps = JsxHtmlPropsWithChildren;

/** Bordered control row containing the date input and calendar toggle. */
export function RuiDateFieldControl({ children, class: className, ...props }: RuiDateFieldControlProps) {
	return (
		<div {...props} class={cx('rui-date-field', className)}>
			<div class="rui-date-field__group">{children}</div>
		</div>
	);
}

export type RuiDateFieldInputProps = JsxHtmlProps;

/** Text input controlled by the date-field host. */
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

export type RuiDateFieldToggleProps = JsxHtmlPropsWithChildren<{ 'aria-label'?: string }>;

/** Toggle button for the date calendar. */
export function RuiDateFieldToggle({
	children,
	class: className,
	'aria-label': ariaLabel = 'Open calendar',
	...props
}: RuiDateFieldToggleProps) {
	return (
		<button
			{...props}
			type="button"
			data-ref="trigger"
			data-date-field-trigger
			class={cx('rui-control-toggle', className)}
			aria-label={ariaLabel}
			aria-haspopup="dialog"
		>
			{children ?? <RuiIconCalendar />}
		</button>
	);
}

export type RuiDateFieldPopoverProps = JsxHtmlPropsWithChildren;

/** Floating shell for a `RuiDateFieldCalendar`. */
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

export type RuiDateFieldCalendarProps = JsxHtmlProps<RuiCalendarProps>;

/** Calendar whose value and constraints are synchronized by the date-field host. */
export function RuiDateFieldCalendar(props: RuiDateFieldCalendarProps) {
	return <RuiCalendar {...props} data-date-field-calendar />;
}

/**
 * Locale-aware date field with optional digit masking, flexible parsing, and a calendar popover.
 *
 * Pair with `RuiLabel` / `RuiField` for labeling and validation.
 */
export function RuiDateField({ children, ...props }: JsxHtmlPropsWithChildren<RuiDateFieldProps & { slot?: string }>) {
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
