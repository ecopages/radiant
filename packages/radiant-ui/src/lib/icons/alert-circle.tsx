import { cx } from '@/lib/cx';
import type { RuiIconProps } from './types';

/** Exclamation in a circle for errors and failed outcomes, so a failure does not read as another close cross. */
export function RuiIconAlertCircle({ class: className, size = 'sm', ...props }: RuiIconProps) {
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
			<circle cx="12" cy="12" r="10" />
			<path d="M12 8v4" />
			<path d="M12 16h.01" />
		</svg>
	);
}
