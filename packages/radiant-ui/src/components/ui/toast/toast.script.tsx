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

function deadlineKey(id: ToastId): string {
	return String(id);
}

function clearToastDeadline(id: ToastId): void {
	if (id === '') return;
	toastDeadlines.delete(deadlineKey(id));
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
 * @element rui-toast
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
	 * Starts the lifetime timer after paint as well — toaster pause sync can run
	 * before `timerReady`, which would otherwise leave the toast without a timer.
	 * On reconnect, re-announce and resume the deadline without replaying enter CSS.
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
		this.mounted = false;
		this.removeEventListener('pointerdown', this.onPointerDown);
		this.removeEventListener('pointermove', this.onPointerMove);
		this.removeEventListener('pointerup', this.onPointerUp);
		this.removeEventListener('pointercancel', this.onPointerUp);
		super.disconnectedCallback();
	}

	@onUpdated(['title', 'description', 'variant', 'actionLabel', 'closeButton'])
	onContentUpdated(): void {
		this.requestUpdate();
	}

	@onUpdated('position')
	onPositionUpdated(): void {
		this.syncDomState();
	}

	/**
	 * Hold or release auto-dismiss (toaster-controlled on stack hover).
	 * Pause clears the timeout but keeps the deadline so resume uses leftover time.
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
		let deadline = toastDeadlines.get(key);
		if (deadline == null) {
			deadline = now + this.duration;
			toastDeadlines.set(key, deadline);
		}

		const remaining = deadline - now;
		if (remaining <= 0) {
			clearToastDeadline(id);
			this.beginRemove();
			return;
		}

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
		const { y, x } = splitToastPosition(this.position);
		const deltaX = event.clientX - this.pointerStart.x;
		const deltaY = event.clientY - this.pointerStart.y;

		if (!this.swiping) {
			if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
			this.swiping = true;
			this.syncDomState();
		}

		if (!this.swipeAxis) {
			this.swipeAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
		}

		const swipeAmountX = this.swipeAxis === 'x' ? deltaX : 0;
		const swipeAmountY = this.swipeAxis === 'y' ? deltaY : 0;

		if (this.swipeAxis === 'y') {
			const towardExit = y === 'bottom' ? swipeAmountY > 0 : swipeAmountY < 0;
			if (!towardExit && Math.abs(swipeAmountY) < TOAST_SWIPE_THRESHOLD) {
				this.style.setProperty('--swipe-amount-x', '0px');
				this.style.setProperty('--swipe-amount-y', '0px');
				return;
			}
		}

		if (this.swipeAxis === 'x') {
			const towardExit = x === 'start' ? swipeAmountX < 0 : swipeAmountX > 0;
			if (x !== 'center' && !towardExit && Math.abs(swipeAmountX) < TOAST_SWIPE_THRESHOLD) {
				this.style.setProperty('--swipe-amount-x', '0px');
				this.style.setProperty('--swipe-amount-y', '0px');
				return;
			}
		}

		this.style.setProperty('--swipe-amount-x', `${swipeAmountX}px`);
		this.style.setProperty('--swipe-amount-y', `${swipeAmountY}px`);
	}

	@bound
	private onPointerUp(event: PointerEvent): void {
		if (!this.pointerStart) return;
		try {
			this.releasePointerCapture(event.pointerId);
		} catch {}

		const wasSwiping = this.swiping;
		this.swiping = false;

		if (!wasSwiping) {
			this.pointerStart = null;
			this.dragStartTime = null;
			this.swipeAxis = null;
			return;
		}

		const swipeAmountX = Number.parseFloat(this.style.getPropertyValue('--swipe-amount-x') || '0');
		const swipeAmountY = Number.parseFloat(this.style.getPropertyValue('--swipe-amount-y') || '0');
		const swipeAmount = this.swipeAxis === 'x' ? swipeAmountX : swipeAmountY;
		const swipeTime = this.dragStartTime ? Date.now() - this.dragStartTime : 0;
		const velocity = Math.abs(swipeAmount) / Math.max(swipeTime, 1);
		const shouldDismiss = Math.abs(swipeAmount) >= TOAST_SWIPE_THRESHOLD || velocity > 0.11;

		if (shouldDismiss && this.dismissible) {
			const { y, x } = splitToastPosition(this.position);
			if (this.swipeAxis === 'x') {
				this.swipeOutDirection = swipeAmountX < 0 ? 'left' : 'right';
				if (x === 'start') this.swipeOutDirection = 'left';
				if (x === 'end') this.swipeOutDirection = 'right';
			} else {
				this.swipeOutDirection = y === 'bottom' ? 'down' : 'up';
			}
			this.swipeOut = true;
			this.syncDomState();
			this.beginRemove();
		} else {
			this.style.setProperty('--swipe-amount-x', '0px');
			this.style.setProperty('--swipe-amount-y', '0px');
			this.swipeAxis = null;
			this.syncDomState();
		}

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
