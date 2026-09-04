import { RadiantElement, customElement, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import { uniqueId } from '@/lib/unique-id';

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
	/** Authored slide count for render-time control state before the view paints slides. */
	slideCount?: number;
};

const SWIPE_THRESHOLD_PX = 48;

/**
 * `<rui-carousel>` — sequentially displays one slide at a time.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiCarousel` view helpers which stamp the same targets.
 *
 * Implements the [APG Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):
 * labeled `carousel` region, slide groups or tab panels, optional tabbed pickers,
 * rotation control when autoplay is enabled, and `aria-live` on the slide container.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — carousel region. View seeds `aria-roledescription="carousel"` and `aria-label`.
 * - `[data-ref="viewport"]` — slide window. Host sets `aria-live` and `aria-atomic`; swipe target.
 * - `[data-ref="track"]` — slide track. Host sets `--rui-carousel-index` when `transition="slide"`.
 * - `[data-slide]` — one slide per panel. Host sets `role`, `aria-*`, `aria-hidden`, `data-active`,
 *   `hidden` (when `transition="none"`), and `id`.
 *
 * Optional:
 * - `[data-carousel-action="prev"]` / `[data-carousel-action="next"]` — navigation buttons.
 *   Host toggles `disabled` at the ends when `wrap` is false.
 * - `[data-carousel-action="rotation"]` — play/pause when `autoplay` or `show-rotation-control`.
 *   Host sets `aria-pressed` and `aria-label`.
 * - `[data-ref="indicators"]` — tablist container when `show-indicators`. Host creates or updates
 *   `[data-carousel-indicator]` buttons inside.
 *
 * Do not set `role`, `aria-hidden`, `aria-selected`, or `tabIndex` on slides or indicators — the host owns those.
 *
 * Nested hosts: none.
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
 * @remarks
 * Autoplay pauses on hover, pointer interaction, focus, and hidden tabs, and
 * respects `prefers-reduced-motion`. `aria-live` flips to `off` while rotating.
 * BEM classes live on the view; the host queries `[data-ref="track"]` for slide transitions.
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

	@query({ ref: 'track' }) trackTarget: HTMLElement;
	@query({ ref: 'indicators' }) indicatorsTarget: HTMLElement;
	@query({ ref: 'viewport' }) viewportTarget: HTMLElement;

	private timer: ReturnType<typeof setInterval> | null = null;
	private paused = false;
	private readonly uid = uniqueId('rui-carousel');
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

	private slidePanelId(slide: HTMLElement, index: number): string {
		const key = slide.getAttribute('data-slide') ?? String(index);
		const panelId = `${this.uid}-panel-${key}`;
		slide.id = panelId;
		return panelId;
	}

	private tabId(index: number): string {
		return `${this.uid}-tab-${index}`;
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

		const track = this.trackTarget;
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
		const container = this.indicatorsTarget;
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
		const viewport = this.viewportTarget;
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
			this.indicatorsTarget?.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]') ?? [],
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
