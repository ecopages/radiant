import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconCheck } from '@/lib/icons';
import { parseViewValue, serializeViewValue } from '../shared/multi-value';
import type { RuiListbox as RuiListboxElement, RuiListboxProps, RuiListboxSelectionMode } from './listbox.script';
import './listbox.script';

export type RuiListboxOptionProps = JsxElementProps<HTMLDivElement> & {
	value: string;
	/** Text used for accessibility and parent display when selected. Defaults to `children` text. */
	label?: string;
	disabled?: boolean;
};

/** Option placed inside `RuiListbox`. Stamps `[role="option"]`, `data-value`, and optional `data-label`.
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

export type RuiListboxOptionIndicatorProps = JsxElementProps<HTMLSpanElement>;

/**
 * Decorative selected-state indicator within `RuiListboxOption`.
 *
 * Supply children to replace the default check icon. The listbox owns visibility
 * through the option's `aria-selected` state.
 *
 * @cssclass rui-listbox__option-indicator - Selected-state indicator.
 */
export function RuiListboxOptionIndicator({ children, class: className, ...props }: RuiListboxOptionIndicatorProps) {
	return (
		<span
			{...props}
			data-listbox-option-indicator
			aria-hidden="true"
			class={cx('rui-listbox__option-indicator', className)}
		>
			{children ?? <RuiIconCheck />}
		</span>
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
	embedded?: boolean;
	label?: string;
	selectionMode?: RuiListboxSelectionMode;
};

function ListboxShell({ bordered, children, disabled, embedded, label, selectionMode = 'single' }: ListboxShellProps) {
	return (
		<div
			class={cx('rui-listbox', bordered && 'rui-listbox--bordered')}
			role="listbox"
			data-rui-control={embedded ? undefined : true}
			data-rui-control-type={embedded ? undefined : 'text'}
			aria-label={label || undefined}
			aria-disabled={disabled ? 'true' : undefined}
			aria-multiselectable={selectionMode === 'multiple' ? 'true' : undefined}
		>
			{children}
		</div>
	);
}

/**
 * Listbox with an `options` convenience API or composed children. Stamps
 * `<rui-listbox>` and a `[role="listbox"]` shell via `ListboxShell`.
 */
export function RuiListbox({
	options,
	children,
	value,
	embedded,
	bordered,
	label,
	disabled,
	selectionMode = 'single',
	...props
}: JsxCustomElementAttributes<
	RuiListboxElement,
	Omit<RuiListboxProps, 'value'> & { options?: RuiListboxOptionData[]; value?: string | string[] }
>) {
	const isBordered = listboxIsBordered(embedded, bordered);
	const serializedValue = serializeViewValue(value);
	const selected = new Set(parseViewValue(value));

	return (
		<rui-listbox
			{...props}
			value={serializedValue}
			embedded={embedded}
			bordered={bordered}
			label={label}
			disabled={disabled}
			selectionMode={selectionMode}
		>
			<ListboxShell
				bordered={isBordered}
				disabled={disabled}
				embedded={embedded}
				label={label}
				selectionMode={selectionMode}
			>
				{options != null
					? options.map((option) => (
							<RuiListboxOption
								value={option.value}
								label={typeof option.label === 'string' ? option.label : undefined}
								disabled={option.disabled}
								aria-selected={selected.has(option.value) ? 'true' : undefined}
							>
								{option.label}
								{selectionMode === 'multiple' ? <RuiListboxOptionIndicator /> : null}
							</RuiListboxOption>
						))
					: children}
			</ListboxShell>
		</rui-listbox>
	);
}
