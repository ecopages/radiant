import { expect, test } from 'vitest';
import type { MediaRecorderSnapshot, MediaRecorderStatus } from '@ecopages/radiant-ui/controllers';
import { MAX_DURATION, viewOf } from '../src/content/components/recipes/voice-memo.data';

const snapshot = (status: MediaRecorderStatus, duration = 0): MediaRecorderSnapshot => ({
	status,
	duration,
	level: 0,
	mimeType: null,
	error: null,
});

test('every status has its own line and its own enabled controls', () => {
	const lines = new Map<string, string>();
	const controls = (status: MediaRecorderStatus) => {
		const view = viewOf(snapshot(status, 3));
		lines.set(status, view.status);
		return [view.record, view.pause, view.stop, view.discard, view.result];
	};

	expect(controls('idle')).toEqual([true, false, false, false, false]);
	expect(controls('requesting')).toEqual([false, false, false, false, false]);
	expect(controls('recording')).toEqual([false, true, true, true, false]);
	expect(controls('paused')).toEqual([false, true, true, true, false]);
	expect(controls('stopped')).toEqual([true, false, false, true, true]);
	expect(controls('denied')).toEqual([true, false, false, false, false]);
	expect(controls('unsupported')).toEqual([false, false, false, false, false]);
	expect(controls('error')).toEqual([true, false, false, false, false]);
	expect(new Set(lines.values()).size).toBe(8);
});

test('the status announces the limit and the denied state says how to try again', () => {
	expect(viewOf(snapshot('recording')).status).toContain('1:00');
	expect(viewOf(snapshot('stopped', MAX_DURATION)).status).toContain('limit');
	expect(viewOf(snapshot('stopped', 12)).status).toContain('Recorded 0:12');
	expect(viewOf(snapshot('denied')).status).toContain('try again');
});

test('the clock shows the recorded seconds and is fixed at the limit', () => {
	expect(viewOf(snapshot('recording', 65.2)).elapsed).toBe('1:05');
	expect(MAX_DURATION).toBe(60);
});
