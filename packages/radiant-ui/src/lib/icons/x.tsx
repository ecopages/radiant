import { cx } from '@/lib/cx';
import type { RuiIconProps } from './types';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Close and remove indicator for dismissible controls. */
export function RuiIconX({ class: className, size = 'sm', ...props }: RuiIconProps) {
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
			<path d="m18 6-12 12" />
			<path d="m6 6 12 12" />
		</svg>
	);
}

/** Imperative equivalent of `RuiIconX` for derived DOM trees. */
export function createRuiIconX(): SVGSVGElement {
	const icon = document.createElementNS(SVG_NAMESPACE, 'svg');
	icon.setAttribute('class', 'rui-icon');
	icon.setAttribute('viewBox', '0 0 24 24');
	icon.setAttribute('fill', 'none');
	icon.setAttribute('stroke', 'currentColor');
	icon.setAttribute('stroke-width', '2');
	icon.setAttribute('stroke-linecap', 'round');
	icon.setAttribute('stroke-linejoin', 'round');
	icon.setAttribute('aria-hidden', 'true');

	for (const d of ['m18 6-12 12', 'm6 6 12 12']) {
		const path = document.createElementNS(SVG_NAMESPACE, 'path');
		path.setAttribute('d', d);
		icon.append(path);
	}

	return icon;
}
