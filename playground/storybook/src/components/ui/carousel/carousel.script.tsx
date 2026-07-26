import { RadiantElement, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';

export type RuiCarouselTransition = 'none' | 'slide' | 'fade';

/** Where default prev/next chrome is laid out. `toolbar` places controls below the slide; `overlay` pins them to the slide edges. */
export type RuiCarouselControlsVariant = 'toolbar' | 'overlay';

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

type RuiCarouselBindings = {
	label: string;
};

/**
 * `<rui-carousel>` — sequentially displays one slide at a time.
 *
 * Implements the [APG Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/):
 * labeled `carousel` region, slide groups or tab panels, optional tabbed pickers,
 * rotation control when autoplay is enabled, and `aria-live` on the slide container.
 *
 * @element rui-carousel
 * @slot prev - Optional custom previous control. Use `data-carousel-action="prev"`.
 * @slot next - Optional custom next control. Use `data-carousel-action="next"`.
 * @slot rotation - Optional play/pause control when `show-rotation-control` is set. Use `data-carousel-action="rotation"`.
 */
@customElement('rui-carousel')
export class RuiCarousel extends RadiantElement<RuiCarouselBindings> {
	@prop({ type: String, defaultValue: 'Carousel' }) label: string;
	@prop({ type: Number, reflect: true, defaultValue: 0 }) index: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) autoplay: boolean;
	@prop({ type: Number, defaultValue: 4000 }) interval: number;
	@prop({ type: String, defaultValue: 'none' }) transition: RuiCarouselTransition;
	@prop({ type: String, defaultValue: 'toolbar', attribute: 'controls-variant' })
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

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			if (this.autoplay && this.prefersReducedMotion()) {
				this.paused = true;
			}
			this.sync();
			this.syncAutoplay();
			this.syncIndicators();
			this.syncAriaLive();
		});
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

	private shouldShowRotationControl(): boolean {
		return this.autoplay || this.showRotationControl;
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

	/**
	 * Only `aria-label` is bound below. Everything else in this render() stays
	 * a plain read — audited, not an outstanding gap:
	 * - disablePrev/disableNext must apply uniformly to the default button AND
	 *   any consumer-supplied `[data-carousel-action="prev"/"next"]` element
	 *   slotted in (see syncPrevNextDisabled()) — a binding only patches this
	 *   host's own template position, not a slotted replacement.
	 * - playing/ariaLive derive from `paused` and the live `timer` handle,
	 *   plain instance fields mutated across pointer/focus/keyboard handlers
	 *   and `setInterval`, not reactive members — promoting them would add an
	 *   explicit notify step at every one of those call sites for no behavior
	 *   change and real drift risk.
	 * - the indicator buttons are a variable-length list built with
	 *   `replaceChildren()` (see syncIndicators()) — bindings patch one value
	 *   at one position, they don't reconcile a dynamic list.
	 */
	override render() {
		const showRotation = this.shouldShowRotationControl();
		const slideCount = Math.max(this.getSlides().length, this.slideCount);
		const normalized = this.normalizeIndex(this.index, slideCount || 1);
		const disablePrev = !this.shouldWrap && slideCount > 0 && normalized <= 0;
		const disableNext = !this.shouldWrap && slideCount > 0 && normalized >= slideCount - 1;
		const playing = this.autoplay && !this.paused;
		const ariaLive = playing && this.timer !== null ? 'off' : 'polite';
		const overlay = this.controlsVariant === 'overlay';

		queueMicrotask(() => {
			this.sync();
			this.syncIndicators();
			this.syncRotationControl();
			this.syncAriaLive();
		});

		const prevControl = (
			<slot name="prev">
				<button
					type="button"
					data-carousel-action="prev"
					data-ref="prev"
					class={`rui-carousel__nav rui-button rui-button--outline rui-button--sm${overlay ? ' rui-carousel__nav--overlay' : ' rui-carousel__nav--toolbar'}`}
					aria-label="Previous slide"
					disabled={disablePrev}
				>
					{overlay ? (
						<span class="rui-carousel__nav-icon" aria-hidden="true">
							‹
						</span>
					) : (
						<span class="rui-carousel__nav-label">
							<span class="rui-carousel__nav-icon" aria-hidden="true">
								‹
							</span>
							Previous
						</span>
					)}
				</button>
			</slot>
		);

		const nextControl = (
			<slot name="next">
				<button
					type="button"
					data-carousel-action="next"
					data-ref="next"
					class={`rui-carousel__nav rui-button rui-button--outline rui-button--sm${overlay ? ' rui-carousel__nav--overlay' : ' rui-carousel__nav--toolbar'}`}
					aria-label="Next slide"
					disabled={disableNext}
				>
					{overlay ? (
						<span class="rui-carousel__nav-icon" aria-hidden="true">
							›
						</span>
					) : (
						<span class="rui-carousel__nav-label">
							Next
							<span class="rui-carousel__nav-icon" aria-hidden="true">
								›
							</span>
						</span>
					)}
				</button>
			</slot>
		);

		const rotationControl = showRotation ? (
			<slot name="rotation">
				<button
					type="button"
					data-carousel-action="rotation"
					data-ref="rotation"
					class={`rui-carousel__rotation rui-button rui-button--ghost rui-button--sm${overlay ? ' rui-carousel__rotation--overlay' : ''}`}
					aria-pressed={playing}
					aria-label={playing ? 'Pause rotation' : 'Start rotation'}
				>
					{playing ? 'Pause' : 'Play'}
				</button>
			</slot>
		) : null;

		const indicators = this.showIndicators ? (
			<div
				class={`rui-carousel__indicators${overlay ? ' rui-carousel__indicators--overlay' : ''}`}
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
				class={`rui-carousel rui-carousel--${this.transition} rui-carousel--controls-${this.controlsVariant}`}
				data-ref="root"
				aria-roledescription="carousel"
				aria-label={this.$.label}
			>
				<div class="rui-carousel__stage">
					<div class="rui-carousel__viewport" data-ref="viewport" aria-live={ariaLive} aria-atomic={false}>
						<div
							class="rui-carousel__track"
							style={
								this.transition === 'slide' ? { '--rui-carousel-index': String(this.index) } : undefined
							}
						>
							<slot></slot>
						</div>
						{overlayChrome}
					</div>
				</div>
				{!overlay ? <div class="rui-carousel__footer">{toolbarControls}</div> : null}
			</section>
		);
	}
}
