import type { RuiPlacement } from './placement';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';

export type FloatingSize = { width: number; height: number };
export type FloatingCoords = { x: number; y: number };
export type FloatingViewport = { width: number; height: number; padding: number };

const OPPOSITE: Record<Side, Side> = {
	top: 'bottom',
	bottom: 'top',
	left: 'right',
	right: 'left',
};

const DEFAULT_VIEWPORT_PADDING = 8;

function parsePlacement(placement: RuiPlacement): { side: Side; align: Align } {
	const dash = placement.indexOf('-');
	if (dash === -1) return { side: placement as Side, align: 'center' };
	const side = placement.slice(0, dash) as Side;
	const align = placement.slice(dash + 1);
	return { side, align: align === 'start' || align === 'end' ? align : 'center' };
}

function primaryAxis(side: Side): 'x' | 'y' {
	return side === 'top' || side === 'bottom' ? 'y' : 'x';
}

function coordsFor(
	anchor: DOMRect,
	size: FloatingSize,
	side: Side,
	align: Align,
	gap: number,
): FloatingCoords {
	const { width, height } = size;
	let x = 0;
	let y = 0;

	switch (side) {
		case 'top':
			y = anchor.top - height - gap;
			break;
		case 'bottom':
			y = anchor.bottom + gap;
			break;
		case 'left':
			x = anchor.left - width - gap;
			break;
		case 'right':
			x = anchor.right + gap;
			break;
	}

	if (primaryAxis(side) === 'y') {
		if (align === 'start') x = anchor.left;
		else if (align === 'end') x = anchor.right - width;
		else x = anchor.left + (anchor.width - width) / 2;
	} else {
		if (align === 'start') y = anchor.top;
		else if (align === 'end') y = anchor.bottom - height;
		else y = anchor.top + (anchor.height - height) / 2;
	}

	return { x, y };
}

function overflowOnPrimary(
	coords: FloatingCoords,
	size: FloatingSize,
	side: Side,
	viewport: FloatingViewport,
): number {
	const { padding, width: vw, height: vh } = viewport;
	if (side === 'top') return Math.max(0, padding - coords.y);
	if (side === 'bottom') return Math.max(0, coords.y + size.height - (vh - padding));
	if (side === 'left') return Math.max(0, padding - coords.x);
	return Math.max(0, coords.x + size.width - (vw - padding));
}

function freeSpaceOnSide(anchor: DOMRect, size: FloatingSize, side: Side, viewport: FloatingViewport): number {
	const { padding, width: vw, height: vh } = viewport;
	if (side === 'top') return anchor.top - padding - size.height;
	if (side === 'bottom') return vh - padding - size.height - anchor.bottom;
	if (side === 'left') return anchor.left - padding - size.width;
	return vw - padding - size.width - anchor.right;
}

function clampCrossAxis(
	coords: FloatingCoords,
	size: FloatingSize,
	side: Side,
	viewport: FloatingViewport,
): FloatingCoords {
	const { padding, width: vw, height: vh } = viewport;
	if (primaryAxis(side) === 'y') {
		const maxX = Math.max(padding, vw - padding - size.width);
		return { x: Math.min(Math.max(coords.x, padding), maxX), y: coords.y };
	}
	const maxY = Math.max(padding, vh - padding - size.height);
	return { x: coords.x, y: Math.min(Math.max(coords.y, padding), maxY) };
}

/**
 * Computes fixed-position coords for a floating surface.
 *
 * @remarks
 * Prefers `placement`, then flips on the primary axis when the opposite side
 * has more free space. Clamps only the cross-axis so the floating surface
 * never slides onto its anchor.
 */
export function computeFloatingCoords(
	anchor: DOMRect,
	size: FloatingSize,
	placement: RuiPlacement,
	gap: number,
	viewport: FloatingViewport = {
		width: typeof window === 'undefined' ? 0 : window.innerWidth,
		height: typeof window === 'undefined' ? 0 : window.innerHeight,
		padding: DEFAULT_VIEWPORT_PADDING,
	},
): FloatingCoords {
	const { side: preferred, align } = parsePlacement(placement);
	const preferredCoords = coordsFor(anchor, size, preferred, align, gap);
	const preferredOverflow = overflowOnPrimary(preferredCoords, size, preferred, viewport);

	let side = preferred;
	let coords = preferredCoords;

	if (preferredOverflow > 0) {
		const flipped = OPPOSITE[preferred];
		const flippedCoords = coordsFor(anchor, size, flipped, align, gap);
		const preferredFree = freeSpaceOnSide(anchor, size, preferred, viewport);
		const flippedFree = freeSpaceOnSide(anchor, size, flipped, viewport);
		if (flippedFree > preferredFree) {
			side = flipped;
			coords = flippedCoords;
		}
	}

	return clampCrossAxis(coords, size, side, viewport);
}

/** Applies fixed coords to a floating element. */
export function applyFloatingPosition(
	anchor: HTMLElement,
	floating: HTMLElement,
	placement: RuiPlacement,
	gap: number,
): void {
	const coords = computeFloatingCoords(
		anchor.getBoundingClientRect(),
		{ width: floating.offsetWidth, height: floating.offsetHeight },
		placement,
		gap,
	);
	Object.assign(floating.style, {
		position: 'fixed',
		left: `${coords.x}px`,
		top: `${coords.y}px`,
		right: 'auto',
		bottom: 'auto',
		visibility: 'visible',
	});
}

export type AttachFloatingOptions = {
	anchor: HTMLElement;
	floating: HTMLElement;
	getPlacement: () => RuiPlacement;
	gap: number;
};

/**
 * Positions on attach and keeps the floating element updated on scroll/resize.
 *
 * @returns Cleanup that removes listeners and observers.
 */
export function attachFloating({ anchor, floating, getPlacement, gap }: AttachFloatingOptions): () => void {
	const update = (): void => {
		if (floating.hidden) return;
		applyFloatingPosition(anchor, floating, getPlacement(), gap);
	};

	update();

	window.addEventListener('resize', update);
	window.addEventListener('scroll', update, true);

	const observer = new ResizeObserver(update);
	observer.observe(anchor);
	observer.observe(floating);

	return () => {
		window.removeEventListener('resize', update);
		window.removeEventListener('scroll', update, true);
		observer.disconnect();
	};
}
