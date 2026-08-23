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

function listboxIsBordered(embedded?: boolean, bordered?: boolean): boolean {
	if (bordered != null) {
		return bordered;
	}

	return !embedded;
}

type ListboxShellProps = {
	bordered: boolean;
	children: JsxRenderable;
	disabled?: boolean;
	label?: string;
};

function ListboxShell({ bordered, children, disabled, label }: ListboxShellProps) {
	return (
		<div
			class={cx('rui-listbox', bordered && 'rui-listbox--bordered')}
			role="listbox"
			data-rui-control
			data-rui-control-type="text"
			aria-label={label || undefined}
			aria-disabled={disabled ? 'true' : undefined}
		>
			{children}
		</div>
	);
}

export function RuiListbox({
	options,
	children,
	embedded,
	bordered,
	label,
	disabled,
	...props
}: JsxCustomElementAttributes<RuiListboxElement, RuiListboxProps & { options?: RuiListboxOptionData[] }>) {
	const isBordered = listboxIsBordered(embedded, bordered);

	if (options != null) {
		return (
			<rui-listbox {...props} embedded={embedded} bordered={bordered} label={label} disabled={disabled}>
				<ListboxShell bordered={isBordered} disabled={disabled} label={label}>
					{options.map((option) => (
						<RuiListboxOption
							value={option.value}
							label={typeof option.label === 'string' ? option.label : undefined}
							disabled={option.disabled}
						>
							{option.label}
						</RuiListboxOption>
					))}
				</ListboxShell>
			</rui-listbox>
		);
	}

	return (
		<rui-listbox {...props} embedded={embedded} bordered={bordered} label={label} disabled={disabled}>
			<ListboxShell bordered={isBordered} disabled={disabled} label={label}>
				{children}
			</ListboxShell>
		</rui-listbox>
	);
}
