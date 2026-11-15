import { describe, expect, it } from 'vitest';
import { MediaController, createMediaController } from './media-controller';

describe('MediaController on the server', () => {
	it('imports, constructs and answers getState with no DOM and no window', () => {
		expect(typeof document).toBe('undefined');
		const getMedia = () => {
			throw new Error('getMedia must not run before attach');
		};
		const controller = new MediaController({ getMedia });
		const state = controller.getState();

		expect(state.status).toBe('idle');
		expect(state.position).toBe(0);
		expect(state.error).toBeNull();
		expect(() => controller.destroy()).not.toThrow();
		expect(() => controller.setVolume(0.5)).not.toThrow();
	});

	it('registers with a host without touching the media', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		createMediaController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{
				getMedia: () => {
					throw new Error('getMedia must not run before attach');
				},
			},
		);

		expect(connected).toHaveLength(1);
		expect(cleanup).toHaveLength(1);
		expect(() => cleanup[0]!()).not.toThrow();
	});
});
