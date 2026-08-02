import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiTagGroupProps } from './tag-group.script';
import { RuiTagGroup as RuiTagGroupElement } from './tag-group.script';

export type RuiTagListProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Flex-wrapped container for `RuiTag` children. */
export function RuiTagList({ children, class: className, ...props }: RuiTagListProps) {
	return (
		<div {...props} data-tag-list class={cx('rui-tag-group__list', className)}>
			{children}
		</div>
	);
}

export type RuiTagProps = JsxHtmlPropsWithChildren<{
	value?: string;
	label?: string;
	disabled?: boolean;
}>;

/** A single tag with optional remove button. */
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

export type RuiTagRemoveProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
}>;

/** Remove button rendered inside `RuiTag`. */
export function RuiTagRemove({
	children,
	class: className,
	'aria-label': ariaLabel = 'Remove',
	...props
}: RuiTagRemoveProps) {
	return (
		<button {...props} type="button" data-tag-remove class={cx('rui-tag__remove', className)} aria-label={ariaLabel}>
			{children ?? <span aria-hidden="true">×</span>}
		</button>
	);
}

export type RuiTagData = { value: string; label: JsxRenderable; disabled?: boolean };

export const RuiTagGroup = defineRadiantView(
	RuiTagGroupElement,
	({
		tags,
		children,
		...props
	}: JsxHtmlPropsWithChildren<
		RuiTagGroupProps & {
			slot?: string;
			tags?: RuiTagData[];
		}
	>) => {
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
	},
	{ stylesheets: ['./tag-group.css'] },
);
