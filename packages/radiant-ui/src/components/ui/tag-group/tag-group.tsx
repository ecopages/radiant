import { type JsxCustomElementAttributes, type JsxElementProps, type JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconX } from '@/lib/icons';
import type { RuiTagGroup as RuiTagGroupElement, RuiTagGroupProps } from './tag-group.script';
import './tag-group.script';

export type RuiTagListProps = JsxElementProps<HTMLDivElement>;

/**
 * Flex-wrapped container for `RuiTag` children. Stamps `[data-tag-list]`.
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
 * A single tag. Stamps `[data-tag]`, `data-value`, and `data-label`.
 *
 * @cssclass rui-tag - Tag chip; selected state via `[aria-selected='true']`.
 *
 * @remarks Always appends `RuiTagRemove`. For a non-removable tag, stamp
 * `[data-tag]` yourself without `[data-tag-remove]`. Tags built in
 * `createManagedTag` always include a remove control — edit both together.
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
 * Remove control inside a tag. Stamps `[data-tag-remove]`.
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
			{children ?? <RuiIconX />}
		</button>
	);
}

export type RuiTagData = { value: string; label: JsxRenderable; disabled?: boolean };

function TagGroupShell({ children }: { children: JsxRenderable }) {
	return (
		<div class="rui-tag-group" data-ref="root">
			{children}
		</div>
	);
}

/**
 * Tag group view. Pass `tags` for the simple API, or compose `RuiTagList` /
 * `RuiTag` children. Either path wraps content in `[data-ref="root"]`.
 *
 * Raw markup that already matches the host contract can be passed as `children`.
 *
 * @cssclass rui-tag-group - Root wrapper around the tag list (`data-ref="root"`).
 */
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
				<TagGroupShell>
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
				</TagGroupShell>
			</rui-tag-group>
		);
	}

	return (
		<rui-tag-group {...props}>
			<TagGroupShell>{children}</TagGroupShell>
		</rui-tag-group>
	);
}
