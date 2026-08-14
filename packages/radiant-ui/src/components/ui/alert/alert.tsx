import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiAlertProps, RuiAlertVariant } from './alert.script';

/** Registers `<rui-alert>` when the JSX helpers are imported. */
import './alert.script';

const ALERT_ICON_PATHS: Record<RuiAlertVariant, string | readonly string[]> = {
	info: ['M12 16v-4', 'M12 8h.01', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'],
	success: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'm9 12 2 2 4-4'],
	warning: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
	error: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'm15 9-6 6', 'm9 9 6 6'],
};

export type RuiAlertIconProps = JsxElementProps<HTMLSpanElement> & {
	variant?: RuiAlertVariant;
};

/**
 * Default variant icon for `layout="inline"`. Pass `children` to override.
 *
 * @cssclass rui-alert__icon - Icon wrapper (`inline` only).
 *
 * @remarks Default SVG is `aria-hidden="true"` — convey severity in adjacent
 * text, not by icon alone.
 */
export function RuiAlertIcon({ variant = 'info', class: className, children, ...props }: RuiAlertIconProps) {
	if (children != null) {
		return (
			<span {...props} class={cx('rui-alert__icon', className)}>
				{children}
			</span>
		);
	}

	const paths = ALERT_ICON_PATHS[variant];
	const d = Array.isArray(paths) ? paths : [paths];

	return (
		<span {...props} class={cx('rui-alert__icon', className)} aria-hidden="true">
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

export type RuiAlertTitleProps = JsxElementProps<HTMLParagraphElement>;

/**
 * Heading for `layout="banner"` alerts.
 *
 * @cssclass rui-alert__title - Banner headline.
 */
export function RuiAlertTitle({ children, class: className, ...props }: RuiAlertTitleProps) {
	return (
		<p {...props} class={cx('rui-alert__title', className)}>
			{children}
		</p>
	);
}

export type RuiAlertDescriptionProps = JsxElementProps<HTMLDivElement>;

/**
 * Body copy for `layout="banner"` alerts.
 *
 * @cssclass rui-alert__description - Banner body.
 */
export function RuiAlertDescription({ children, class: className, ...props }: RuiAlertDescriptionProps) {
	return (
		<div {...props} class={cx('rui-alert__description', className)}>
			{children}
		</div>
	);
}

export type RuiAlertComponentProps = JsxElementProps<HTMLDivElement> & RuiAlertProps;

/**
 * Status alert with optional dismiss control.
 *
 * @remarks
 * Importable JSX helper around `<rui-alert>`. Owns the `role="alert"` surface and
 * BEM classes; the host owns dismiss (`rui-close` / `dismiss()`).
 *
 * Variant tones map to semantic theme roles (`info`, `success`, `warning`, `error`)
 * via `.rui-alert--*` — not palette steps. See `alert.css` and DESIGN.md status roles.
 *
 * @cssclass rui-alert - Root surface (`role="alert"`).
 * @cssclass rui-alert--info - Info tone (default).
 * @cssclass rui-alert--success - Success tone.
 * @cssclass rui-alert--warning - Warning tone.
 * @cssclass rui-alert--error - Error tone.
 * @cssclass rui-alert--inline - Compact row layout (icon + text).
 * @cssclass rui-alert--banner - Full-width advisory with left accent rail.
 * @cssclass rui-alert--dismissible - Layout adjustments for the dismiss control.
 * @cssclass rui-alert__close - Dismiss button when `dismissible` is set.
 */
export function RuiAlert({
	children,
	variant = 'info',
	layout = 'inline',
	dismissible = false,
	closeLabel = 'Dismiss',
	class: className,
	slot,
	...props
}: RuiAlertComponentProps) {
	return (
		<rui-alert slot={slot} variant={variant} layout={layout} dismissible={dismissible} close-label={closeLabel}>
			<div
				{...props}
				class={cx(
					'rui-alert',
					`rui-alert--${variant}`,
					`rui-alert--${layout}`,
					dismissible && 'rui-alert--dismissible',
					className,
				)}
				role="alert"
			>
				{children}
				{dismissible ? (
					<button
						type="button"
						class="rui-alert__close"
						data-alert-close
						aria-label={closeLabel || 'Dismiss'}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M18 6 6 18" />
							<path d="m6 6 12 12" />
						</svg>
					</button>
				) : null}
			</div>
		</rui-alert>
	);
}
