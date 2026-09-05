import { RadiantElement, customElement, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import { uniqueId } from '@/lib/unique-id';
import { CarouselAutoplay } from './carousel-autoplay';
import { CarouselSwipe } from './carousel-swipe';
import {
	advanceIndex,
	carouselGapCount,
	isSlideInView,
	resolveCarouselSurface,
	resolveCarouselTrackMode,
	resolveCarouselWindow,
	type CarouselTrackMode,
	type CarouselWindow,
	type CarouselWindowParams,
} from './carousel-window';

export type RuiCarouselTransition = 'none' | 'slide' | 'fade';

/** Where default prev/next chrome is laid out. `toolbar` places controls below the slide; `overlay` pins them to the slide edges. */
export type RuiCarouselControlsVariant = 'toolbar' | 'overlay';

export {
	resolveCarouselSurface,
	resolveCarouselTrackMode,
	type CarouselSurface,
	type CarouselTrackMode,
} from './carousel-window';

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
	slidesPerView: 1,
	slidesPerGroup: 1,
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
	/** How many slides fill the viewport. Values `>= 1`; fractional peek is allowed. Default: `1`. */
	slidesPerView?: number;
	/** How many slides prev/next/autoplay/swipe move. Default: `1`. */
	slidesPerGroup?: number;
	/** Authored slide count for render-time control state before the view paints slides. */
	slideCount?: number;
};

/**
 * `<rui-carousel>` — sequentially displays a window of slides.
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
 *   Host sets `data-carousel-track` (`swap` | `stack` | `window`) and `data-carousel-surface`
 *   (`shell` | `cards`).
 * - `[data-ref="viewport"]` — slide window. Host sets `aria-live` and `aria-atomic`; swipe target.
 * - `[data-ref="track"]` — slide track. Host sets `--rui-carousel-index`,
 *   `--rui-carousel-slides-per-view`, `--rui-carousel-gap-count`, and `--rui-carousel-slide-count`.
 * - `[data-slide]` — one slide per panel. Host sets `role`, `aria-*`, `aria-hidden`, `data-active`,
 *   `hidden` (when track mode is `swap`), and `id`.
 *
 * Optional:
 * - `[data-carousel-action="prev"]` / `[data-carousel-action="next"]` — navigation buttons.
 *   Host toggles `disabled` at the ends when `wrap` is false.
 * - `[data-carousel-action="rotation"]` — play/pause when `autoplay` or `show-rotation-control`.
 *   Host sets `aria-pressed` and `aria-label`.
 * - `[data-ref="indicators"]` — indicator container when `show-indicators`. Host sets `role="tablist"`
 *   for one slide per view, or `role="group"` for multiple slides, and its `aria-label`.
 *   Creates one `[data-carousel-indicator]` per valid window start. Single-slide indicators
 *   use `role="tab"` and `aria-selected`; window buttons use `aria-current`. Both set
 *   `aria-controls`, `aria-label`, `id`, and roving `tabIndex`.
 *
 * Do not set `role`, `aria-hidden`, `aria-selected`, or `tabIndex` on slides or indicators — the host owns those.
 *
 * Nested hosts: none.
 *
 * @summary Region that cycles a window of slides; optional autoplay, transitions, and chrome.
 *
 * @element rui-carousel
 *
 * @attr {string} label - Accessible name for the carousel. Default: `Carousel`.
 * @attr {number} index - First visible slide index. Default: `0`.
 * @attr {boolean} autoplay - Advance automatically. Default: `false`.
 * @attr {number} interval - Autoplay interval in ms. Default: `4000`.
 * @attr {('none'|'slide'|'fade')} transition - Slide swap animation. Default: `none`.
 * @attr {('toolbar'|'overlay')} controls-variant - Chrome layout. Default: `toolbar`.
 * @attr {boolean} show-indicators - Render slide tabs or multi-slide window buttons. Default: `false`.
 * @attr {boolean} show-rotation-control - Render play/pause control. Default: `false`.
 * @attr {boolean} loop - Allow looping past the last slide. Default: `true`.
 * @attr {boolean} wrap - Keep controls enabled at the ends. Default: `true`.
 * @attr {number} slides-per-view - Slides that fill the viewport. Default: `1`.
 * @attr {number} slides-per-group - Slides moved per prev/next/autoplay/swipe. Default: `1`.
 * @attr {number} slide-count - Authored slide count for render-time control state. Default: `0`.
 *
 * @cssprop --rui-carousel-gap - Space between cards when `slides-per-view` is greater than 1. Default: `--space-inline`.
 * @cssprop --rui-carousel-radius - Corner radius on the shell viewport or each card. Default: `--radius-container`.
 * @cssprop --rui-carousel-border-color - Border on the shell viewport or each card. Default: `--border`.
 * @cssprop --rui-carousel-surface - Fill on the shell viewport or each card. Default: `--surface`.
 * @cssprop --rui-carousel-padding - Inset on the shell viewport (toolbar) or each card. Default: `--space-inset`.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
 *
 * @remarks
 * `index` is the first visible slide. `slides-per-view` greater than 1 paints a sliding
 * track of separate cards even when `transition` is `none` or `fade`. A single pane keeps
 * chrome on the viewport. Override `--rui-carousel-*` on `rui-carousel`. Autoplay pauses on
 * hover, pointer interaction, focus, and hidden tabs, and respects `prefers-reduced-motion`.
 * `aria-live` is `off` while the timer runs and `polite` when it stops. Indicators use the
 * same valid window starts as navigation. BEM classes live on the view; the host queries
 * `[data-ref="track"]` for slide transitions.
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
	@prop({ type: Number, defaultValue: CAROUSEL_DEFAULTS.slidesPerView, attribute: 'slides-per-view' })
	slidesPerView: number;
	@prop({ type: Number, defaultValue: CAROUSEL_DEFAULTS.slidesPerGroup, attribute: 'slides-per-group' })
	slidesPerGroup: number;
	@prop({ type: Number, defaultValue: 0 }) slideCount: number;

	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'track' }) trackTarget: HTMLElement;
	@query({ ref: 'indicators' }) indicatorsTarget: HTMLElement;
	@query({ ref: 'viewport' }) viewportTarget: HTMLElement;

	private paused = false;
	private readonly uid = uniqueId('rui-carousel');
	/** User explicitly resumed rotation (e.g. via rotation control) despite reduced motion. */
	private userOverrideReducedMotion = false;
	private readonly swipe = new CarouselSwipe();
	private readonly autoplayController = new CarouselAutoplay({
		getInterval: () => this.interval,
		canRotate: () => this.canAutoplayRotate(),
		onTick: () => this.onAutoplayTick(),
		onRunningChange: () => this.syncAriaLive(),
	});

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
		this.autoplayController.stop();
		super.disconnectedCallback();
	}

	@onUpdated(['index', 'transition', 'loop', 'wrap', 'controlsVariant', 'slidesPerView', 'slidesPerGroup'])
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
		this.sync();
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

	private getSlides(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-slide]'));
	}

	private get shouldWrap(): boolean {
		return this.wrap && this.loop;
	}

	private windowParams(count: number, index: number = this.index): CarouselWindowParams {
		return {
			index,
			count,
			slidesPerView: this.slidesPerView,
			slidesPerGroup: this.slidesPerGroup,
			wrap: this.shouldWrap,
		};
	}

	private windowFor(count: number): CarouselWindow {
		return resolveCarouselWindow(this.windowParams(count));
	}

	private trackMode(): CarouselTrackMode {
		return resolveCarouselTrackMode(this.transition, this.slidesPerView);
	}

	private syncSlideAccessibility(slides: HTMLElement[], activeIndex: number, slidesPerView: number): void {
		const count = slides.length;
		const trackMode = this.trackMode();

		slides.forEach((slide, i) => {
			const active = i === activeIndex;
			const inView = isSlideInView(i, activeIndex, count, slidesPerView);
			const positionLabel = `${i + 1} of ${count}`;

			if (this.showIndicators && slidesPerView === 1) {
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

			slide.hidden = trackMode === 'swap' && !active;
			slide.setAttribute('aria-hidden', String(!inView));
			slide.setAttribute('data-active', active ? 'true' : 'false');
		});
	}

	private sync(): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		const next = this.windowFor(slides.length);
		if (next.index !== this.index) {
			this.index = next.index;
		}

		const root = this.rootTarget;
		if (root) {
			root.setAttribute('data-carousel-track', this.trackMode());
			root.setAttribute('data-carousel-surface', resolveCarouselSurface(this.slidesPerView));
		}

		const track = this.trackTarget;
		if (track) {
			track.style.setProperty('--rui-carousel-index', String(next.index));
			track.style.setProperty('--rui-carousel-slides-per-view', String(next.slidesPerView));
			track.style.setProperty('--rui-carousel-gap-count', String(carouselGapCount(next.slidesPerView)));
			track.style.setProperty('--rui-carousel-slide-count', String(slides.length));
		}

		this.syncSlideAccessibility(slides, next.index, next.slidesPerView);
		this.syncPrevNextDisabled(next);
	}

	private syncPrevNextDisabled(window: CarouselWindow): void {
		const disablePrev = !this.shouldWrap && !window.canGoPrev;
		const disableNext = !this.shouldWrap && !window.canGoNext;

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
		const next = this.windowFor(slides.length);
		const tabbed = next.slidesPerView === 1;
		const windows = slides.slice(0, next.maxStartIndex + 1);
		container.setAttribute('role', tabbed ? 'tablist' : 'group');
		container.setAttribute('aria-label', tabbed ? 'Choose slide to display' : 'Choose slide window');
		const existing = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]'));

		if (existing.length !== windows.length) {
			container.replaceChildren(
				...windows.map((_slide, i) => {
					const button = document.createElement('button');
					button.type = 'button';
					button.className = 'rui-carousel__indicator';
					button.id = this.tabId(i);
					button.setAttribute('data-carousel-indicator', String(i));
					return button;
				}),
			);
		}

		const indicators = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]'));
		const panelIds = slides.map((slide, i) => this.slidePanelId(slide, i));
		indicators.forEach((indicator, i) => {
			const selected = i === next.index;
			indicator.id = this.tabId(i);
			indicator.setAttribute('aria-label', tabbed ? `Slide ${i + 1}` : `Slide window ${i + 1}`);
			indicator.setAttribute(
				'aria-controls',
				panelIds
					.filter((_id, slideIndex) => isSlideInView(slideIndex, i, slides.length, next.slidesPerView))
					.join(' '),
			);
			if (tabbed) {
				indicator.setAttribute('role', 'tab');
				indicator.setAttribute('aria-selected', String(selected));
				indicator.removeAttribute('aria-current');
			} else {
				indicator.removeAttribute('role');
				indicator.removeAttribute('aria-selected');
				if (selected) indicator.setAttribute('aria-current', 'true');
				else indicator.removeAttribute('aria-current');
			}
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

		const rotating = this.autoplay && !this.paused && this.autoplayController.isRunning;
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

		const slides = this.getSlides();
		if (!slides.length) {
			return false;
		}

		return this.windowFor(slides.length).canGoNext;
	}

	private onAutoplayTick(): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		const next = this.windowFor(slides.length);
		if (!next.canGoNext) {
			this.autoplayController.stop();
			this.syncAriaLive();
			return;
		}

		this.goTo(advanceIndex(this.windowParams(slides.length), 1));
	}

	private syncAutoplay(): void {
		this.autoplayController.sync();
		this.syncRotationControl();
		this.syncAriaLive();
	}

	private goTo(next: number): void {
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		this.index = resolveCarouselWindow(this.windowParams(slides.length, next)).index;
		this.sync();
		this.syncIndicators();
	}

	private userNavigate(deltaGroups: number): void {
		this.paused = true;
		this.autoplayController.stop();
		const slides = this.getSlides();
		if (!slides.length) {
			return;
		}

		this.goTo(advanceIndex(this.windowParams(slides.length), deltaGroups));
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
		this.autoplayController.stop();
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
			nextIndex = advanceIndex({ ...this.windowParams(slides.length, nextIndex), slidesPerGroup: 1 }, 1);
		} else if (event.key === 'ArrowLeft') {
			nextIndex = advanceIndex({ ...this.windowParams(slides.length, nextIndex), slidesPerGroup: 1 }, -1);
		} else if (event.key === 'Home') {
			nextIndex = 0;
		} else if (event.key === 'End') {
			nextIndex = this.windowFor(slides.length).maxStartIndex;
		} else if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			this.paused = true;
			this.autoplayController.stop();
			this.goTo(nextIndex);
			return;
		} else {
			return;
		}

		event.preventDefault();
		this.paused = true;
		this.autoplayController.stop();
		this.goTo(nextIndex);

		const indicators = Array.from(
			this.indicatorsTarget?.querySelectorAll<HTMLButtonElement>('[data-carousel-indicator]') ?? [],
		);
		indicators[this.index]?.focus();
	}

	@onEvent({ ref: 'root', type: 'pointerenter' })
	onRootPointerEnter(event: PointerEvent): void {
		if (this.autoplay && event.pointerType === 'mouse') {
			this.autoplayController.stop();
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
			this.autoplayController.stop();
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
		this.swipe.onPointerDown(event, this.isSwipeExcludedTarget(event.target));
	}

	@onEvent({ ref: 'viewport', type: 'pointerup' })
	onViewportPointerUp(event: PointerEvent): void {
		const direction = this.swipe.onPointerUp(event);
		if (direction === 'next') {
			this.next();
		} else if (direction === 'prev') {
			this.prev();
		}
	}

	@onEvent({ ref: 'viewport', type: 'pointercancel' })
	onViewportPointerCancel(event: PointerEvent): void {
		this.swipe.onPointerCancel(event);
	}
}
