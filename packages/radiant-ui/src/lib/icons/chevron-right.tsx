import { cx } from '@/lib/cx';
import type { RuiIconProps } from './types';

/** Chevron-right indicator for next-page controls. */
export function RuiIconChevronRight({ class: className, size = 'sm', ...props }: RuiIconProps) {
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
			<path d="m9 18 6-6-6-6" />
		</svg>
	);
}
