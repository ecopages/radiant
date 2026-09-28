import { cx } from '@/lib/cx';
import type { RuiIconProps } from './types';

/** Check indicator for selected items and successful outcomes. */
export function RuiIconCheck({ class: className, size = 'sm', ...props }: RuiIconProps) {
	return (
		<svg
			{...props}
			class={cx('rui-icon', size === 'md' && 'rui-icon--md', className)}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m5 12 4 4L19 6" />
		</svg>
	);
}
