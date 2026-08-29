import { type JsxCustomElementAttributes, type JsxElementProps, type JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import {
	CAROUSEL_DEFAULTS,
	type RuiCarousel as RuiCarouselElement,
	type RuiCarouselControlsVariant,
	type RuiCarouselProps,
	type RuiCarouselTransition,
} from './carousel.script';
import './carousel.script';

export type RuiCarouselSlideData = { id: string; children: JsxRenderable };

export type RuiCarouselSlideProps = Omit<JsxElementProps<HTMLDivElement>, 'id'> & {
	id: string;
};

/**
 * Slide in the carousel track. Host applies `group` / `tabpanel` roles and visibility.
 *
 * @cssclass rui-carousel__slide - Slide surface.
 *
 * @remarks Stamps `[data-slide]` with the slide `id`.
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
 * Previous carousel control.
 *
 * @cssclass rui-carousel__nav - Prev nav button (composed with `rui-button`).
 *
 * @remarks Stamps `[data-carousel-action="prev"]` and `data-ref="prev"`.
 */
export function RuiCarouselPrev({
	children,
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

/** Next carousel control. Stamps `[data-carousel-action="next"]` and `data-ref="next"`. */
export function RuiCarouselNext({
	children,
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

/** Play/pause rotation control. Stamps `[data-carousel-action="rotation"]` and `data-ref="rotation"`. */
export function RuiCarouselRotation({ children, class: className, overlay, aria, ...props }: RuiCarouselRotationProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Start rotation')}
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

type CarouselShellProps = {
	autoplay?: boolean;
	children: JsxRenderable;
	controlsVariant: RuiCarouselControlsVariant;
	label: string;
	next?: JsxRenderable;
	prev?: JsxRenderable;
	rotation?: JsxRenderable;
	showIndicators?: boolean;
	showRotationControl?: boolean;
	transition: RuiCarouselTransition;
};

function CarouselShell({
	autoplay,
	children,
	controlsVariant,
	label,
	next,
	prev,
	rotation,
	showIndicators,
	showRotationControl,
	transition,
}: CarouselShellProps) {
	const overlay = controlsVariant === 'overlay';
	const showRotation = autoplay || showRotationControl;
	const prevControl = prev ?? <RuiCarouselPrev overlay={overlay} />;
	const nextControl = next ?? <RuiCarouselNext overlay={overlay} />;
	const rotationControl = showRotation ? (rotation ?? <RuiCarouselRotation overlay={overlay} />) : null;
	const indicators = showIndicators ? (
		<div
			class={cx('rui-carousel__indicators', overlay && 'rui-carousel__indicators--overlay')}
			data-ref="indicators"
			role="tablist"
			aria-label="Choose slide to display"
		/>
	) : null;

	const toolbarControls = (
		<div class="rui-carousel__toolbar">
			{showRotation ? <div class="rui-carousel__toolbar-rotation">{rotationControl}</div> : null}
			<div class="rui-carousel__toolbar-side rui-carousel__toolbar-side--start">{prevControl}</div>
			<div class="rui-carousel__toolbar-center">{indicators}</div>
			<div class="rui-carousel__toolbar-side rui-carousel__toolbar-side--end">{nextControl}</div>
		</div>
	);

	const overlayChrome = overlay ? (
		<div class="rui-carousel__overlay-chrome">
			{showRotation ? <div class="rui-carousel__overlay-rotation">{rotationControl}</div> : null}
			<div class="rui-carousel__controls rui-carousel__controls--overlay">
				{prevControl}
				{nextControl}
			</div>
			{indicators}
		</div>
	) : null;

	return (
		<section
			class={cx('rui-carousel', `rui-carousel--${transition}`, `rui-carousel--controls-${controlsVariant}`)}
			data-ref="root"
			aria-roledescription="carousel"
			aria-label={label}
		>
			<div class="rui-carousel__stage">
				<div class="rui-carousel__viewport" data-ref="viewport">
					<div class="rui-carousel__track" data-ref="track">
						{children}
					</div>
					{overlayChrome}
				</div>
			</div>
			{!overlay ? <div class="rui-carousel__footer">{toolbarControls}</div> : null}
		</section>
	);
}

export function RuiCarousel({
	slides,
	children,
	prev,
	next,
	rotation,
	label = CAROUSEL_DEFAULTS.label,
	transition = CAROUSEL_DEFAULTS.transition,
	controlsVariant = CAROUSEL_DEFAULTS.controlsVariant,
	showIndicators,
	showRotationControl,
	autoplay,
	...props
}: JsxCustomElementAttributes<
	RuiCarouselElement,
	RuiCarouselProps & {
		slides?: RuiCarouselSlideData[];
		prev?: JsxRenderable;
		next?: JsxRenderable;
		rotation?: JsxRenderable;
	}
>) {
	const slideList = slides ?? [];
	const slideContent =
		slides != null
			? slideList.map((slide) => <RuiCarouselSlide id={slide.id}>{slide.children}</RuiCarouselSlide>)
			: children;

	return (
		<rui-carousel
			{...props}
			label={label}
			transition={transition}
			controlsVariant={controlsVariant}
			showIndicators={showIndicators}
			showRotationControl={showRotationControl}
			autoplay={autoplay}
			slideCount={slideList.length}
		>
			<CarouselShell
				autoplay={autoplay}
				controlsVariant={controlsVariant}
				label={label}
				next={next}
				prev={prev}
				rotation={rotation}
				showIndicators={showIndicators}
				showRotationControl={showRotationControl}
				transition={transition}
			>
				{slideContent}
			</CarouselShell>
		</rui-carousel>
	);
}
