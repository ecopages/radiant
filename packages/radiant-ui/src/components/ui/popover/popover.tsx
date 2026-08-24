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

/** Popover body in the floating surface. */
export function RuiPopoverContent({ children, class: className, ...props }: RuiPopoverContentProps) {
	return (
		<div {...props} class={cx(className)}>
			{children}
		</div>
	);
}

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
