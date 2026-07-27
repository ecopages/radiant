import { RadiantElement, bound, customElement, onEvent, onUpdated, prop, state } from '@ecopages/radiant';
import {
	DEFAULT_TOAST_POSITION,
	RUI_TOAST_DISMISS_EVENT,
	RUI_TOAST_SHOW_EVENT,
	TOAST_GAP,
	TOAST_LIFETIME,
	TOAST_VIEWPORT_OFFSET,
	TOAST_VISIBLE_AMOUNT,
	TOAST_WIDTH,
	type ToastDismissDetail,
	type ToastPosition,
	type ToastRecord,
	type ToastShowDetail,
	splitToastPosition,
} from './toast-context';
import { toastState } from './toast-state';
import type { RuiToast } from './toast.script';
import './toast.script';

export type RuiToasterProps = {
	/** Corner / edge placement. Default: `bottom-end`. */
	position?: ToastPosition;
	/** Default lifetime in ms. Default: `4000`. */
	duration?: number;
	/**
	 * Max toasts shown in the stack at once (older ones wait in queue).
	 * Default: `3`.
	 */
	visibleToasts?: number;
	/** Show a close button on every toast. */
	closeButton?: boolean;
	/**
	 * Always show the stack expanded with full gaps.
	 * Default `false`: toasts collapse behind the front one (Sonner-style peek)
	 * and expand on hover.
	 */
	expand?: boolean;
	/** Gap between toasts when expanded, in px. Default: `14`. */
	gap?: number;
	/** Viewport inset in px. Default: `24`. */
	offset?: number;
};

type RuiToasterBindings = {
	position: ToastPosition;
	toasts: ToastRecord[];
};

function isInsideToaster(node: EventTarget | null, root: Element): boolean {
	return node instanceof Node && root.contains(node);
}

/**
 * `<rui-toaster>` — fixed viewport that renders the toast stack.
 *
 * @element rui-toaster
 */
@customElement('rui-toaster')
export class RuiToaster extends RadiantElement<RuiToasterBindings> {
	@prop({ type: String, reflect: true, defaultValue: DEFAULT_TOAST_POSITION }) position: ToastPosition;
	@prop({ type: Number, defaultValue: TOAST_LIFETIME }) duration: number;
	@prop({ type: Number, defaultValue: TOAST_VISIBLE_AMOUNT }) visibleToasts: number;
	@prop({ type: Boolean, defaultValue: false }) closeButton: boolean;
	@prop({ type: Boolean, defaultValue: false }) expand: boolean;
	@prop({ type: Number, defaultValue: TOAST_GAP }) gap: number;
	@prop({ type: Number, defaultValue: TOAST_VIEWPORT_OFFSET }) offset: number;

	@state toasts: ToastRecord[] = [];

	private expanded = false;
	private interacting = false;
	private unsubscribe: (() => void) | null = null;
	private visibilityHandler: (() => void) | null = null;
	private readonly heights = new Map<string, number>();
	private readonly observers = new Map<string, ResizeObserver>();
	private layoutFrame: number | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncHostPosition();
		this.unsubscribe = toastState.subscribe((toasts) => {
			this.toasts = toasts;
			if (toasts.length === 0) {
				this.resetLayoutState();
			}
			this.scheduleLayoutSync();
		});
		this.visibilityHandler = () => this.syncPauseState();
		document.addEventListener('visibilitychange', this.visibilityHandler);
	}

	override disconnectedCallback(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		if (this.visibilityHandler) {
			document.removeEventListener('visibilitychange', this.visibilityHandler);
			this.visibilityHandler = null;
		}
		document.removeEventListener('pointerup', this.onPointerUp);
		document.removeEventListener('pointercancel', this.onPointerUp);
		if (this.layoutFrame != null) cancelAnimationFrame(this.layoutFrame);
		this.resetLayoutState();
		super.disconnectedCallback();
	}

	@onUpdated(['position', 'duration', 'visibleToasts', 'closeButton', 'expand', 'gap', 'offset'])
	onConfigUpdated(): void {
		this.syncHostPosition();
		this.scheduleLayoutSync();
	}

	@onEvent({ document: true, type: RUI_TOAST_SHOW_EVENT })
	onDocumentShow(event: Event): void {
		const detail = (event as CustomEvent<ToastShowDetail>).detail;
		if (!detail?.title) return;
		toastState.create(detail.title, {
			id: detail.id,
			description: detail.description,
			variant: detail.variant,
			duration: detail.duration,
			action: detail.action,
			dismissible: detail.dismissible,
			closeButton: detail.closeButton,
			position: detail.position,
		});
	}

	@onEvent({ document: true, type: RUI_TOAST_DISMISS_EVENT })
	onDocumentDismiss(event: Event): void {
		const detail = (event as CustomEvent<ToastDismissDetail>).detail;
		toastState.dismiss(detail?.id);
	}

	@onEvent({ selector: 'rui-toast', type: 'rui-toast-mounted' })
	onToastMounted(): void {
		this.observeToasts();
		this.syncPauseState();
	}

	private filteredToasts(): ToastRecord[] {
		const forPosition = this.toasts.filter((toast) => (toast.position ?? this.position) === this.position);
		const active: ToastRecord[] = [];
		const exiting: ToastRecord[] = [];

		for (const toast of forPosition) {
			if (toast.delete) exiting.push(toast);
			else active.push(toast);
		}

		return [...active.slice(0, this.visibleToasts), ...exiting];
	}

	private syncHostPosition(): void {
		const { y, x } = splitToastPosition(this.position);
		this.dataset.yPosition = y;
		this.dataset.xPosition = x;
		this.style.setProperty('--width', `${TOAST_WIDTH}px`);
		this.style.setProperty('--gap', `${this.gap}px`);
		this.style.setProperty('--viewport-offset', `${this.offset}px`);
	}

	private isStackExpanded(): boolean {
		return this.expanded || this.expand;
	}

	private isPaused(): boolean {
		return this.isStackExpanded() || this.interacting || document.hidden;
	}

	private resetLayoutState(): void {
		for (const observer of this.observers.values()) observer.disconnect();
		this.observers.clear();
		this.heights.clear();
		this.expanded = false;
		this.interacting = false;
		const list = this.querySelector<HTMLOListElement>('.rui-toaster');
		if (list) {
			list.style.height = '0px';
			list.dataset.expanded = 'false';
		}
		this.dataset.expanded = 'false';
	}

	private syncPauseState(): void {
		const paused = this.isPaused();
		for (const el of this.querySelectorAll('rui-toast')) {
			(el as RuiToast).setPaused(paused);
		}
		this.patchStackLayout();
	}

	/**
	 * Measure + layout on the next frame. Re-reads `:hover` because emptying the
	 * stack under the cursor can skip `pointerout`, leaving hold/expand stale.
	 */
	private scheduleLayoutSync(): void {
		if (this.layoutFrame != null) cancelAnimationFrame(this.layoutFrame);
		this.layoutFrame = requestAnimationFrame(() => {
			this.layoutFrame = null;
			if (this.toasts.length > 0 && !this.interacting) {
				const list = this.querySelector('.rui-toaster');
				const hovered = Boolean(list?.matches(':hover') || this.matches(':hover'));
				this.expanded = hovered;
			}
			this.observeToasts();
			this.syncPauseState();
		});
	}

	private measureToast(el: RuiToast): number {
		const prevHeight = el.style.height;
		const prevOverflow = el.style.overflow;
		el.style.height = 'auto';
		el.style.overflow = 'visible';
		const inner = el.querySelector('.rui-toast');
		const height = Math.round(inner instanceof HTMLElement ? inner.offsetHeight : el.offsetHeight) || 64;
		el.style.height = prevHeight;
		el.style.overflow = prevOverflow;
		return height;
	}

	private observeToasts(): void {
		const list = this.querySelector('.rui-toaster');
		if (!list) return;

		const els = [...list.querySelectorAll('rui-toast')] as RuiToast[];
		const seen = new Set<string>();

		for (const el of els) {
			const id = el.toastId;
			if (!id) continue;
			seen.add(id);

			const target = el.querySelector('.rui-toast') ?? el;

			if (!this.observers.has(id)) {
				const observer = new ResizeObserver(() => {
					const height = this.measureToast(el);
					if (this.heights.get(id) === height) return;
					this.heights.set(id, height);
					this.patchStackLayout();
				});
				observer.observe(target);
				this.observers.set(id, observer);
			}

			this.heights.set(id, this.measureToast(el));
		}

		for (const [id, observer] of [...this.observers]) {
			if (seen.has(id)) continue;
			observer.disconnect();
			this.observers.delete(id);
			this.heights.delete(id);
		}
	}

	private patchStackLayout(): void {
		const list = this.querySelector<HTMLOListElement>('.rui-toaster');
		if (!list) return;

		const expanded = this.isStackExpanded();
		const { y } = splitToastPosition(this.position);
		const lift = y === 'bottom' ? -1 : 1;

		this.dataset.expanded = String(expanded);
		list.dataset.expanded = String(expanded);

		const els = ([...list.querySelectorAll('rui-toast')] as RuiToast[]).filter(
			(el) => el.dataset.mounted === 'true' && el.dataset.removed !== 'true',
		);

		if (els.length === 0) {
			list.style.height = '0px';
			return;
		}

		const heights = els.map((el) => {
			const measured = this.heights.get(el.toastId) ?? this.measureToast(el);
			this.heights.set(el.toastId, measured);
			return measured;
		});
		const frontHeight = heights[0] ?? 64;

		let accumulated = 0;
		for (let index = 0; index < els.length; index += 1) {
			const el = els[index];
			if (!el) continue;
			const height = heights[index] ?? 64;
			const isFront = index === 0;

			el.dataset.index = String(index);
			el.dataset.front = String(isFront);
			el.dataset.expanded = String(expanded);
			el.style.setProperty('--z-index', String(els.length - index));

			if (expanded) {
				el.style.setProperty('--y', `translateY(${lift * accumulated}px)`);
				el.style.height = `${height}px`;
				el.style.overflow = 'visible';
				accumulated += height + this.gap;
			} else if (isFront) {
				el.style.setProperty('--y', 'translateY(0px)');
				el.style.height = `${height}px`;
				el.style.overflow = 'visible';
			} else {
				// Keep scaling for every depth — clamping (e.g. at 0.92) makes toasts
				// past the default visibleToasts=3 look identical and stack poorly.
				const scale = Math.max(0.7, 1 - index * 0.05);
				el.style.setProperty('--y', `translateY(${lift * index * this.gap}px) scale(${scale})`);
				el.style.height = `${frontHeight}px`;
				el.style.overflow = 'hidden';
			}
		}

		const stackHeight = expanded
			? Math.max(0, accumulated > 0 ? accumulated - this.gap : frontHeight)
			: frontHeight + Math.max(0, els.length - 1) * this.gap;

		list.style.height = `${stackHeight}px`;
	}

	@bound
	private onPointerOver(event: PointerEvent): void {
		if (isInsideToaster(event.relatedTarget, this)) return;
		this.expanded = true;
		this.syncPauseState();
	}

	@bound
	private onPointerOut(event: PointerEvent): void {
		if (isInsideToaster(event.relatedTarget, this)) return;
		if (this.interacting) return;
		this.expanded = false;
		this.syncPauseState();
	}

	@bound
	private onPointerDown(): void {
		this.interacting = true;
		this.expanded = true;
		this.syncPauseState();
		document.addEventListener('pointerup', this.onPointerUp, { once: true });
		document.addEventListener('pointercancel', this.onPointerUp, { once: true });
	}

	/** End interaction; collapse only when the pointer is no longer over the toaster. */
	@bound
	private onPointerUp(): void {
		if (!this.interacting) return;
		this.interacting = false;
		const hovered = this.matches(':hover') || this.querySelector('rui-toast:hover');
		if (!hovered) this.expanded = false;
		this.syncPauseState();
	}

	override render() {
		const filtered = this.filteredToasts();

		return (
			<section
				class="rui-toaster-region"
				aria-label="Notifications"
				aria-live="polite"
				aria-relevant="additions text"
				aria-atomic="false"
				tabIndex={-1}
			>
				<ol
					class="rui-toaster"
					data-rui-toaster
					on:pointerover={this.onPointerOver}
					on:pointerout={this.onPointerOut}
					on:pointerdown={this.onPointerDown}
				>
					{filtered.map((toast) => {
						const duration =
							toast.duration ?? (toast.variant === 'loading' ? Number.POSITIVE_INFINITY : this.duration);

						return (
							<rui-toast
								key={String(toast.id)}
								prop:toastId={String(toast.id)}
								prop:title={toast.title}
								prop:description={toast.description ?? ''}
								prop:variant={toast.variant}
								prop:duration={duration}
								prop:dismissible={toast.dismissible}
								prop:closeButton={toast.closeButton ?? this.closeButton}
								prop:actionLabel={toast.action?.label ?? ''}
								prop:position={toast.position ?? this.position}
								prop:markedDelete={Boolean(toast.delete)}
							/>
						);
					})}
				</ol>
			</section>
		);
	}
}
