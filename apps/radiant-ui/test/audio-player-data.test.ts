import { describe, expect, test } from 'vitest';
import {
	PlaybackOrder,
	RESTART_AFTER,
	loopLabel,
	nextLoopMode,
	shuffleAnnouncement,
} from '../src/content/components/recipes/audio-player.data';

/** A random source that returns the given numbers in turn, so a shuffle is the same on every run. */
const sequence = (...values: number[]) => {
	let index = 0;
	return () => values[index++ % values.length];
};

const A = { id: 'a' };
const B = { id: 'b' };
const C = { id: 'c' };
const D = { id: 'd' };
const list = [A, B, C, D];

const orderOf = (random = sequence(0), current = A) => new PlaybackOrder(list, current, random);

/** The tracks `next` moves through for `count` clicks. */
const walk = (order: PlaybackOrder<{ id: string }>, count: number) =>
	Array.from({ length: count }, () => order.next().id);

describe('loop mode', () => {
	test('cycles off, all, one and back to off', () => {
		expect(nextLoopMode('off')).toBe('all');
		expect(nextLoopMode('all')).toBe('one');
		expect(nextLoopMode('one')).toBe('off');
	});

	test('names the mode, which is also what is announced', () => {
		expect(['off', 'all', 'one'].map((mode) => loopLabel(mode as 'off'))).toEqual([
			'Loop: off',
			'Loop: all',
			'Loop: one',
		]);
		expect([shuffleAnnouncement(true), shuffleAnnouncement(false)]).toEqual(['Shuffle on', 'Shuffle off']);
	});
});

describe('PlaybackOrder in list order', () => {
	test('next steps through the list and wraps from the last track to the first', () => {
		expect(walk(orderOf(), 5)).toEqual(['b', 'c', 'd', 'a', 'b']);
	});

	test('previous steps back and wraps from the first track to the last', () => {
		const order = orderOf();
		expect(order.previous(0)).toEqual({ track: D, restart: false });
		expect(order.previous(0)).toEqual({ track: C, restart: false });
	});

	test('previous restarts the current track after more than 3 seconds, and not at exactly 3', () => {
		const order = orderOf(sequence(0), B);
		expect(order.previous(RESTART_AFTER + 0.1)).toEqual({ track: B, restart: true });
		expect(order.current).toBe(B);
		expect(order.previous(RESTART_AFTER)).toEqual({ track: A, restart: false });
	});

	test('a track that ends moves on, and the last one ends the playlist while the loop is off', () => {
		const order = orderOf(sequence(0), C);
		expect(order.ended()).toBe(D);
		expect(order.ended()).toBeUndefined();
		expect(order.current).toBe(D);
	});

	test('loop all wraps the last track to the first when it ends', () => {
		const order = orderOf(sequence(0), D);
		order.loop = 'all';
		expect(order.ended()).toBe(A);
	});

	test('loop one repeats the track that ends, in the middle of the list and at its end, and Next still moves on', () => {
		const order = orderOf(sequence(0), D);
		order.loop = 'one';
		expect(order.ended()).toBe(D);
		expect(order.ended()).toBe(D);
		expect(order.next()).toBe(A);
		expect(order.ended()).toBe(A);
	});

	test('choosing a track makes it the current one', () => {
		const order = orderOf();
		order.select(C);
		expect(order.next()).toBe(D);
	});

	test('reordering the list continues from the current track in the new order', () => {
		const order = orderOf(sequence(0), B);
		order.setItems([D, C, B, A]);
		expect(order.next()).toBe(A);
		order.setItems([A, D, C, B]);
		expect(order.next()).toBe(D);
	});
});

describe('PlaybackOrder shuffled', () => {
	test('plays every track once before any repeats, over three full passes', () => {
		const order = orderOf(sequence(0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.6, 0.4));
		order.setShuffle(true);

		const played = ['a', ...walk(order, 11)];

		for (const pass of [played.slice(0, 4), played.slice(4, 8), played.slice(8, 12)]) {
			expect([...pass].sort()).toEqual(['a', 'b', 'c', 'd']);
		}
	});

	test('never plays the current track twice in a row, whatever the random source returns', () => {
		const spread = Array.from({ length: 20 }, (_, step) => step / 20);
		for (const value of [...spread, 0.999]) {
			const order = orderOf(sequence(value));
			order.setShuffle(true);
			let before = order.current;
			for (let step = 0; step < 24; step++) {
				const to = order.next();
				expect(to, `value ${value}, step ${step}`).not.toBe(before);
				before = to;
			}
		}
	});

	test('never repeats the current track across bag boundaries, for fifty fixed pseudo-random sequences', () => {
		for (let seed = 1; seed <= 50; seed++) {
			let state = seed;
			const random = () => {
				state = (state * 1103515245 + 12345) % 2147483648;
				return state / 2147483648;
			};
			const order = orderOf(random);
			order.setShuffle(true);
			let before = order.current;
			for (let step = 0; step < 40; step++) {
				const to = order.next();
				expect(to, `seed ${seed}, step ${step}`).not.toBe(before);
				before = to;
			}
		}
	});

	test('draws from the bag with the random source, so a fixed source gives a fixed order', () => {
		const order = orderOf(sequence(0.99, 0, 0));
		order.setShuffle(true);
		expect(walk(order, 3)).toEqual(['d', 'b', 'c']);
	});

	test('previous walks back through the tracks played, then restarts when there is nothing before', () => {
		const order = orderOf(sequence(0.99, 0, 0));
		order.setShuffle(true);
		walk(order, 3);

		expect(order.previous(0)).toEqual({ track: B, restart: false });
		expect(order.previous(0)).toEqual({ track: D, restart: false });
		expect(order.previous(0)).toEqual({ track: A, restart: false });
		expect(order.previous(0)).toEqual({ track: A, restart: true });
	});

	test('Next after Previous returns to the track that was left, and it is not drawn twice in the pass', () => {
		const order = orderOf(sequence(0.99, 0, 0));
		order.setShuffle(true);
		expect(walk(order, 2)).toEqual(['d', 'b']);

		expect(order.previous(0)).toEqual({ track: D, restart: false });
		expect(order.previous(0)).toEqual({ track: A, restart: false });
		expect(order.next()).toBe(D);
		expect(order.next()).toBe(B);
		expect(order.next()).toBe(C);
		expect(order.ended()).toBeUndefined();
	});

	test('choosing a track by hand or toggling the shuffle forgets the tracks stepped back from', () => {
		const chosen = orderOf(sequence(0.99, 0, 0));
		chosen.setShuffle(true);
		walk(chosen, 2);
		chosen.previous(0);
		chosen.select(C);
		expect(chosen.next()).not.toBe(B);

		const toggled = orderOf(sequence(0.99, 0, 0));
		toggled.setShuffle(true);
		walk(toggled, 2);
		toggled.previous(0);
		toggled.setShuffle(false);
		toggled.setShuffle(true);
		expect(toggled.next()).not.toBe(B);
	});

	test('previous restarts the current track after more than 3 seconds without leaving it', () => {
		const order = orderOf(sequence(0.99));
		order.setShuffle(true);
		order.next();

		expect(order.previous(4)).toEqual({ track: D, restart: true });
		expect(order.previous(1)).toEqual({ track: A, restart: false });
	});

	test('a track chosen by hand leaves the bag, so it is not played again in this pass', () => {
		const order = orderOf(sequence(0));
		order.setShuffle(true);
		order.select(C);

		expect(walk(order, 3).sort()).toEqual(['a', 'b', 'd']);
	});

	test('turning the shuffle off continues in list order from the current track', () => {
		const order = orderOf(sequence(0.99));
		order.setShuffle(true);
		order.next();
		expect(order.current).toBe(D);

		order.setShuffle(false);

		expect(order.next()).toBe(A);
		expect(order.next()).toBe(B);
		expect(order.previous(0)).toEqual({ track: A, restart: false });
	});

	test('reordering keeps the bag and history on the same tracks, not the same places', () => {
		const order = orderOf(sequence(0, 0.99));
		order.setShuffle(true);
		expect(order.next()).toBe(B);

		order.setItems([D, C, B, A]);

		expect(walk(order, 2).sort()).toEqual(['c', 'd']);
		expect(order.previous(0).track.id).toMatch(/^[cd]$/);
		expect(order.previous(0)).toEqual({ track: B, restart: false });
		expect(order.previous(0)).toEqual({ track: A, restart: false });
	});

	test('a shuffle ends the playlist when its bag is empty and the loop is off, and starts a new bag on loop all', () => {
		const order = orderOf(sequence(0));
		order.setShuffle(true);
		const played = [order.ended(), order.ended(), order.ended()].map((track) => track?.id);
		expect(played.sort()).toEqual(['b', 'c', 'd']);
		expect(order.ended()).toBeUndefined();

		order.loop = 'all';
		const last = order.current;
		const next = order.ended();
		expect(next).toBe(A);
		expect(next).not.toBe(last);
	});

	test('loop one repeats the current track in a shuffle', () => {
		const order = orderOf(sequence(0));
		order.setShuffle(true);
		order.loop = 'one';
		expect(order.ended()).toBe(A);
	});

	test('Next at the end of a bag starts the next one, without repeating the track that just played', () => {
		const order = orderOf(sequence(0));
		order.setShuffle(true);
		walk(order, 3);
		const last = order.current;

		expect(order.next()).not.toBe(last);
	});

	test('a list of one track repeats it', () => {
		const order = new PlaybackOrder([A], A, sequence(0));
		order.setShuffle(true);
		expect(order.next()).toBe(A);
	});
});
