import { afterEach, describe, expect, it } from 'vitest';
import {
	notePreviewClosed,
	notePreviewOpened,
	resetPreviewTimingForTests,
	resolvePreviewOpenDelay,
} from './preview-timing';

describe('preview-timing', () => {
	afterEach(() => {
		resetPreviewTimingForTests();
	});

	it('uses the requested delay when no preview was shown recently', () => {
		expect(resolvePreviewOpenDelay(600, 1_000)).toBe(600);
	});

	it('opens immediately while another preview is open', () => {
		notePreviewOpened();
		expect(resolvePreviewOpenDelay(600, 1_000)).toBe(0);
	});

	it('opens immediately during the post-close cooldown window', () => {
		notePreviewOpened();
		notePreviewClosed(1_000, 300);
		expect(resolvePreviewOpenDelay(600, 1_200)).toBe(0);
	});

	it('restores warmup after the cooldown window elapses', () => {
		notePreviewOpened();
		notePreviewClosed(1_000, 300);
		expect(resolvePreviewOpenDelay(600, 1_301)).toBe(600);
	});
});
