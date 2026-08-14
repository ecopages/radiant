import { type JsxCustomElementAttributes, type JsxElementProps, type JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import type { RuiTagGroup as RuiTagGroupElement, RuiTagGroupProps } from './tag-group.script';
import './tag-group.script';

export type RuiTagListProps = JsxElementProps<HTMLDivElement>;

/**
 * Flex-wrapped container for `RuiTag` children.
 *
 * @cssclass rui-tag-group__list - Tag row (flex-wrap container).
 */
export function RuiTagList({ children, class: className, ...props }: RuiTagListProps) {
	return (
		<div {...props} data-tag-list class={cx('rui-tag-group__list', className)}>
			{children}
		</div>
	);
}

export type RuiTagProps = JsxElementProps<HTMLSpanElement> & {
	value?: string;
	label?: string;
	disabled?: boolean;
};

/**
 * A single tag with optional remove button.
 *
 * @cssclass rui-tag - Tag chip; selected state via `[aria-selected='true']`.
 */
export function RuiTag({ value, label, children, class: className, disabled, ...props }: RuiTagProps) {
	return (
		<span
			{...props}
			data-tag
			data-value={value}
			data-label={label}
			class={cx('rui-tag', className)}
			aria-disabled={disabled ? 'true' : undefined}
		>
			{children}
			<RuiTagRemove />
		</span>
	);
}

export type RuiTagRemoveProps = JsxElementProps<HTMLButtonElement>;

/**
 * Remove button rendered inside `RuiTag`.
 *
 * @cssclass rui-tag__remove - Tag remove control.
 */
export function RuiTagRemove({ children, class: className, aria, ...props }: RuiTagRemoveProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Remove')}
			type="button"
			data-tag-remove
			class={cx('rui-tag__remove', className)}
		>
			{children ?? <span aria-hidden="true">×</span>}
		</button>
	);
}

export type RuiTagData = { value: string; label: JsxRenderable; disabled?: boolean };

export function RuiTagGroup({
	tags,
	children,
	...props
}: JsxCustomElementAttributes<
	RuiTagGroupElement,
	RuiTagGroupProps & {
		tags?: RuiTagData[];
	}
>) {
	if (tags != null) {
		return (
			<rui-tag-group {...props}>
				<RuiTagList>
					{tags.map((tag) => (
						<RuiTag
							value={tag.value}
							label={typeof tag.label === 'string' ? tag.label : undefined}
							disabled={tag.disabled}
						>
							{tag.label}
						</RuiTag>
					))}
				</RuiTagList>
			</rui-tag-group>
		);
	}

	return <rui-tag-group {...props}>{children}</rui-tag-group>;
}
