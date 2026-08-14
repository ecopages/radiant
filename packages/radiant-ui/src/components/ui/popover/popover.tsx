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

/** Popover body slotted into the floating surface. */
export function RuiPopoverContent({ children, slot = 'content', class: className, ...props }: RuiPopoverContentProps) {
	return (
		<div {...props} slot={slot} class={cx(className)}>
			{children}
		</div>
	);
}

export function RuiPopover({
	trigger,
	children,
	...props
}: JsxCustomElementAttributes<
	RuiPopoverElement,
	RuiPopoverProps & {
		trigger?: JsxRenderable;
	}
>) {
	return (
		<rui-popover {...props}>
			{trigger != null ? <span slot="trigger">{trigger}</span> : null}
			{children}
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
			<span slot="trigger">{trigger}</span>
			{children}
		</rui-popover-trigger>
	);
}
