import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiRadioGroup as RuiRadioGroupElement, RuiRadioGroupProps } from './radio-group.script';
import './radio-group.script';

export type RuiRadioOption = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

export type RuiRadioGroupControlProps = JsxElementProps<HTMLDivElement>;

/** Accessible surface that contains radio options. */
export function RuiRadioGroupControl({ children, class: className, ...props }: RuiRadioGroupControlProps) {
	return (
		<div
			{...props}
			data-radio-group-root
			class={cx('rui-radio-group', className)}
			role="radiogroup"
			data-rui-control
			data-rui-control-type="text"
		>
			{children}
		</div>
	);
}

export type RuiRadioProps = JsxElementProps<HTMLLabelElement> & {
	value: string;
	name?: string;
	disabled?: boolean;
};

/** A label-wrapped native radio option controlled by `RuiRadioGroup`. */
export function RuiRadio({ children, value, name, disabled, class: className, ...props }: RuiRadioProps) {
	return (
		<label {...props} class={cx('rui-radio', className)}>
			<input
				type="radio"
				class="rui-radio__input"
				value={value}
				name={name}
				disabled={disabled}
				data-disabled={disabled ? '' : undefined}
			/>
			<span class="rui-radio__control" aria-hidden="true" />
			<span class="rui-radio__label">{children}</span>
		</label>
	);
}

/**
 * Radio group with an `options` convenience API; renders one label-wrapped radio
 * per option inside `<rui-radio-group>`.
 *
 * @cssclass rui-radio - Option label row wrapping the input and control dot.
 * @cssclass rui-radio__input - Visually hidden native radio input.
 * @cssclass rui-radio__control - Custom control dot that mirrors check state.
 * @cssclass rui-radio__label - Option text.
 *
 */
export function RuiRadioGroup({
	options,
	children,
	...props
}: JsxCustomElementAttributes<RuiRadioGroupElement, RuiRadioGroupProps & { options?: RuiRadioOption[] }>) {
	return (
		<rui-radio-group {...props}>
			{options == null ? (
				children
			) : (
				<RuiRadioGroupControl>
					{options.map((option) => (
						<RuiRadio value={option.value} disabled={option.disabled}>
							{option.label}
						</RuiRadio>
					))}
				</RuiRadioGroupControl>
			)}
		</rui-radio-group>
	);
}
