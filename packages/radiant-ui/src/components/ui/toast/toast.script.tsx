import { RadiantElement, bound, customElement, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import {
	DEFAULT_TOAST_POSITION,
	TOAST_EXIT_MS,
	TOAST_LIFETIME,
	TOAST_SWIPE_THRESHOLD,
	type ToastId,
	type ToastPosition,
	type ToastVariant,
	splitToastPosition,
} from './toast-context';
import { toastState } from './toast-state';

/**
 * Absolute dismiss timestamps keyed by toast id.
 *
 * @remarks
 * Survives remounts when the toaster re-renders the list (e.g. a sibling
 * dismisses), so lifetime is not restarted from a full `duration`.
 */
const toastDeadlines = new Map<string, number>();

/**
 * Frozen leftover ms while a toast is paused (hover / interaction / hidden tab).
 *
 * @remarks
 * Absolute deadlines keep ticking during pause; this map holds remaining time so
 * resume continues from where the countdown left off.
 */
const toastRemainingMs = new Map<string, number>();

function deadlineKey(id: ToastId): string {
	return String(id);
}

function clearToastDeadline(id: ToastId): void {
	if (id === '') return;
	const key = deadlineKey(id);
	toastDeadlines.delete(key);
	toastRemainingMs.delete(key);
}

/** Clears shared dismiss timers (test / Storybook resets). */
export function resetToastDeadlines(): void {
	toastDeadlines.clear();
	toastRemainingMs.clear();
}

function freezeToastDeadline(id: ToastId): void {
	if (id === '') return;
	const key = deadlineKey(id);
	const deadline = toastDeadlines.get(key);
	if (deadline == null) return;
	toastRemainingMs.set(key, Math.max(0, deadline - Date.now()));
	toastDeadlines.delete(key);
}

export type RuiToastProps = {
	/** JSX list reconciliation key (not reflected to the DOM). */
	key?: string | number;
	toastId?: ToastId;
	title?: string;
	description?: string;
	variant?: ToastVariant;
	duration?: number;
	dismissible?: boolean;
	closeButton?: boolean;
	actionLabel?: string;
	position?: ToastPosition;
	/** When true, plays the exit animation then removes the toast. */
	markedDelete?: boolean;
};

type RuiToastBindings = {
	title: string;
	description: string;
	variant: ToastVariant;
	actionLabel: string;
	closeButton: boolean;
};

/**
 * `<rui-toast>` — a single transient notification in a toaster stack.
 *
 * Prefer the imperative {@link toast} API with `<rui-toaster>`; this element is
 * rendered by the toaster and is not typically authored by hand.
 *
 * The composed surface is `role="status"` (live region) with a per-variant
 * border accent. `loading` toasts never auto-dismiss.
 *
 * @element rui-toast
 *
 * @attr {string} toast-id - Toast id; used for deadline bookkeeping. Default: `''`.
 * @attr {string} title - Heading text. Default: `''`.
 * @attr {string} description - Supporting detail under the title. Default: `''`.
 * @attr {('default'|'info'|'success'|'warning'|'error'|'loading')} variant -
 *   Status tone; drives the icon and border accent. Default: `default`.
 * @attr {number} duration - Lifetime in ms before auto-dismiss. Default: `4000`.
 * @attr {boolean} dismissible - Allow close button / swipe-to-dismiss. Default: `true`.
 * @attr {boolean} close-button - Render the corner close control. Default: `false`.
 * @attr {string} action-label - Text for the optional action button. Default: `''`.
 * @attr {string} position - Placement; mirrors the toaster's position. Default: `bottom-end`.
 * @attr {boolean} marked-delete - Marks the toast for animated exit. Default: `false`.
 *
 * @fires rui-toast-mounted - Bubbles after the toast mounts and paints (enter
 *   animation / timer start); the toaster uses it to resync stack layout.
 *
 * @remarks
 * Styling lives on the composed surface — BEM classes authored here, not on a
 * JSX view. Variants map to semantic status roles (`info`, `success`, `warning`,
 * `error`) in `toast.css`.
 *
 * **Why a custom element?** The toast owns dismiss lifetime bookkeeping (pause
 * on hover / hidden tab, swipe-to-dismiss), which needs DOM state — not a
 * presentational view.
 *
 * @cssclass rui-toast - Toast surface (`role="status"`).
 * @cssclass rui-toast--info - Info tone (blue accent).
 * @cssclass rui-toast--success - Success tone (green accent).
 * @cssclass rui-toast--warning - Warning tone (amber accent).
 * @cssclass rui-toast--error - Error tone (red accent).
 * @cssclass rui-toast--loading - Loading tone (neutral accent).
 * @cssclass rui-toast__icon - Status icon wrapper.
 * @cssclass rui-toast__loader - Spinner for `loading` toasts.
 * @cssclass rui-toast__content - Title + description column.
 * @cssclass rui-toast__title - Heading.
 * @cssclass rui-toast__description - Supporting detail.
 * @cssclass rui-toast__action - Optional action button.
 * @cssclass rui-toast__close - Corner close control.
 */
@customElement('rui-toast')
export class RuiToast extends RadiantElement<RuiToastBindings> {
	@prop({ type: String, reflect: true, defaultValue: '' }) toastId: string;
	@prop({ type: String, defaultValue: '' }) title: string;
	@prop({ type: String, defaultValue: '' }) description: string;
	@prop({ type: String, reflect: true, defaultValue: 'default' }) variant: ToastVariant;
	@prop({ type: Number, defaultValue: TOAST_LIFETIME }) duration: number;
	@prop({ type: Boolean, defaultValue: true }) dismissible: boolean;
	@prop({ type: Boolean, defaultValue: false }) closeButton: boolean;
	@prop({ type: String, defaultValue: '' }) actionLabel: string;
	@prop({ type: String, defaultValue: DEFAULT_TOAST_POSITION }) position: ToastPosition;
	@prop({ type: Boolean, defaultValue: false }) markedDelete: boolean;

	@query({ ref: 'toast' }) toastTarget: HTMLElement;

	private mounted = false;
	private removed = false;
	private swiping = false;
	private swipeOut = false;
	private swipeAxis: 'x' | 'y' | null = null;
	private swipeOutDirection: 'left' | 'right' | 'up' | 'down' | null = null;
	private held = false;
	private timerReady = false;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private pointerStart: { x: number; y: number } | null = null;
	private dragStartTime: number | null = null;
	private exitTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Wire pointer listeners, then announce mount after paint so enter CSS can run.
	 *
	 * @remarks
	 * `mounted` stays true across disconnect so list remounts skip the enter
	 * animation (avoids an opacity flicker when siblings update). Timer state is
	 * still reset on disconnect and restarted on reconnect / first paint.
	 */
	override connectedCallback(): void {
		super.connectedCallback();
		const isReconnect = this.mounted;

		this.addEventListener('pointerdown', this.onPointerDown);
		this.addEventListener('pointermove', this.onPointerMove);
		this.addEventListener('pointerup', this.onPointerUp);
		this.addEventListener('pointercancel', this.onPointerUp);

		if (isReconnect) {
			this.timerReady = true;
			this.syncDomState();
			this.dispatchEvent(new CustomEvent('rui-toast-mounted', { bubbles: true }));
			if (!this.held && !this.removed) {
				this.startTimer();
			}
			return;
		}

		this.timerReady = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (!this.isConnected) return;
				this.mounted = true;
				this.timerReady = true;
				this.syncDomState();
				this.dispatchEvent(new CustomEvent('rui-toast-mounted', { bubbles: true }));
				if (!this.held && !this.removed) {
					this.startTimer();
				}
			});
		});
		this.syncDomState();
	}

	/**
	 * Clear timers on unmount. Only purge shared state when this instance was exiting —
	 * overflow toasts are intentionally unmounted while still queued.
	 */
	override disconnectedCallback(): void {
		this.clearTimer();
		if (this.exitTimer) {
			clearTimeout(this.exitTimer);
			this.exitTimer = null;
		}
		const id = this.resolvedId;
		if (id !== '' && this.removed) {
			toastState.remove(id);
		}
		this.held = false;
		this.timerReady = false;
		this.removeEventListener('pointerdown', this.onPointerDown);
		this.removeEventListener('pointermove', this.onPointerMove);
		this.removeEventListener('pointerup', this.onPointerUp);
		this.removeEventListener('pointercancel', this.onPointerUp);
		super.disconnectedCallback();
	}

	@onUpdated('position')
	onPositionUpdated(): void {
		this.syncDomState();
	}

	/**
	 * Hold or release auto-dismiss (toaster-controlled on stack hover).
	 *
	 * @remarks
	 * Pause freezes leftover ms so wall-clock time during hover does not consume
	 * the lifetime. Resume rebuilds the deadline from that remainder.
	 */
	setPaused(paused: boolean): void {
		if (this.held === paused) {
			if (!paused && this.timerReady && this.mounted && !this.removed && !this.timeoutId) {
				this.startTimer();
			}
			return;
		}
		this.held = paused;
		if (!this.timerReady || !this.mounted || this.removed) return;
		if (paused || document.hidden) {
			freezeToastDeadline(this.resolvedId);
			this.clearTimer();
		} else {
			this.startTimer();
		}
	}

	@onUpdated('duration')
	onDurationUpdated(): void {
		if (!this.timerReady || !this.mounted || this.removed || this.held) return;
		clearToastDeadline(this.resolvedId);
		this.startTimer();
	}

	@onUpdated('markedDelete')
	onMarkedDeleteUpdated(): void {
		if (this.markedDelete && !this.removed) {
			this.beginRemove();
		}
	}

	private get resolvedId(): ToastId {
		const raw = this.toastId;
		if (raw == null || raw === '') return '';
		const asNumber = Number(raw);
		return Number.isFinite(asNumber) && String(asNumber) === raw ? asNumber : raw;
	}

	private clearTimer(): void {
		if (this.timeoutId) clearTimeout(this.timeoutId);
		this.timeoutId = null;
	}

	/**
	 * Countdown to the toast's dismiss deadline.
	 *
	 * @remarks
	 * Deadlines live in a module map keyed by toast id so list remounts (sibling
	 * dismiss / re-render) resume leftover time instead of restarting `duration`.
	 * Hover pause stores remaining ms separately and rebuilds the deadline on resume.
	 */
	private startTimer(): void {
		if (this.held || this.removed || document.hidden) return;
		if (this.duration === Number.POSITIVE_INFINITY || this.variant === 'loading') return;
		if (this.duration <= 0) {
			this.beginRemove();
			return;
		}

		const id = this.resolvedId;
		const key = deadlineKey(id);
		const now = Date.now();

		let remaining = toastRemainingMs.get(key);
		toastRemainingMs.delete(key);

		if (remaining == null) {
			const deadline = toastDeadlines.get(key);
			remaining = deadline != null ? deadline - now : this.duration;
		}

		if (remaining <= 0) {
			clearToastDeadline(id);
			this.beginRemove();
			return;
		}

		toastDeadlines.set(key, now + remaining);
		this.clearTimer();
		this.timeoutId = setTimeout(() => {
			clearToastDeadline(id);
			this.beginRemove();
		}, remaining);
	}

	private beginRemove(): void {
		if (this.removed) return;
		this.removed = true;
		this.clearTimer();
		clearToastDeadline(this.resolvedId);
		this.syncDomState();
		if (!this.markedDelete) {
			toastState.dismiss(this.resolvedId);
		}
		this.exitTimer = setTimeout(() => {
			this.exitTimer = null;
			toastState.remove(this.resolvedId);
		}, TOAST_EXIT_MS);
	}

	@bound
	private onPointerDown(event: PointerEvent): void {
		if (!this.dismissible || this.variant === 'loading') return;
		if (event.button !== 0) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('[data-toast-close], [data-toast-action], button, a')) return;

		this.dragStartTime = Date.now();
		this.pointerStart = { x: event.clientX, y: event.clientY };
		this.swipeAxis = null;
		this.setPointerCapture(event.pointerId);
	}

	@bound
	private onPointerMove(event: PointerEvent): void {
		if (!this.pointerStart) return;
		const delta = { x: event.clientX - this.pointerStart.x, y: event.clientY - this.pointerStart.y };

		if (!this.startSwipe(delta)) return;
		this.swipeAxis ??= Math.abs(delta.x) > Math.abs(delta.y) ? 'x' : 'y';
		const amount = this.swipeAxis === 'x' ? { x: delta.x, y: 0 } : { x: 0, y: delta.y };
		if (this.isSwipeReversing(amount)) this.resetSwipeTranslation();
		else this.setSwipeTranslation(amount);
	}

	private startSwipe(delta: { x: number; y: number }): boolean {
		if (this.swiping) return true;
		if (Math.abs(delta.x) < 8 && Math.abs(delta.y) < 8) return false;
		this.swiping = true;
		this.syncDomState();
		return true;
	}

	private isSwipeReversing(amount: { x: number; y: number }): boolean {
		const { x, y } = splitToastPosition(this.position);
		if (this.swipeAxis === 'y')
			return (y === 'bottom' ? amount.y < 0 : amount.y > 0) && Math.abs(amount.y) < TOAST_SWIPE_THRESHOLD;
		return (
			x !== 'center' &&
			(x === 'start' ? amount.x > 0 : amount.x < 0) &&
			Math.abs(amount.x) < TOAST_SWIPE_THRESHOLD
		);
	}

	private setSwipeTranslation(amount: { x: number; y: number }): void {
		this.style.setProperty('--swipe-amount-x', `${amount.x}px`);
		this.style.setProperty('--swipe-amount-y', `${amount.y}px`);
	}

	private resetSwipeTranslation(): void {
		this.setSwipeTranslation({ x: 0, y: 0 });
	}

	@bound
	private onPointerUp(event: PointerEvent): void {
		if (!this.pointerStart) return;
		this.releaseToastPointer(event.pointerId);
		const swipe = this.readSwipe();
		this.swiping = false;
		if (swipe && this.dismissible && this.shouldDismissSwipe(swipe)) this.dismissFromSwipe(swipe);
		else this.cancelSwipe();
		this.clearPointerState();
	}

	private releaseToastPointer(pointerId: number): void {
		try {
			this.releasePointerCapture(pointerId);
		} catch {}
	}

	private readSwipe(): { x: number; y: number } | undefined {
		if (!this.swiping) return undefined;
		return {
			x: Number.parseFloat(this.style.getPropertyValue('--swipe-amount-x') || '0'),
			y: Number.parseFloat(this.style.getPropertyValue('--swipe-amount-y') || '0'),
		};
	}

	private shouldDismissSwipe(swipe: { x: number; y: number }): boolean {
		const amount = this.swipeAxis === 'x' ? swipe.x : swipe.y;
		const duration = this.dragStartTime ? Date.now() - this.dragStartTime : 0;
		return Math.abs(amount) >= TOAST_SWIPE_THRESHOLD || Math.abs(amount) / Math.max(duration, 1) > 0.11;
	}

	private dismissFromSwipe(swipe: { x: number; y: number }): void {
		const { x, y } = splitToastPosition(this.position);
		this.swipeOutDirection =
			this.swipeAxis === 'y'
				? y === 'bottom'
					? 'down'
					: 'up'
				: x === 'start'
					? 'left'
					: x === 'end'
						? 'right'
						: swipe.x < 0
							? 'left'
							: 'right';
		this.swipeOut = true;
		this.syncDomState();
		this.beginRemove();
	}

	private cancelSwipe(): void {
		this.resetSwipeTranslation();
		this.swipeAxis = null;
		this.syncDomState();
	}

	private clearPointerState(): void {
		this.pointerStart = null;
		this.dragStartTime = null;
	}

	@onEvent({ selector: '[data-toast-close]', type: 'click' })
	onCloseClick(event: Event): void {
		event.stopPropagation();
		if (!this.dismissible) return;
		this.beginRemove();
	}

	@onEvent({ selector: '[data-toast-action]', type: 'click' })
	onActionClick(event: MouseEvent): void {
		event.stopPropagation();
		const record = toastState.getSnapshot().find((toast) => toast.id === this.resolvedId);
		record?.action?.onClick(event);
		if (this.dismissible) this.beginRemove();
	}

	private syncDomState(): void {
		const { y, x } = splitToastPosition(this.position);
		this.setAttribute('role', 'listitem');
		this.dataset.mounted = String(this.mounted);
		this.dataset.removed = String(this.removed);
		this.dataset.swiping = String(this.swiping);
		this.dataset.swipeOut = String(this.swipeOut);
		this.dataset.dismissible = String(this.dismissible);
		this.dataset.yPosition = y;
		this.dataset.xPosition = x;
		this.dataset.variant = this.variant ?? 'default';
		if (this.swipeOutDirection) this.dataset.swipeDirection = this.swipeOutDirection;
		else delete this.dataset.swipeDirection;
	}

	private iconForVariant(): string {
		switch (this.variant) {
			case 'success':
				return '✓';
			case 'error':
				return '✕';
			case 'warning':
				return '!';
			case 'info':
				return 'i';
			default:
				return '';
		}
	}

	override render() {
		const variant = this.variant ?? 'default';
		const icon = this.iconForVariant();
		const showIcon = variant !== 'default';

		return (
			<div ref="toast" class={`rui-toast rui-toast--${variant}`} role="status" aria-live="off" data-ref="toast">
				{this.closeButton && variant !== 'loading' ? (
					<button type="button" class="rui-toast__close" data-toast-close aria-label="Close toast">
						×
					</button>
				) : null}
				{showIcon ? (
					<span class="rui-toast__icon" data-icon aria-hidden="true">
						{variant === 'loading' ? <span class="rui-toast__loader" /> : icon}
					</span>
				) : null}
				<div class="rui-toast__content">
					<div class="rui-toast__title" data-title>
						{this.$.title}
					</div>
					{this.description ? (
						<div class="rui-toast__description" data-description>
							{this.$.description}
						</div>
					) : null}
				</div>
				{this.actionLabel ? (
					<button
						type="button"
						class="rui-toast__action rui-button rui-button--outline rui-button--sm"
						data-toast-action
					>
						{this.$.actionLabel}
					</button>
				) : null}
			</div>
		);
	}
}
