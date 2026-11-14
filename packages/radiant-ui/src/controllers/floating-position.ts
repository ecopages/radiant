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

/**
 * Applies fixed coords to a floating element.
 *
 * @remarks Measuring below forces the style update that captures the enter transition's starting values, so a
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
	const anchorWidth = anchor.offsetWidth;
	const size = matchAnchorWidth
		? { width: anchorWidth, height: floating.offsetHeight }
		: { width: floating.offsetWidth, height: floating.offsetHeight };

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
		left: `${coords.x}px`,
		top: `${coords.y}px`,
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
