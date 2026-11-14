import { bindController, type Controller, type ControllerHost } from './controller';

/**
 * The page lock shared by every `ScrollLockController`: how many hold it, and what to put back when the last
 * lets go.
 */
const pageLock: { holders: number; restore: (() => void) | null } = { holders: 0, restore: null };

function lockPage(): void {
	const root = document.documentElement;
	const body = document.body;
	const scrollbar = window.innerWidth - root.clientWidth;
	const { overflow } = root.style;
	const { paddingRight } = body.style;
	const padding = parseFloat(getComputedStyle(body).paddingRight);
	root.style.overflow = 'hidden';
	if (scrollbar > 0) {
		body.style.paddingRight = `${padding + scrollbar}px`;
	}
	pageLock.restore = () => {
		root.style.overflow = overflow;
		body.style.paddingRight = paddingRight;
	};
}

/**
 * Locks page scroll from `attach()` until `destroy()`, without shifting the layout.
 *
 * @remarks
 * Sets `overflow: hidden` on the root element and pads the body by the scrollbar width that disappears, so
 * content does not jump sideways. Every controller counts as one holder of one page-wide lock: nested modals
 * can each attach, and the page scrolls again only after the last of them destroys, in whatever order they
 * release. The previous inline `overflow` and `padding-right` are put back then. Attaching or destroying twice
 * changes nothing.
 *
 * Only the page scrolls less: a scroll container inside the modal keeps scrolling. Scroll chaining and touch
 * overscroll are the surface's to contain with `overscroll-behavior`.
 *
 * @example
 * ```ts
 * const lock = new ScrollLockController();
 * lock.attach(); // the page stops scrolling
 * lock.destroy(); // and scrolls again
 * ```
 */
export class ScrollLockController implements Controller {
	private holding = false;

	attach(): void {
		if (this.holding) {
			return;
		}
		this.holding = true;
		if (pageLock.holders === 0) {
			lockPage();
		}
		pageLock.holders += 1;
	}

	destroy(): void {
		if (!this.holding) {
			return;
		}
		this.holding = false;
		pageLock.holders -= 1;
		if (pageLock.holders === 0) {
			pageLock.restore?.();
			pageLock.restore = null;
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
 * ```
 */
export function createScrollLockController(host: ControllerHost): ScrollLockController {
	return bindController(host, new ScrollLockController());
}
