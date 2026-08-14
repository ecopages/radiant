import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiListbox as RuiListboxElement, RuiListboxProps } from './listbox.script';
import './listbox.script';

export type RuiListboxOptionProps = JsxElementProps<HTMLDivElement> & {
	value: string;
	/** Text used for accessibility and parent display when selected. Defaults to `children` text. */
	label?: string;
	disabled?: boolean;
};

/** Option placed inside `RuiListbox`.
 *
 * @cssclass rui-listbox__option - Selectable list option.
 */
export function RuiListboxOption({
	value,
	label,
	children,
	class: className,
	disabled,
	...props
}: RuiListboxOptionProps) {
	return (
		<div
			{...props}
			class={cx('rui-listbox__option', className)}
			role="option"
			data-value={value}
			data-label={label}
			aria-disabled={disabled ? 'true' : undefined}
			tabindex={-1}
		>
			{children}
		</div>
	);
}

export type RuiListboxOptionData = { value: string; label: JsxRenderable; disabled?: boolean };

export function RuiListbox({
	options,
	children,
	...props
}: JsxCustomElementAttributes<RuiListboxElement, RuiListboxProps & { options?: RuiListboxOptionData[] }>) {
	if (options != null) {
		return (
			<rui-listbox {...props}>
				{options.map((option) => (
					<RuiListboxOption
						value={option.value}
						label={typeof option.label === 'string' ? option.label : undefined}
						disabled={option.disabled}
					>
						{option.label}
					</RuiListboxOption>
				))}
			</rui-listbox>
		);
	}

	return <rui-listbox {...props}>{children}</rui-listbox>;
}
