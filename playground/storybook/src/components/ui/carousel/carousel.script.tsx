import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';

export type RuiCarouselTransition = 'none' | 'slide' | 'fade';

export type RuiCarouselProps = {
	label?: string;
	index?: number;
	autoplay?: boolean;
	transition?: RuiCarouselTransition;
	showIndicators?: boolean;
	showRotationControl?: boolean;
	loop?: boolean;
	/** When true, prev/next wrap and controls stay enabled at the ends. Default: true. */
	wrap?: boolean;
	/** Authored slide count for render-time control state before slot projection. */
	slideCount?: number;
};

/**
 * `<rui-carousel>` — sequentially displays one slide at a time.
 *
 * Implements the APG Carousel with previous/next controls, optional slide
 * indicators, rotation control, keyboard navigation, and configurable transitions.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
 * @element rui-carousel
 */
@customElement('rui-carousel')
export class RuiCarousel extends RadiantElement {
	@prop({ type: String, defaultValue: 'Carousel' }) label: string;
	@prop({ type: Number, reflect: true, defaultValue: 0 }) index: number;
	@prop({ type: Boolean, defaultValue: false }) autoplay: boolean;
	@prop({ type: String, defaultValue: 'none' }) transition: RuiCarouselTransition;
	@prop({ type: Boolean, defaultValue: false }) showIndicators: boolean;
	@prop({ type: Boolean, defaultValue: false }) showRotationControl: boolean;
	@prop({ type: Boolean, defaultValue: true }) loop: boolean;
	@prop({ type: Boolean, defaultValue: true }) wrap: boolean;
	@prop({ type: Number, defaultValue: 0 }) slideCount: number;

	private timer: ReturnType<typeof setInterval> | null = null;
	private paused = false;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.sync();
			this.syncAutoplay();
			this.syncIndicators();
		});
	}

	override disconnectedCallback(): void {
		this.stop();
		super.disconnectedCallback();
	}

	@onUpdated(['index', 'transition', 'loop', 'wrap'])
	onSlideStateUpdated(): void {
		this.sync();
		this.syncIndicators();
	}

	@onUpdated(['autoplay', 'showRotationControl'])
	onAutoplayUpdated(): void {
		this.syncAutoplay();
		this.syncRotationControl();
	}

	@onUpdated(['showIndicators'])
	onIndicatorsUpdated(): void {
		this.syncIndicators();
	}

	private getSlides(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-slide]'));
	}

	private get shouldWrap(): boolean {
		return this.wrap && this.loop;
	}

	private normalizeIndex(raw: number, count: number): number {
		if (count <= 0) {
			return 0;
		}

		if (!this.shouldWrap) {
			return Math.min(Math.max(raw, 0), count - 1);
		}

		return ((raw % count) + count) % count;
	}

	private sync(): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		const normalized = this.normalizeIndex(this.index, slides.length);
		if (normalized !== this.index) {
			this.index = normalized;
		}

		const track = this.querySelector<HTMLElement>('.rui-carousel__track');
		if (track && this.transition === 'slide') {
			track.style.setProperty('--rui-carousel-index', String(normalized));
		}

		slides.forEach((slide, i) => {
			const active = i === normalized;

			if (this.transition === 'none') {
				slide.hidden = !active;
			} else {
				slide.hidden = false;
			}

			slide.setAttribute('aria-hidden', String(!active));
			slide.setAttribute('data-active', active ? 'true' : 'false');
		});

		this.syncPrevNextDisabled(slides.length, normalized);
	}

	private syncPrevNextDisabled(count: number, normalized: number): void {
		const prev = this.querySelector<HTMLButtonElement>('[data-ref="prev"]');
		const next = this.querySelector<HTMLButtonElement>('[data-ref="next"]');

		if (!prev || !next || this.shouldWrap) {
			prev?.removeAttribute('disabled');
			next?.removeAttribute('disabled');
			return;
		}

		prev.disabled = normalized <= 0;
		next.disabled = normalized >= count - 1;
	}

	private syncIndicators(): void {
		const container = this.querySelector<HTMLElement>('[data-ref="indicators"]');
		if (!container) {
			return;
		}

		const slides = this.getSlides();
		const normalized = this.normalizeIndex(this.index, slides.length);
		const existing = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]'));

		if (existing.length !== slides.length) {
			container.replaceChildren(
				...slides.map((_, i) => {
					const button = document.createElement('button');
					button.type = 'button';
					button.className = 'rui-carousel__indicator';
					button.setAttribute('role', 'tab');
					button.setAttribute('data-carousel-indicator', String(i));
					button.setAttribute('aria-label', `Slide ${i + 1}`);
					return button;
				}),
			);
		}

		const indicators = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]'));
		indicators.forEach((indicator, i) => {
			const selected = i === normalized;
			indicator.setAttribute('aria-selected', String(selected));
			indicator.tabIndex = selected ? 0 : -1;
		});
	}

	private syncRotationControl(): void {
		const toggle = this.querySelector<HTMLButtonElement>('[data-ref="rotation"]');
		if (!toggle) {
			return;
		}

		const playing = this.autoplay && !this.paused;
		toggle.setAttribute('aria-pressed', String(playing));
		toggle.setAttribute('aria-label', playing ? 'Pause rotation' : 'Start rotation');
	}

	private syncAutoplay(): void {
		if (this.autoplay && !this.paused) {
			this.start();
		} else {
			this.stop();
		}

		this.syncRotationControl();
	}

	private start(): void {
		this.stop();
		this.timer = setInterval(() => {
			this.goTo(this.index + 1);
		}, 4000);
	}

	private stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
		}

		this.timer = null;
	}

	private goTo(next: number): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		this.index = this.normalizeIndex(next, slides.length);
		this.sync();
		this.syncIndicators();
	}

	private userNavigate(delta: number): void {
		this.paused = true;
		this.stop();
		this.goTo(this.index + delta);
	}

	@onEvent({ ref: 'prev', type: 'click' })
	prev(): void {
		this.userNavigate(-1);
	}

	@onEvent({ ref: 'next', type: 'click' })
	next(): void {
		this.userNavigate(1);
	}

	@onEvent({ ref: 'rotation', type: 'click' })
	toggleRotation(): void {
		if (!this.autoplay) {
			this.autoplay = true;
			this.paused = false;
		} else {
			this.paused = !this.paused;
		}

		this.syncAutoplay();
	}

	@onEvent({ selector: '[data-carousel-indicator]', type: 'click' })
	onIndicatorClick(event: Event): void {
		const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-carousel-indicator]');
		if (!button) {
			return;
		}

		const indicatorIndex = Number(button.getAttribute('data-carousel-indicator'));
		if (!Number.isFinite(indicatorIndex)) {
			return;
		}

		this.paused = true;
		this.stop();
		this.goTo(indicatorIndex);
		button.focus();
	}

	@onEvent({ selector: '[data-carousel-indicator]', type: 'keydown' })
	onIndicatorKeydown(event: KeyboardEvent): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		const current = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-carousel-indicator]');
		if (!current) {
			return;
		}

		let nextIndex = Number(current.getAttribute('data-carousel-indicator'));
		if (!Number.isFinite(nextIndex)) {
			return;
		}

		if (event.key === 'ArrowRight') {
			nextIndex = this.normalizeIndex(nextIndex + 1, slides.length);
		} else if (event.key === 'ArrowLeft') {
			nextIndex = this.normalizeIndex(nextIndex - 1, slides.length);
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = slides.length - 1;
		} else {
			return;
		}

		event.preventDefault();
		this.paused = true;
		this.stop();
		this.goTo(nextIndex);

		const indicators = Array.from(
			this.querySelectorAll<HTMLButtonElement>('[data-ref="indicators"] [data-carousel-indicator]'),
		);
		indicators[nextIndex]?.focus();
	}

	@onEvent({ ref: 'root', type: 'keydown' })
	onRootKeydown(event: KeyboardEvent): void {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			this.prev();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			this.next();
		} else if (event.key === 'Home') {
			event.preventDefault();
			this.paused = true;
			this.stop();
			this.goTo(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			this.paused = true;
			this.stop();
			this.goTo(this.getSlides().length - 1);
		}
	}

	@onEvent({ ref: 'root', type: 'mouseenter' })
	onRootMouseEnter(): void {
		if (this.autoplay) {
			this.stop();
		}
	}

	@onEvent({ ref: 'root', type: 'mouseleave' })
	onRootMouseLeave(): void {
		if (this.autoplay && !this.paused) {
			this.start();
		}
	}

	@onEvent({ ref: 'root', type: 'focusin' })
	onRootFocusIn(): void {
		if (this.autoplay) {
			this.stop();
		}
	}

	@onEvent({ ref: 'root', type: 'focusout' })
	onRootFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as Node | null;
		if (next && this.contains(next)) {
			return;
		}

		if (this.autoplay && !this.paused) {
			this.start();
		}
	}

	override render() {
		const showRotation = this.showRotationControl;
		const slideCount = Math.max(this.getSlides().length, this.slideCount);
		const normalized = this.normalizeIndex(this.index, slideCount || 1);
		const disablePrev = !this.shouldWrap && slideCount > 0 && normalized <= 0;
		const disableNext = !this.shouldWrap && slideCount > 0 && normalized >= slideCount - 1;

		queueMicrotask(() => {
			this.sync();
			this.syncIndicators();
			this.syncRotationControl();
		});

		return (
			<section
				class={`rui-carousel rui-carousel--${this.transition}`}
				data-ref="root"
				tabindex={0}
				aria-roledescription="carousel"
				aria-label={this.label}
			>
				<div class="rui-carousel__controls">
					<button
						type="button"
						data-ref="prev"
						class="rui-button rui-button--outline rui-button--sm"
						aria-label="Previous slide"
						disabled={disablePrev}
					>
						Previous
					</button>
					{showRotation ? (
						<button
							type="button"
							data-ref="rotation"
							class="rui-button rui-button--ghost rui-button--sm"
							aria-pressed={this.autoplay && !this.paused}
							aria-label={this.autoplay && !this.paused ? 'Pause rotation' : 'Start rotation'}
						>
							{this.autoplay && !this.paused ? 'Pause' : 'Play'}
						</button>
					) : null}
					<button
						type="button"
						data-ref="next"
						class="rui-button rui-button--outline rui-button--sm"
						aria-label="Next slide"
						disabled={disableNext}
					>
						Next
					</button>
				</div>
				{this.showIndicators ? (
					<div
						class="rui-carousel__indicators"
						data-ref="indicators"
						role="tablist"
						aria-label="Select slide"
					/>
				) : null}
				<div class="rui-carousel__viewport" aria-live="polite">
					<div
						class="rui-carousel__track"
						style={this.transition === 'slide' ? { '--rui-carousel-index': String(this.index) } : undefined}
					>
						<slot></slot>
					</div>
				</div>
			</section>
		);
	}
}
