import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps, WithChildren } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiCarouselProps } from './carousel.script';
import { RuiCarousel as RuiCarouselElement } from './carousel.script';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

export type RuiCarouselSlideData = { id: string; children: JsxRenderable };

export type RuiCarouselSlideProps = {
	id: string;
	index?: number;
	children: JsxRenderable;
	class?: string;
};

/** Slide in the default carousel slot (APG `group` / `tabpanel` roles are applied by the host). */
export function RuiCarouselSlide({ id, children, class: className }: RuiCarouselSlideProps) {
	return (
		<div class={cx('rui-carousel__slide', className)} data-slide={id}>
			{children}
		</div>
	);
}

export type RuiCarouselControlProps = RadiantSlotProps & {
	children?: JsxRenderable;
	class?: string;
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

/** Previous control slotted into `prev` by default. */
export function RuiCarouselPrev({
	slot = 'prev',
	children,
	class: className,
	disabled,
	overlay,
}: RuiCarouselControlProps) {
	return (
		<button
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
	slot = 'next',
	children,
	class: className,
	disabled,
	overlay,
}: RuiCarouselControlProps) {
	return (
		<button
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

export type RuiCarouselRotationProps = RadiantSlotProps & {
	children?: JsxRenderable;
	class?: string;
	overlay?: boolean;
};

/** Play/pause rotation control slotted into `rotation` by default. */
export function RuiCarouselRotation({
	slot = 'rotation',
	children,
	class: className,
	overlay,
}: RuiCarouselRotationProps) {
	return (
		<button
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
		slot,
		label,
		index,
		autoplay,
		interval,
		transition,
		controlsVariant,
		showIndicators,
		showRotationControl,
		loop,
		wrap,
		slides,
		children,
	}: RuiCarouselProps &
		RadiantSlotProps &
		WithChildren<{
			slides?: RuiCarouselSlideData[];
		}>) => {
		if (children != null) {
			return (
				<rui-carousel
					slot={slot}
					label={label}
					index={index}
					autoplay={autoplay}
					interval={interval}
					transition={transition}
					controlsVariant={controlsVariant}
					showIndicators={showIndicators}
					showRotationControl={showRotationControl}
					loop={loop}
					wrap={wrap}
				>
					{children}
				</rui-carousel>
			);
		}

		const slideList = slides ?? [];

		return (
			<rui-carousel
				slot={slot}
				label={label}
				index={index}
				autoplay={autoplay}
				interval={interval}
				transition={transition}
				controlsVariant={controlsVariant}
				showIndicators={showIndicators}
				showRotationControl={showRotationControl}
				loop={loop}
				wrap={wrap}
				slideCount={slideList.length}
			>
				{slideList.map((slide) => (
					<RuiCarouselSlide id={slide.id}>{slide.children}</RuiCarouselSlide>
				))}
			</rui-carousel>
		);
	},

	{ stylesheets: ['./carousel.css'] },
);
