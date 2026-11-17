import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { sampleFrames, until } from './until';
import type { VideoPlayerForm } from './video-player-shared';

type RenderHost = { prototype: { render: (...args: never[]) => unknown } };
type UpdateHost = HTMLElement & { updateComplete: Promise<unknown> };

const part = <T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string) =>
	root.querySelector<T>(selector)!;
const video = (root: HTMLElement) => part<HTMLVideoElement>(root, '[data-video]');
const playback = (root: HTMLElement) => part(root, '[data-playback]');

const RENDER_WARNING = /re-ran render\(\)|binds "[^"]+" with this\.\$/;

/**
 * How many extra `render()` calls a scenario may add after the player is ready, and whether a development
 * warning is expected. The store recipe's hot path is 0 extra renders and no warning.
 */
export type RenderBudget = {
	play: number;
	playFrames: number;
	seek: number;
	mute: number;
	rate: number;
};

function warningText(warn: ReturnType<typeof vi.spyOn>): string {
	return warn.mock.calls
		.flat()
		.map((entry) => String(entry))
		.join('\n');
}

async function settled(root: HTMLElement): Promise<void> {
	await (root as UpdateHost).updateComplete;
}

function expectBudget(actual: number, budget: number): void {
	if (budget === 0) {
		expect(actual).toBe(0);
		return;
	}

	expect(actual).toBeGreaterThanOrEqual(budget);
	expect(actual).toBeLessThanOrEqual(budget + 1);
}

/**
 * Counts `render()` of the component form while media plays, seeks, mutes and changes rate.
 *
 * @remarks Frames are animation frames, not sleeps. The spy is on the class prototype so the host needs no
 * test-only counter. Each scenario waits for `updateComplete` so a queued render cannot hide behind a DOM
 * patch from a binding. A non-zero budget allows one extra cycle: a later `@state` write (the live region)
 * can land in a second turn.
 */
export function describePlayerRenderMetrics(
	name: string,
	ctor: RenderHost,
	form: VideoPlayerForm,
	budget: RenderBudget,
): void {
	test(`video player (${name}): playing adds ${budget.play} render()`, async () => {
		const render = vi.spyOn(ctor.prototype, 'render');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const root = await form.mount();
			await until(() => expect(part<HTMLElement & { disabled: boolean }>(root, '[data-seek]').disabled).toBe(false));
			const before = render.mock.calls.length;
			await userEvent.click(playback(root));
			await until(() => expect(video(root).paused).toBe(false));
			await settled(root);
			expectBudget(render.mock.calls.length - before, budget.play);
			expect(warningText(warn)).not.toMatch(RENDER_WARNING);
		} finally {
			render.mockRestore();
			warn.mockRestore();
		}
	});

	test(`video player (${name}): playing for 30 frames adds ${budget.playFrames} render() after play`, async () => {
		const render = vi.spyOn(ctor.prototype, 'render');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const root = await form.mount();
			await until(() => expect(part<HTMLElement & { disabled: boolean }>(root, '[data-seek]').disabled).toBe(false));
			await userEvent.click(playback(root));
			await until(() => expect(video(root).paused).toBe(false));
			await settled(root);
			const afterPlay = render.mock.calls.length;
			await sampleFrames(30, () => undefined);
			await settled(root);
			expect(render.mock.calls.length - afterPlay).toBe(budget.playFrames);
			expect(warningText(warn)).not.toMatch(RENDER_WARNING);
		} finally {
			render.mockRestore();
			warn.mockRestore();
		}
	});

	test(`video player (${name}): seeking adds ${budget.seek} render()`, async () => {
		const render = vi.spyOn(ctor.prototype, 'render');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const root = await form.mount();
			await until(() => expect(part<HTMLElement & { disabled: boolean }>(root, '[data-seek]').disabled).toBe(false));
			const before = render.mock.calls.length;
			part(root, '[data-stage]').focus();
			await userEvent.keyboard('5');
			await until(() => expect(video(root).currentTime).toBeCloseTo(6, 0));
			await settled(root);
			expectBudget(render.mock.calls.length - before, budget.seek);
			expect(warningText(warn)).not.toMatch(RENDER_WARNING);
		} finally {
			render.mockRestore();
			warn.mockRestore();
		}
	});

	test(`video player (${name}): muting adds ${budget.mute} render()`, async () => {
		const render = vi.spyOn(ctor.prototype, 'render');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const root = await form.mount();
			await until(() => expect(part<HTMLElement & { disabled: boolean }>(root, '[data-seek]').disabled).toBe(false));
			const before = render.mock.calls.length;
			await userEvent.click(part(root, '[data-mute]'));
			await until(() => expect(part(root, '[data-mute]').getAttribute('aria-pressed')).toBe('true'));
			await settled(root);
			expectBudget(render.mock.calls.length - before, budget.mute);
			expect(warningText(warn)).not.toMatch(RENDER_WARNING);
		} finally {
			render.mockRestore();
			warn.mockRestore();
		}
	});

	test(`video player (${name}): changing rate adds ${budget.rate} render()`, async () => {
		const render = vi.spyOn(ctor.prototype, 'render');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const root = await form.mount();
			await until(() => expect(part<HTMLElement & { disabled: boolean }>(root, '[data-seek]').disabled).toBe(false));
			const before = render.mock.calls.length;
			await userEvent.click(part(root, '[data-rate]'));
			await until(() => expect(part(root, '[data-rate]').textContent).toBe('1.25x'));
			await settled(root);
			expectBudget(render.mock.calls.length - before, budget.rate);
			expect(warningText(warn)).not.toMatch(RENDER_WARNING);
		} finally {
			render.mockRestore();
			warn.mockRestore();
		}
	});
}
