import { type JsxCustomElementAttributes, type JsxElementProps, type JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import type { RuiCarousel as RuiCarouselElement, RuiCarouselProps } from './carousel.script';
import './carousel.script';

export type RuiCarouselSlideData = { id: string; children: JsxRenderable };

export type RuiCarouselSlideProps = Omit<JsxElementProps<HTMLDivElement>, 'id'> & {
	id: string;
};

/**
 * Slide in the default carousel slot (APG `group` / `tabpanel` roles are applied by the host).
 *
 * @cssclass rui-carousel__slide - Slide surface.
 */
export function RuiCarouselSlide({ id, children, class: className, ...props }: RuiCarouselSlideProps) {
	return (
		<div {...props} class={cx('rui-carousel__slide', className)} data-slide={id}>
			{children}
		</div>
	);
}

export type RuiCarouselControlProps = JsxElementProps<HTMLButtonElement> & {
	disabled?: boolean;
	/** Match `controls-variant="overlay"` on the carousel for circular on-slide chrome. */
	overlay?: boolean;
};

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

/**
 * Previous control slotted into `prev` by default.
 *
 * @cssclass rui-carousel__nav - Prev nav button (composed with `rui-button`).
 * @cssclass rui-carousel__nav--overlay - Circular on-slide chrome for `controls-variant="overlay"`.
 * @cssclass rui-carousel__nav--toolbar - Toolbar chrome (default).
 * @cssclass rui-carousel__nav-label - Icon + label row (toolbar variant).
 * @cssclass rui-carousel__nav-icon - Decorative chevron glyph.
 */
export function RuiCarouselPrev({
	children,
	slot = 'prev',
	class: className,
	disabled,
	overlay,
	aria,
	...props
}: RuiCarouselControlProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Previous slide')}
			slot={slot}
			type="button"
			data-carousel-action="prev"
			data-ref="prev"
			class={cx(
				'rui-carousel__nav rui-button rui-button--outline rui-button--sm',
				overlay ? 'rui-carousel__nav--overlay' : 'rui-carousel__nav--toolbar',
				className,
			)}
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

/**
 * Next control slotted into `next` by default.
 *
 * @cssclass rui-carousel__nav - Next nav button (composed with `rui-button`).
 * @cssclass rui-carousel__nav--overlay - Circular on-slide chrome for `controls-variant="overlay"`.
 * @cssclass rui-carousel__nav--toolbar - Toolbar chrome (default).
 * @cssclass rui-carousel__nav-label - Icon + label row (toolbar variant).
 * @cssclass rui-carousel__nav-icon - Decorative chevron glyph.
 */
export function RuiCarouselNext({
	children,
	slot = 'next',
	class: className,
	disabled,
	overlay,
	aria,
	...props
}: RuiCarouselControlProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Next slide')}
			slot={slot}
			type="button"
			data-carousel-action="next"
			data-ref="next"
			class={cx(
				'rui-carousel__nav rui-button rui-button--outline rui-button--sm',
				overlay ? 'rui-carousel__nav--overlay' : 'rui-carousel__nav--toolbar',
				className,
			)}
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

export type RuiCarouselRotationProps = JsxElementProps<HTMLButtonElement> & {
	overlay?: boolean;
};

/**
 * Play/pause rotation control slotted into `rotation` by default.
 *
 * @cssclass rui-carousel__rotation - Rotation toggle button (composed with `rui-button`).
 * @cssclass rui-carousel__rotation--overlay - Overlay pill chrome.
 */
export function RuiCarouselRotation({
	children,
	slot = 'rotation',
	class: className,
	overlay,
	aria,
	...props
}: RuiCarouselRotationProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Start rotation')}
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
		>
			{children ?? 'Play'}
		</button>
	);
}

export function RuiCarousel({
	slides,
	children,
	...props
}: JsxCustomElementAttributes<RuiCarouselElement, RuiCarouselProps> & {
	slides?: RuiCarouselSlideData[];
}) {
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
}
