import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiCarouselProps } from './carousel.script';
import { RuiCarousel as RuiCarouselElement } from './carousel.script';
import './carousel.css';

export type RuiCarouselSlide = { id: string; children: JsxRenderable };

export const RuiCarousel = defineRadiantView(
	RuiCarouselElement,
	({
		slot,
		label,
		index,
		autoplay,
		transition,
		showIndicators,
		showRotationControl,
		loop,
		wrap,
		slides,
	}: RuiCarouselProps & RadiantSlotProps & { slides: RuiCarouselSlide[] }) => (
		<rui-carousel
			slot={slot}
			label={label}
			index={index}
			autoplay={autoplay}
			transition={transition}
			showIndicators={showIndicators}
			showRotationControl={showRotationControl}
			loop={loop}
			wrap={wrap}
			slideCount={slides.length}
		>
			{slides.map((slide, i) => (
				<div
					class="rui-carousel__slide"
					data-slide={slide.id}
					role="group"
					aria-roledescription="slide"
					aria-label={`Slide ${i + 1}`}
				>
					{slide.children}
				</div>
			))}
		</rui-carousel>
	),
);
