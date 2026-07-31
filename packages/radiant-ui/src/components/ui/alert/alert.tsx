import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps, WithChildren } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiAlertProps, RuiAlertVariant } from './alert.script';
import { RuiAlert as RuiAlertElement } from './alert.script';
import './alert.css';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

const ALERT_ICON_PATHS: Record<RuiAlertVariant, string | readonly string[]> = {
	info: ['M12 16v-4', 'M12 8h.01', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'],
	success: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'm9 12 2 2 4-4'],
	warning: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
	error: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'm15 9-6 6', 'm9 9 6 6'],
};

export type RuiAlertIconProps = {
	variant?: RuiAlertVariant;
	class?: string;
	children?: JsxRenderable;
};

/** Default variant icon for `layout="inline"`. Pass `children` to override. */
export function RuiAlertIcon({ variant = 'info', class: className, children }: RuiAlertIconProps) {
	if (children != null) {
		return <span class={cx('rui-alert__icon', className)}>{children}</span>;
	}

	const paths = ALERT_ICON_PATHS[variant];
	const d = Array.isArray(paths) ? paths : [paths];

	return (
		<span class={cx('rui-alert__icon', className)} aria-hidden="true">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				{d.map((path) => (
					<path d={path} />
				))}
			</svg>
		</span>
	);
}

export type RuiAlertTitleProps = {
	children: JsxRenderable;
	class?: string;
};

/** Heading for `layout="banner"` alerts. */
export function RuiAlertTitle({ children, class: className }: RuiAlertTitleProps) {
	return <p class={cx('rui-alert__title', className)}>{children}</p>;
}

export type RuiAlertDescriptionProps = {
	children: JsxRenderable;
	class?: string;
};

/** Body copy for `layout="banner"` alerts. */
export function RuiAlertDescription({ children, class: className }: RuiAlertDescriptionProps) {
	return <div class={cx('rui-alert__description', className)}>{children}</div>;
}

export const RuiAlert = defineRadiantView(
	RuiAlertElement,
	({ slot, variant = 'info', layout = 'inline', children }: WithChildren<RuiAlertProps & RadiantSlotProps>) => (
		<rui-alert slot={slot} variant={variant} layout={layout}>
			<div class={cx('rui-alert', `rui-alert--${variant}`, `rui-alert--${layout}`)} role="alert">
				{children}
			</div>
		</rui-alert>
	),
);
