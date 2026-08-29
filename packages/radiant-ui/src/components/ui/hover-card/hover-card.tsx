import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import {
	HOVER_CARD_DEFAULT_CONTENT_LABEL,
	type RuiHoverCard as RuiHoverCardElement,
	type RuiHoverCardProps,
} from './hover-card.script';
import './hover-card.script';

export type RuiHoverCardTriggerProps = JsxElementProps<HTMLSpanElement>;

/** Anchor for the hover card preview. Stamps `[data-ref="trigger"]` wrapping `[data-hover-card-trigger]`. */
export function RuiHoverCardTrigger({ children, class: className, ...props }: RuiHoverCardTriggerProps) {
	return (
		<span class="rui-hover-card__trigger" data-ref="trigger">
			<span {...props} data-hover-card-trigger class={cx(className)}>
				{children}
			</span>
		</span>
	);
}

export type RuiHoverCardContentProps = JsxElementProps<HTMLDivElement>;

/** Rich preview content. Stamps `[data-ref="content"]` with `role="dialog"`. */
export function RuiHoverCardContent({ children, class: className, ...props }: RuiHoverCardContentProps) {
	return (
		<div
			{...props}
			data-ref="content"
			class={cx('rui-hover-card__content', 'rui-floating', className)}
			role="dialog"
			hidden
		>
			{children}
		</div>
	);
}

/**
 * Hover card view. Compose `RuiHoverCardTrigger` and `RuiHoverCardContent` as children.
 *
 * @cssclass rui-hover-card - Root wrapper around trigger and content.
 */
export function RuiHoverCard({
	children,
	contentLabel = HOVER_CARD_DEFAULT_CONTENT_LABEL,
	...props
}: JsxCustomElementAttributes<RuiHoverCardElement, RuiHoverCardProps>) {
	return (
		<rui-hover-card contentLabel={contentLabel} {...props}>
			<span class="rui-hover-card">{children}</span>
		</rui-hover-card>
	);
}
