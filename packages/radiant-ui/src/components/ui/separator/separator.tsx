import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { WithoutChildren } from '../../../lib/without-children';

export type RuiSeparatorOrientation = 'horizontal' | 'vertical';

export type RuiSeparatorProps = WithoutChildren<JsxElementProps<HTMLHRElement>> & {
	/** Visual and semantic direction. Default: `horizontal`. */
	orientation?: RuiSeparatorOrientation;
};

/**
 * Non-interactive divider between related groups of content.
 *
 * @cssclass rui-separator - Semantic divider with horizontal or vertical layout.
 */
export function RuiSeparator({ orientation = 'horizontal', class: className, ...props }: RuiSeparatorProps) {
	return (
		<hr
			{...props}
			class={cx('rui-separator', className)}
			role="separator"
			aria-orientation={orientation}
			data-orientation={orientation}
		/>
	);
}
