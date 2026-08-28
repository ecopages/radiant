import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type {
	RuiPopover as RuiPopoverElement,
	RuiPopoverProps,
	RuiPopoverTrigger as RuiPopoverTriggerElement,
	RuiPopoverTriggerProps,
} from './popover.script';
import './popover.script';

export type RuiPopoverContentProps = JsxElementProps<HTMLDivElement>;

/** Popover body in the floating surface. Content lives inside `[data-ref="surface"]`. */
export function RuiPopoverContent({ children, class: className, ...props }: RuiPopoverContentProps) {
	return (
		<div {...props} class={cx(className)}>
			{children}
		</div>
	);
}

/**
 * Popover view with optional inline `trigger` and floating `children` as surface content.
 *
 * @cssclass rui-popover-host - Anchor + surface wrapper (`[data-ref="host"]`).
 * @cssclass rui-popover - Floating surface (`[data-ref="surface"]`, `role="dialog"`).
 * @cssclass rui-popover--listbox - Stripped padding for embedded listboxes.
 *
 * @remarks Stamps `[data-ref="host"]`, optional `[data-popover-trigger]`, and `[data-ref="surface"]`.
 */
export function RuiPopover({
	trigger,
	children,
	variant = 'default',
	...props
}: JsxCustomElementAttributes<
	RuiPopoverElement,
	RuiPopoverProps & {
		trigger?: JsxRenderable;
	}
>) {
	const variantClass = variant === 'listbox' ? 'rui-popover--listbox' : '';
	return (
		<rui-popover {...props} variant={variant}>
			<div class="rui-popover-host" data-ref="host">
				{trigger != null ? <span data-popover-trigger>{trigger}</span> : null}
				<div data-ref="surface" class={`rui-popover rui-floating ${variantClass}`.trim()} role="dialog">
					{children}
				</div>
			</div>
		</rui-popover>
	);
}

/**
 * Trigger wrapper that toggles a child `rui-popover` on click.
 *
 * @cssclass rui-popover-trigger - Trigger + popover wrapper (`[data-ref="root"]`).
 *
 * @remarks Stamps `[data-ref="root"]`, `[data-popover-trigger]`, and expects `rui-popover` as a child.
 */
export function RuiPopoverTrigger({
	trigger,
	children,
	...props
}: JsxCustomElementAttributes<
	RuiPopoverTriggerElement,
	RuiPopoverTriggerProps & {
		trigger: JsxRenderable;
	}
>) {
	return (
		<rui-popover-trigger {...props}>
			<div class="rui-popover-trigger" data-ref="root">
				<span data-popover-trigger>{trigger}</span>
				{children}
			</div>
		</rui-popover-trigger>
	);
}
