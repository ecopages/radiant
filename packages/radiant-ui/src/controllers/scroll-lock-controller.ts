import { bindController, type Controller, type ControllerHost } from './controller';

/** What `ScrollLockController` locks. */
export type ScrollLockControllerConfig = {
	/**
	 * The element that scrolls, read on `attach()`. Defaults to the root element, which is the page. An app shell
	 * whose page is a fixed-height frame with one inner scroll container passes that container.
	 */
	getTarget?: () => HTMLElement;
};

/** The elements currently locked: how many controllers hold each, and what to put back when the last lets go. */
const locked = new Map<HTMLElement, { holders: number; restore: () => void }>();

function lock(target: HTMLElement): void {
	const isPage = target === document.documentElement;
	const padded = isPage ? document.body : target;
	const style = getComputedStyle(target);
	const scrollbar = isPage
		? window.innerWidth - target.clientWidth
		: target.offsetWidth -
			target.clientWidth -
			parseFloat(style.borderLeftWidth) -
			parseFloat(style.borderRightWidth);
	const { overflow } = target.style;
	const { paddingRight } = padded.style;
	const padding = parseFloat(getComputedStyle(padded).paddingRight);
	target.style.overflow = 'hidden';
	if (scrollbar > 0) {
		padded.style.paddingRight = `${padding + scrollbar}px`;
	}
	locked.set(target, {
		holders: 0,
		restore: () => {
			target.style.overflow = overflow;
			padded.style.paddingRight = paddingRight;
		},
	});
}

/**
 * Locks scroll from `attach()` until `destroy()`, without shifting the layout.
 *
 * @remarks
 * Sets `overflow: hidden` on the target, the root element by default, and pads by the scrollbar width that
 * disappears, so content does not jump sideways. The page pads the body; a scroll container pads itself. Each
 * controller counts as one holder of its target: nested modals can each attach, and the target scrolls again
 * only after the last of them destroys, in whatever order they release. The previous inline `overflow` and
 * `padding-right` are put back then. Locks on different targets are independent. Attaching or destroying twice
 * changes nothing.
 *
 * The default locks the document, which only helps when the document is what scrolls. A page built as an app
 * shell, with a fixed-height frame and an inner scroll container, scrolls in that container instead, so pass it
 * as the target. A scroll container inside the modal keeps scrolling. Scroll chaining and touch overscroll are
 * the surface's to contain with `overscroll-behavior`.
 *
 * @example
 * ```ts
 * const lock = new ScrollLockController();
 * lock.attach(); // the page stops scrolling
 * lock.destroy(); // and scrolls again
 *
 * const panel = new ScrollLockController({ getTarget: () => scroller });
 * panel.attach(); // only `scroller` stops scrolling
 * ```
 */
export class ScrollLockController implements Controller {
	private readonly config: ScrollLockControllerConfig;
	private target: HTMLElement | null = null;

	constructor(config: ScrollLockControllerConfig = {}) {
		this.config = config;
	}

	attach(): void {
		if (this.target) {
			return;
		}
		const target = this.config.getTarget?.() ?? document.documentElement;
		if (!locked.has(target)) {
			lock(target);
		}
		locked.get(target)!.holders += 1;
		this.target = target;
	}

	destroy(): void {
		const target = this.target;
		if (!target) {
			return;
		}
		this.target = null;
		const entry = locked.get(target)!;
		entry.holders -= 1;
		if (entry.holders === 0) {
			entry.restore();
			locked.delete(target);
		}
	}
}

/**
 * Creates a `ScrollLockController` that locks when `host` connects and releases when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createScrollLockController(this); // the page does not scroll while the element is connected
 * createScrollLockController(this, { getTarget: () => this.scroller }); // or only that container
 * ```
 */
export function createScrollLockController(
	host: ControllerHost,
	config?: ScrollLockControllerConfig,
): ScrollLockController {
	return bindController(host, new ScrollLockController(config));
}
