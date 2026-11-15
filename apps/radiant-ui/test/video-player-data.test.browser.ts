import { afterEach, describe, expect, test } from 'vitest';
import {
	Announcer,
	bufferedSegments,
	seekFromKey,
	seekValueText,
	shortcutFor,
	stageState,
	statusMessage,
} from '../src/content/components/recipes/video-player.data';
import { fetchSource, releaseSource } from '../src/content/components/recipes/video-player.loader';

type Snapshot = Parameters<typeof statusMessage>[0];

const snapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
	status: 'paused',
	waiting: false,
	error: null,
	blocked: false,
	...overrides,
});

afterEach(() => {
	document.body.innerHTML = '';
});

describe('video player data: the stage state and the live region', () => {
	test('an error wins over every other state, then buffering, then idle, playing and paused', () => {
		expect(stageState(snapshot({ error: new Error('x'), waiting: true, status: 'playing' }))).toBe('error');
		expect(stageState(snapshot({ waiting: true, status: 'playing' }))).toBe('buffering');
		expect(stageState(snapshot({ status: 'loading' }))).toBe('buffering');
		expect(stageState(snapshot({ status: 'idle' }))).toBe('idle');
		expect(stageState(snapshot({ status: 'playing' }))).toBe('playing');
		expect(stageState(snapshot({ status: 'paused' }))).toBe('paused');
		expect(stageState(snapshot({ status: 'ended' }))).toBe('paused');
	});

	test('the message follows the state, says Ended for an ended clip and puts a blocked play first', () => {
		expect(statusMessage(snapshot({ status: 'playing' }))).toBe('Playing');
		expect(statusMessage(snapshot({ status: 'paused' }))).toBe('Paused');
		expect(statusMessage(snapshot({ status: 'ended' }))).toBe('Ended');
		expect(statusMessage(snapshot({ status: 'loading' }))).toBe('Buffering');
		expect(statusMessage(snapshot({ status: 'playing', waiting: true }))).toBe('Buffering');
		expect(statusMessage(snapshot({ status: 'idle' }))).toBe('');
		expect(statusMessage(snapshot({ error: new Error('x') }))).toBe('Could not load the video');
		expect(statusMessage(snapshot({ blocked: true }))).toBe('Playback was blocked, press Play to start');
	});

	test('the announcer is silent until the clip has played, and says each message once', () => {
		const announcer = new Announcer();

		expect(announcer.next(snapshot({ status: 'loading' }))).toBe('');
		expect(announcer.next(snapshot({ status: 'paused' }))).toBe('');
		expect(announcer.next(snapshot({ status: 'playing' }))).toBe('Playing');
		expect(announcer.next(snapshot({ status: 'playing' }))).toBe('');
		expect(announcer.next(snapshot({ status: 'playing', waiting: true }))).toBe('Buffering');
		expect(announcer.next(snapshot({ status: 'paused' }))).toBe('Paused');
		expect(announcer.next(snapshot({ status: 'ended' }))).toBe('Ended');
	});

	test('a failure is announced before the clip has played, and a reset makes the player silent again', () => {
		const announcer = new Announcer();

		expect(announcer.next(snapshot({ error: new Error('x') }))).toBe('Could not load the video');
		expect(announcer.next(snapshot({ blocked: true }))).toBe('Playback was blocked, press Play to start');
		announcer.next(snapshot({ status: 'playing' }));
		announcer.reset();
		expect(announcer.next(snapshot({ status: 'loading' }))).toBe('');
		expect(announcer.next(snapshot({ status: 'paused' }))).toBe('');
		expect(announcer.next(snapshot({ status: 'playing' }))).toBe('Playing');
	});
});

describe('video player data: keys and values', () => {
	test('shortcutFor maps the player keys, ignoring case, and leaves a key with Ctrl, Alt or Meta alone', () => {
		const stage = document.body.appendChild(document.createElement('div'));
		const press = (name: string, modifiers: Partial<KeyboardEventInit> = {}) =>
			shortcutFor({ key: name, ctrlKey: false, altKey: false, metaKey: false, ...modifiers, target: stage });

		expect(press(' ')).toEqual({ type: 'toggle' });
		expect(press('K')).toEqual({ type: 'toggle' });
		expect(press('j')).toEqual({ type: 'skip', seconds: -10 });
		expect(press('ArrowRight')).toEqual({ type: 'skip', seconds: 5 });
		expect(press('ArrowUp')).toEqual({ type: 'volume', delta: 0.1 });
		expect(press('7')).toEqual({ type: 'jump', fraction: 0.7 });
		expect(press('Home')).toEqual({ type: 'start' });
		expect(press('End')).toEqual({ type: 'end' });
		expect(press('x')).toBeUndefined();
		for (const modifier of ['ctrlKey', 'altKey', 'metaKey'] as const)
			expect(press('k', { [modifier]: true })).toBeUndefined();
	});

	test('a button keeps Space and Enter, and a slider thumb keeps the arrows, Home, End and the page keys', () => {
		document.body.innerHTML = '<button type="button"><svg></svg></button><button role="slider"></button>';
		const [button, thumb] = [...document.querySelectorAll('button')];
		const press = (name: string, target: Element) =>
			shortcutFor({ key: name, ctrlKey: false, altKey: false, metaKey: false, target });

		expect(press(' ', button)).toBeUndefined();
		expect(press('Enter', button.querySelector('svg')!)).toBeUndefined();
		expect(press('k', button)).toEqual({ type: 'toggle' });
		expect(press(' ', thumb)).toBeUndefined();
		for (const name of ['ArrowLeft', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
			expect(press(name, thumb)).toBeUndefined();
		}
		expect(press('m', thumb)).toEqual({ type: 'mute' });
		expect(press('5', thumb)).toEqual({ type: 'jump', fraction: 0.5 });
	});

	test('seekFromKey gives the seconds of the arrows and the page keys, and nothing for Home and End', () => {
		expect(seekFromKey('ArrowRight')).toBe(5);
		expect(seekFromKey('ArrowUp')).toBe(5);
		expect(seekFromKey('ArrowLeft')).toBe(-5);
		expect(seekFromKey('ArrowDown')).toBe(-5);
		expect(seekFromKey('PageUp')).toBe(10);
		expect(seekFromKey('PageDown')).toBe(-10);
		expect(seekFromKey('Home')).toBeUndefined();
		expect(seekFromKey('End')).toBeUndefined();
	});

	test('bufferedSegments turns ranges into percentages, clamps the end and is empty without a duration', () => {
		expect(bufferedSegments([[0, 3]], 12)).toEqual([{ start: 0, size: 25 }]);
		expect(
			bufferedSegments(
				[
					[3, 6],
					[9, 99],
				],
				12,
			),
		).toEqual([
			{ start: 25, size: 25 },
			{ start: 75, size: 25 },
		]);
		expect(bufferedSegments([[0, 3]], Number.NaN)).toEqual([]);
		expect(bufferedSegments([[0, 3]], 0)).toEqual([]);
		expect(bufferedSegments([], 12)).toEqual([]);
	});

	test('seekValueText reads the position and the duration as a clock', () => {
		expect(seekValueText(75, 240)).toBe('1:15 of 4:00');
		expect(seekValueText(0, Number.NaN)).toBe('0:00 of 0:00');
	});
});

describe('video player loader', () => {
	const clip = '/assets/video/radiant-reel.webm';

	function countFetches(handler?: (count: number) => Response | undefined) {
		const real = window.fetch;
		let count = 0;
		window.fetch = async (input, init) => {
			if (!String(input).includes('radiant-reel.webm')) return real(input, init);
			count += 1;
			return handler?.(count) ?? real(input, init);
		};
		return { count: () => count, restore: () => (window.fetch = real) };
	}

	test('requests for a clip that is still downloading share one download and get an object URL each', async () => {
		const fetches = countFetches();
		try {
			const [first, second] = await Promise.all([fetchSource(clip), fetchSource(clip)]);

			expect(fetches.count()).toBe(1);
			expect(first).toMatch(/^blob:/);
			expect(second).not.toBe(first);
			releaseSource(first);
			expect((await fetch(second)).ok).toBe(true);
			releaseSource(second);
		} finally {
			fetches.restore();
		}
	});

	test('a finished download is not kept, so a later request fetches again', async () => {
		const fetches = countFetches();
		try {
			releaseSource(await fetchSource(clip));
			releaseSource(await fetchSource(clip));

			expect(fetches.count()).toBe(2);
		} finally {
			fetches.restore();
		}
	});

	test('a failed download rejects every waiting request and the next request tries again', async () => {
		const fetches = countFetches((count) => (count === 1 ? new Response('missing', { status: 404 }) : undefined));
		try {
			const results = await Promise.allSettled([fetchSource(clip), fetchSource(clip)]);

			expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
			expect(fetches.count()).toBe(1);
			releaseSource(await fetchSource(clip));
			expect(fetches.count()).toBe(2);
		} finally {
			fetches.restore();
		}
	});
});
