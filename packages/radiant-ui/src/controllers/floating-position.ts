import { DEFAULT_VIEWPORT_PADDING, computeFloatingPosition } from './floating-geometry';
import { EventListenerController } from './event-listener-controller';
import { ResizeController } from './resize-controller';
import type { RuiPlacement } from './placement';

const matchAnchorWidthStylesApplied = new WeakMap<HTMLElement, true>();

function clearMatchAnchorWidthStyles(floating: HTMLElement): void {
	if (!matchAnchorWidthStylesApplied.has(floating)) {
		return;
	}

	floating.style.width = '';
	floating.style.minWidth = '';
	floating.style.maxWidth = '';
	floating.style.boxSizing = '';
	matchAnchorWidthStylesApplied.delete(floating);
}

const CONTAINING_BLOCK_WILL_CHANGE = /transform|perspective|filter|contain/;
const CONTAINING_BLOCK_CONTAIN = /layout|paint|strict|content/;

/** Where `position: fixed` coordinates start inside an ancestor that acts as their containing block, and at what scale. */
type FixedOrigin = { left: number; top: number; scale: number };

const VIEWPORT_ORIGIN: FixedOrigin = { left: 0, top: 0, scale: 1 };

function createsFixedContainingBlock(style: CSSStyleDeclaration): boolean {
	return (
		style.transform !== 'none' ||
		style.translate !== 'none' ||
		style.rotate !== 'none' ||
		style.scale !== 'none' ||
		style.perspective !== 'none' ||
		style.filter !== 'none' ||
		style.backdropFilter !== 'none' ||
		CONTAINING_BLOCK_CONTAIN.test(style.contain) ||
		CONTAINING_BLOCK_WILL_CHANGE.test(style.willChange)
	);
}

/**
 * Where the `left` and `top` of a `position: fixed` floating element start, and the scale they are drawn at.
 *
 * @remarks
 * A fixed element is placed against the viewport unless an ancestor has a `transform`, `filter`, `perspective`,
 * `contain` or `will-change` of those, which becomes its containing block. A popup portaled into a modal surface
 * that is centred with `transform`, or into `rui-dialog`'s surface while its enter transition still scales it, then
 * lands offset by the surface's own position. The nearest such ancestor's padding box and scale are measured so
 * viewport coordinates can be converted. `body` is taken as the viewport.
 */
function fixedOrigin(floating: HTMLElement): FixedOrigin {
	for (let node = floating.parentElement; node && node !== document.body; node = node.parentElement) {
		if (createsFixedContainingBlock(getComputedStyle(node))) {
			const rect = node.getBoundingClientRect();
			const scale = node.offsetWidth === 0 ? 1 : rect.width / node.offsetWidth;
			return { left: rect.left + node.clientLeft * scale, top: rect.top + node.clientTop * scale, scale };
		}
	}
	return VIEWPORT_ORIGIN;
}

/**
 * Applies fixed coords to a floating element.
 *
 * @remarks Coordinates are corrected for an ancestor that acts as the containing block of fixed elements; see `fixedOrigin`.
 *
 * Measuring below Measuring below forces the style update that captures the enter transition's starting values, so a
 * surface that has never been positioned gets the requested `data-placement` first. The origin and shift the
 * enter transition starts from then face the anchor; the resolved placement overwrites it after a flip.
 */
export function applyFloatingPosition(
	anchor: HTMLElement,
	floating: HTMLElement,
	placement: RuiPlacement,
	gap: number,
	options: { matchAnchorWidth?: boolean } = {},
): RuiPlacement {
	const matchAnchorWidth = options.matchAnchorWidth === true;
	if (!floating.hasAttribute('data-placement')) {
		floating.setAttribute('data-placement', placement);
	}
	const origin = fixedOrigin(floating);
	const anchorWidth = anchor.offsetWidth;
	const size = {
		width: (matchAnchorWidth ? anchorWidth : floating.offsetWidth) * origin.scale,
		height: floating.offsetHeight * origin.scale,
	};

	if (matchAnchorWidth) {
		floating.style.width = `${anchorWidth}px`;
		floating.style.minWidth = `${anchorWidth}px`;
		floating.style.maxWidth = `${anchorWidth}px`;
		floating.style.boxSizing = 'border-box';
		matchAnchorWidthStylesApplied.set(floating, true);
	} else {
		clearMatchAnchorWidthStyles(floating);
	}

	const { coords, placement: resolved } = computeFloatingPosition(
		anchor.getBoundingClientRect(),
		size,
		placement,
		gap,
		{ width: window.innerWidth, height: window.innerHeight, padding: DEFAULT_VIEWPORT_PADDING },
	);
	Object.assign(floating.style, {
		position: 'fixed',
		left: `${(coords.x - origin.left) / origin.scale}px`,
		top: `${(coords.y - origin.top) / origin.scale}px`,
		right: 'auto',
		bottom: 'auto',
		visibility: 'visible',
	});
	floating.setAttribute('data-placement', resolved);
	return resolved;
}

/** What `attachFloating` needs: the anchor and floating elements, the placement and the gap. */
export type AttachFloatingOptions = {
	anchor: HTMLElement;
	floating: HTMLElement;
	getPlacement: () => RuiPlacement;
	gap: number;
	matchAnchorWidth?: boolean;
};

/**
 * Positions on attach and keeps the floating element updated on scroll/resize.
 *
 * @returns Cleanup that removes listeners and observers.
 */
export function attachFloating({
	anchor,
	floating,
	getPlacement,
	gap,
	matchAnchorWidth,
}: AttachFloatingOptions): () => void {
	const update = (): void => {
		if (floating.hidden) return;
		applyFloatingPosition(anchor, floating, getPlacement(), gap, { matchAnchorWidth });
	};

	update();

	const controllers = [
		new EventListenerController({ getTarget: () => window, type: 'resize', listener: update }),
		new EventListenerController({
			getTarget: () => window,
			type: 'scroll',
			listener: update,
			options: { capture: true },
		}),
		new ResizeController({ getTargets: () => [anchor, floating], onResize: update }),
		new EventListenerController({
			getTarget: () => window,
			type: ['transitionend', 'transitioncancel'],
			listener: (event) => {
				if (event.target instanceof Node && event.target.contains(floating)) update();
			},
			options: { capture: true },
		}),
	];
	for (const controller of controllers) {
		controller.attach();
	}

	return () => {
		for (const controller of controllers) {
			controller.destroy();
		}
	};
}
