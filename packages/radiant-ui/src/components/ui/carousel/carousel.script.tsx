import { RadiantElement, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';

export type RuiCarouselTransition = 'none' | 'slide' | 'fade';

/** Where default prev/next chrome is laid out. `toolbar` places controls below the slide; `overlay` pins them to the slide edges. */
export type RuiCarouselControlsVariant = 'toolbar' | 'overlay';

/**
 * Defaults the SSR shell depends on.
 *
 * @remarks Must match the host `@prop` defaults: the view composes classes and
 * the accessible name from these before hydration.
 */
export const CAROUSEL_DEFAULTS = {
	label: 'Carousel',
	transition: 'none',
	controlsVariant: 'toolbar',
} as const;

export type RuiCarouselProps = {
	label?: string;
	index?: number;
	autoplay?: boolean;
	/** Autoplay interval in milliseconds. */
	interval?: number;
	transition?: RuiCarouselTransition;
	/** Layout for built-in prev/next (and rotation) chrome. Default: toolbar below the slide. */
	controlsVariant?: RuiCarouselControlsVariant;
	showIndicators?: boolean;
	showRotationControl?: boolean;
	loop?: boolean;
	/** When true, prev/next wrap and controls stay enabled at the ends. Default: true. */
	wrap?: boolean;
	/** Authored slide count for render-time control state before slot projection. */
	slideCount?: number;
};

const SWIPE_THRESHOLD_PX = 48;

/**
 * `<rui-carousel>` — sequentially displays one slide at a time.
 *
 * Implements the [APG Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):
 * labeled `carousel` region, slide groups or tab panels, optional tabbed pickers,
 * rotation control when autoplay is enabled, and `aria-live` on the slide container.
 *
 * @summary Region that cycles slides; optional autoplay, transitions, and chrome.
 *
 * @element rui-carousel
 *
 * @attr {string} label - Accessible name for the carousel. Default: `Carousel`.
 * @attr {number} index - Active slide index. Default: `0`.
 * @attr {boolean} autoplay - Advance automatically. Default: `false`.
 * @attr {number} interval - Autoplay interval in ms. Default: `4000`.
 * @attr {('none'|'slide'|'fade')} transition - Slide swap animation. Default: `none`.
 * @attr {('toolbar'|'overlay')} controls-variant - Chrome layout. Default: `toolbar`.
 * @attr {boolean} show-indicators - Render tabbed indicator pickers. Default: `false`.
 * @attr {boolean} show-rotation-control - Render play/pause control. Default: `false`.
 * @attr {boolean} loop - Allow looping past the last slide. Default: `true`.
 * @attr {boolean} wrap - Keep controls enabled at the ends. Default: `true`.
 * @attr {number} slide-count - Authored slide count for render-time control state. Default: `0`.
 *
 * @cssclass rui-carousel - Root region (`aria-roledescription="carousel"`).
 * @cssclass rui-carousel--none - No animation between slides.
 * @cssclass rui-carousel--slide - Horizontal slide transition.
 * @cssclass rui-carousel--fade - Cross-fade transition.
 * @cssclass rui-carousel--controls-toolbar - Controls below the viewport.
 * @cssclass rui-carousel--controls-overlay - Controls overlaid on the viewport.
 * @cssclass rui-carousel__stage - Viewport wrapper.
 * @cssclass rui-carousel__viewport - Overflow-hidden slide window (`aria-live`).
 * @cssclass rui-carousel__track - Slide track.
 * @cssclass rui-carousel__footer - Controls row below the viewport (`toolbar`).
 * @cssclass rui-carousel__toolbar - Toolbar grid.
 * @cssclass rui-carousel__toolbar-rotation - Rotation control cell.
 * @cssclass rui-carousel__toolbar-center - Indicators cell.
 * @cssclass rui-carousel__toolbar-side--start - Prev control cell.
 * @cssclass rui-carousel__toolbar-side--end - Next control cell.
 * @cssclass rui-carousel__overlay-chrome - Absolute overlay layer over the viewport.
 * @cssclass rui-carousel__overlay-rotation - Rotation control overlay position.
 * @cssclass rui-carousel__controls--overlay - Prev/next overlay row.
 * @cssclass rui-carousel__indicators - Indicator tablist.
 * @cssclass rui-carousel__indicators--overlay - Overlay pill indicator tablist.
 * @cssclass rui-carousel__indicator - Indicator button (`role="tab"`).
 *
 * @remarks
 * Autoplay pauses on hover, pointer interaction, focus, and hidden tabs, and
 * respects `prefers-reduced-motion`. `aria-live` flips to `off` while rotating.
 * Prev/next and rotation chrome classes are authored by the `RuiCarouselPrev` /
 * `RuiCarouselNext` / `RuiCarouselRotation` view helpers for custom placement.
 */
@customElement('rui-carousel')
export class RuiCarousel extends RadiantElement {
	@prop({ type: String, defaultValue: CAROUSEL_DEFAULTS.label }) label: string;
	@prop({ type: Number, reflect: true, defaultValue: 0 }) index: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) autoplay: boolean;
	@prop({ type: Number, defaultValue: 4000 }) interval: number;
	@prop({ type: String, defaultValue: CAROUSEL_DEFAULTS.transition }) transition: RuiCarouselTransition;
	@prop({ type: String, defaultValue: CAROUSEL_DEFAULTS.controlsVariant, attribute: 'controls-variant' })
	controlsVariant: RuiCarouselControlsVariant;
	@prop({ type: Boolean, defaultValue: false }) showIndicators: boolean;
	@prop({ type: Boolean, defaultValue: false }) showRotationControl: boolean;
	@prop({ type: Boolean, defaultValue: true }) loop: boolean;
	@prop({ type: Boolean, defaultValue: true }) wrap: boolean;
	@prop({ type: Number, defaultValue: 0 }) slideCount: number;

	private timer: ReturnType<typeof setInterval> | null = null;
	private paused = false;
	/** User explicitly resumed rotation (e.g. via rotation control) despite reduced motion. */
	private userOverrideReducedMotion = false;
	private swipePointerId: number | null = null;
	private swipeStartX = 0;
	private swipeStartY = 0;

	protected override onConnected(): void {
		if (this.autoplay && this.prefersReducedMotion()) {
			this.paused = true;
		}
		this.sync();
		this.syncAutoplay();
		this.syncIndicators();
		this.syncAriaLive();
	}

	override disconnectedCallback(): void {
		this.stop();
		super.disconnectedCallback();
	}

	@onUpdated(['index', 'transition', 'loop', 'wrap', 'controlsVariant'])
	onSlideStateUpdated(): void {
		this.sync();
		this.syncIndicators();
		this.syncAutoplay();
	}

	@onUpdated(['autoplay', 'showRotationControl', 'interval'])
	onAutoplayUpdated(): void {
		this.syncAutoplay();
		this.syncRotationControl();
	}

	@onUpdated(['showIndicators'])
	onIndicatorsUpdated(): void {
		this.syncIndicators();
	}

	private prefersReducedMotion(): boolean {
		return (
			typeof window !== 'undefined' &&
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	}

	private getCarouselId(): string {
		return this.id || 'rui-carousel';
	}

	private slidePanelId(slide: HTMLElement, index: number): string {
		const key = slide.getAttribute('data-slide') ?? String(index);
		const panelId = `${this.getCarouselId()}-panel-${key}`;
		slide.id = panelId;
		return panelId;
	}

	private tabId(index: number): string {
		return `${this.getCarouselId()}-tab-${index}`;
	}
	private syncSlideAccessibility(slides: HTMLElement[], activeIndex: number): void {
		const count = slides.length;

		slides.forEach((slide, i) => {
			const active = i === activeIndex;
			const positionLabel = `${i + 1} of ${count}`;

			if (this.showIndicators) {
				this.slidePanelId(slide, i);
				slide.setAttribute('role', 'tabpanel');
				slide.setAttribute('aria-labelledby', this.tabId(i));
				slide.setAttribute('aria-label', positionLabel);
				slide.removeAttribute('aria-roledescription');
			} else {
				slide.setAttribute('role', 'group');
				slide.setAttribute('aria-roledescription', 'slide');
				slide.setAttribute('aria-label', positionLabel);
				slide.removeAttribute('aria-labelledby');
				slide.removeAttribute('tabindex');
			}

			if (this.transition === 'none') {
				slide.hidden = !active;
			} else {
				slide.hidden = false;
			}

			slide.setAttribute('aria-hidden', String(!active));
			slide.setAttribute('data-active', active ? 'true' : 'false');
		});
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

		this.syncSlideAccessibility(slides, normalized);

		this.syncPrevNextDisabled(slides.length, normalized);
	}

	private syncPrevNextDisabled(count: number, normalized: number): void {
		const disablePrev = !this.shouldWrap && count > 0 && normalized <= 0;
		const disableNext = !this.shouldWrap && count > 0 && normalized >= count - 1;

		for (const button of this.querySelectorAll<HTMLButtonElement>('[data-carousel-action="prev"]')) {
			if (this.shouldWrap) {
				button.removeAttribute('disabled');
			} else {
				button.disabled = disablePrev;
			}
		}

		for (const button of this.querySelectorAll<HTMLButtonElement>('[data-carousel-action="next"]')) {
			if (this.shouldWrap) {
				button.removeAttribute('disabled');
			} else {
				button.disabled = disableNext;
			}
		}
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
				...slides.map((slide, i) => {
					const button = document.createElement('button');
					button.type = 'button';
					button.className = 'rui-carousel__indicator';
					button.id = this.tabId(i);
					button.setAttribute('role', 'tab');
					button.setAttribute('data-carousel-indicator', String(i));
					button.setAttribute('aria-controls', this.slidePanelId(slide, i));
					button.setAttribute('aria-label', `Slide ${i + 1}`);
					return button;
				}),
			);
		}

		const indicators = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]'));
		indicators.forEach((indicator, i) => {
			const selected = i === normalized;
			const slide = slides[i];
			if (slide) {
				indicator.id = this.tabId(i);
				indicator.setAttribute('aria-controls', this.slidePanelId(slide, i));
			}
			indicator.setAttribute('aria-selected', String(selected));
			indicator.tabIndex = selected ? 0 : -1;
		});
	}

	private syncRotationControl(): void {
		for (const toggle of this.querySelectorAll<HTMLButtonElement>('[data-carousel-action="rotation"]')) {
			const playing = this.autoplay && !this.paused;
			toggle.setAttribute('aria-pressed', String(playing));
			toggle.setAttribute('aria-label', playing ? 'Pause rotation' : 'Start rotation');
		}
	}

	private syncAriaLive(): void {
		const viewport = this.querySelector<HTMLElement>('[data-ref="viewport"]');
		if (!viewport) {
			return;
		}

		const rotating = this.autoplay && !this.paused && this.timer !== null;
		viewport.setAttribute('aria-live', rotating ? 'off' : 'polite');
		viewport.setAttribute('aria-atomic', 'false');
	}

	private canAutoplayRotate(): boolean {
		if (!this.autoplay || this.paused) {
			return false;
		}

		if (this.prefersReducedMotion() && !this.userOverrideReducedMotion) {
			return false;
		}

		return true;
	}

	private syncAutoplay(): void {
		if (this.canAutoplayRotate()) {
			this.start();
		} else {
			this.stop();
		}

		this.syncRotationControl();
		this.syncAriaLive();
	}

	private start(): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		if (!this.shouldWrap && this.index >= slides.length - 1) {
			this.stop();
			return;
		}

		this.stop();
		const ms = Math.max(0, this.interval);
		this.timer = setInterval(() => {
			const currentSlides = this.getSlides();
			if (!currentSlides.length) {
				return;
			}

			if (!this.shouldWrap && this.index >= currentSlides.length - 1) {
				this.stop();
				this.syncAriaLive();
				return;
			}

			this.goTo(this.index + 1);
		}, ms);
		this.syncAriaLive();
	}

	private stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
		}

		this.timer = null;
		this.syncAriaLive();
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

	private isSwipeExcludedTarget(target: EventTarget | null): boolean {
		if (!(target instanceof Element)) {
			return false;
		}

		return Boolean(
			target.closest('button, a, input, textarea, select, [data-carousel-indicator], [data-carousel-action]'),
		);
	}

	@onEvent({ selector: '[data-carousel-action="prev"]', type: 'click' })
	prev(): void {
		this.userNavigate(-1);
	}

	@onEvent({ selector: '[data-carousel-action="next"]', type: 'click' })
	next(): void {
		this.userNavigate(1);
	}

	@onEvent({ selector: '[data-carousel-action="rotation"]', type: 'click' })
	toggleRotation(): void {
		if (!this.autoplay) {
			this.autoplay = true;
			this.paused = false;
			this.userOverrideReducedMotion = true;
		} else {
			this.paused = !this.paused;
			if (!this.paused) {
				this.userOverrideReducedMotion = true;
			}
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
		} else if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			this.paused = true;
			this.stop();
			this.goTo(nextIndex);
			return;
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

	@onEvent({ ref: 'root', type: 'pointerenter' })
	onRootPointerEnter(event: PointerEvent): void {
		if (this.autoplay && event.pointerType === 'mouse') {
			this.stop();
		}
	}

	@onEvent({ ref: 'root', type: 'pointerleave' })
	onRootPointerLeave(event: PointerEvent): void {
		if (this.autoplay && !this.paused && event.pointerType === 'mouse') {
			this.syncAutoplay();
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
			this.syncAutoplay();
		}
	}

	@onEvent({ ref: 'viewport', type: 'pointerdown' })
	onViewportPointerDown(event: PointerEvent): void {
		if (event.button !== 0 || this.isSwipeExcludedTarget(event.target)) {
			return;
		}

		this.swipePointerId = event.pointerId;
		this.swipeStartX = event.clientX;
		this.swipeStartY = event.clientY;
	}

	@onEvent({ ref: 'viewport', type: 'pointermove' })
	onViewportPointerMove(event: PointerEvent): void {
		if (this.swipePointerId !== event.pointerId) {
			return;
		}
	}

	@onEvent({ ref: 'viewport', type: 'pointerup' })
	onViewportPointerUp(event: PointerEvent): void {
		if (this.swipePointerId !== event.pointerId) {
			return;
		}

		const dx = event.clientX - this.swipeStartX;
		const dy = event.clientY - this.swipeStartY;
		this.swipePointerId = null;

		if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) {
			return;
		}

		if (dx < 0) {
			this.next();
		} else {
			this.prev();
		}
	}

	@onEvent({ ref: 'viewport', type: 'pointercancel' })
	onViewportPointerCancel(event: PointerEvent): void {
		if (this.swipePointerId === event.pointerId) {
			this.swipePointerId = null;
		}
	}
}
