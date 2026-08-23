const DEFAULT_COOLDOWN_MS = 300;

let openCount = 0;
let fastPathUntil = 0;

/** @remarks Test-only reset for preview timing state. */
export function resetPreviewTimingForTests(): void {
	openCount = 0;
	fastPathUntil = 0;
}

export function notePreviewOpened(): void {
	openCount += 1;
}

export function notePreviewClosed(now = Date.now(), cooldownMs = DEFAULT_COOLDOWN_MS): void {
	openCount = Math.max(0, openCount - 1);
	if (openCount === 0) {
		fastPathUntil = now + cooldownMs;
	}
}

/**
 * Resolves the effective open delay for a preview trigger.
 *
 * @remarks Once any preview is open, or while still inside the post-close cooldown
 * window, subsequent previews open immediately.
 */
export function resolvePreviewOpenDelay(requestedDelay: number, now = Date.now()): number {
	if (openCount > 0) {
		return 0;
	}
	if (now < fastPathUntil) {
		return 0;
	}
	return requestedDelay;
}
