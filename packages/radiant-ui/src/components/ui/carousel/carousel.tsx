import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiCarouselProps } from './carousel.script';
import { RuiCarousel as RuiCarouselElement } from './carousel.script';

export type RuiCarouselSlideData = { id: string; children: JsxRenderable };

export type RuiCarouselSlideProps = JsxHtmlPropsWithChildren<{
	id: string;
	index?: number;
}>;

/** Slide in the default carousel slot (APG `group` / `tabpanel` roles are applied by the host). */
export function RuiCarouselSlide({ id, children, class: className, ...props }: RuiCarouselSlideProps) {
	return (
		<div {...props} class={cx('rui-carousel__slide', className)} data-slide={id}>
			{children}
		</div>
	);
}

export type RuiCarouselControlProps = JsxHtmlPropsWithChildren<{
	slot?: string;
	disabled?: boolean;
	/** Match `controls-variant="overlay"` on the carousel for circular on-slide chrome. */
	overlay?: boolean;
}>;

function toolbarPrevLabel() {
	return (
		<span class="rui-carousel__nav-label">
			<span class="rui-carousel__nav-icon" aria-hidden="true">
				‹
			</span>
			Previous
		</span>
	);
}

function toolbarNextLabel() {
	return (
		<span class="rui-carousel__nav-label">
			Next
			<span class="rui-carousel__nav-icon" aria-hidden="true">
				›
			</span>
		</span>
	);
}

/** Previous control slotted into `prev` by default. */
export function RuiCarouselPrev({
	children,
	slot = 'prev',
	class: className,
	disabled,
	overlay,
	...props
}: RuiCarouselControlProps) {
	return (
		<button
			{...props}
			slot={slot}
			type="button"
			data-carousel-action="prev"
			data-ref="prev"
			class={cx(
				'rui-carousel__nav rui-button rui-button--outline rui-button--sm',
				overlay ? 'rui-carousel__nav--overlay' : 'rui-carousel__nav--toolbar',
				className,
			)}
			aria-label="Previous slide"
			disabled={disabled}
		>
			{children ??
				(overlay ? (
					<span class="rui-carousel__nav-icon" aria-hidden="true">
						‹
					</span>
				) : (
					toolbarPrevLabel()
				))}
		</button>
	);
}

/** Next control slotted into `next` by default. */
export function RuiCarouselNext({
	children,
	slot = 'next',
	class: className,
	disabled,
	overlay,
	...props
}: RuiCarouselControlProps) {
	return (
		<button
			{...props}
			slot={slot}
			type="button"
			data-carousel-action="next"
			data-ref="next"
			class={cx(
				'rui-carousel__nav rui-button rui-button--outline rui-button--sm',
				overlay ? 'rui-carousel__nav--overlay' : 'rui-carousel__nav--toolbar',
				className,
			)}
			aria-label="Next slide"
			disabled={disabled}
		>
			{children ??
				(overlay ? (
					<span class="rui-carousel__nav-icon" aria-hidden="true">
						›
					</span>
				) : (
					toolbarNextLabel()
				))}
		</button>
	);
}

export type RuiCarouselRotationProps = JsxHtmlPropsWithChildren<{
	slot?: string;
	overlay?: boolean;
}>;

/** Play/pause rotation control slotted into `rotation` by default. */
export function RuiCarouselRotation({
	children,
	slot = 'rotation',
	class: className,
	overlay,
	...props
}: RuiCarouselRotationProps) {
	return (
		<button
			{...props}
			slot={slot}
			type="button"
			data-carousel-action="rotation"
			data-ref="rotation"
			class={cx(
				'rui-carousel__rotation rui-button rui-button--ghost rui-button--sm',
				overlay && 'rui-carousel__rotation--overlay',
				className,
			)}
			aria-pressed={false}
			aria-label="Start rotation"
		>
			{children ?? 'Play'}
		</button>
	);
}

export const RuiCarousel = defineRadiantView(
	RuiCarouselElement,
	({
		slides,
		children,
		...props
	}: JsxHtmlPropsWithChildren<
		RuiCarouselProps & {
			slot?: string;
			slides?: RuiCarouselSlideData[];
		}
	>) => {
		if (children != null) {
			return <rui-carousel {...props}>{children}</rui-carousel>;
		}

		const slideList = slides ?? [];

		return (
			<rui-carousel {...props} slideCount={slideList.length}>
				{slideList.map((slide) => (
					<RuiCarouselSlide id={slide.id}>{slide.children}</RuiCarouselSlide>
				))}
			</rui-carousel>
		);
	},
	{ stylesheets: ['./carousel.css'] },
);
