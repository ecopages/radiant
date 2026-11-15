import { userEvent } from 'vitest/browser';
import { describe, expect, test, vi } from 'vitest';
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/button/styles.css';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/voice-memo.css';

/** What differs between the four forms of the recipe: how to start one and how to take it off the page. */
export interface VoiceMemoForm {
	/** Mounts a memo and resolves once it has drawn its controls. */
	mount: () => Promise<HTMLElement>;
	/** Takes the memo off the page and lets its cleanup run. */
	remove: (root: HTMLElement) => Promise<void>;
}

const part = <T extends HTMLElement>(root: HTMLElement, selector: string) => root.querySelector<T>(selector)!;
export const stateOf = (root: HTMLElement) => part(root, '[data-status]').dataset.state;
export const statusOf = (root: HTMLElement) => part(root, '[data-status]').textContent;
export const elapsedOf = (root: HTMLElement) => part(root, '[data-elapsed]').textContent;
const click = (root: HTMLElement, selector: string) => userEvent.click(part(root, selector));
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const buttons = (root: HTMLElement) =>
	['record', 'pause', 'stop', 'discard'].map(
		(name) => `${name}:${part<HTMLButtonElement>(root, `[data-${name}]`).disabled ? 'off' : 'on'}`,
	);

/** Spies on `getUserMedia`, passing through to the fake microphone and keeping every stream it hands out. */
function captureStreams(): MediaStream[] {
	const streams: MediaStream[] = [];
	const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
	vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(async (constraints) => {
		const stream = await real(constraints);
		streams.push(stream);
		return stream;
	});
	return streams;
}

export async function record(root: HTMLElement): Promise<void> {
	await click(root, '[data-record]');
	await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('recording');
}

export async function recordAndStop(root: HTMLElement): Promise<void> {
	await record(root);
	await sleep(1200);
	await click(root, '[data-stop]');
	await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('stopped');
	await expect.poll(() => part<HTMLAudioElement>(root, '[data-player]').src, { timeout: 5000 }).toMatch(/^blob:/);
}

/** The states a scripted take passes through, with the buttons enabled in each, for comparing forms. */
export async function flowOf(form: VoiceMemoForm): Promise<string[]> {
	const root = await form.mount();
	const seen: string[] = [`${stateOf(root)} ${buttons(root)} ${statusOf(root)}`];
	const note = () => seen.push(`${stateOf(root)} ${buttons(root)} ${statusOf(root)}`);
	await record(root);
	note();
	await click(root, '[data-pause]');
	await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('paused');
	note();
	await click(root, '[data-pause]');
	await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('recording');
	await click(root, '[data-stop]');
	await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('stopped');
	seen.push(`${stateOf(root)} ${buttons(root)} ${part(root, '[data-result]').hidden}`);
	await click(root, '[data-discard]');
	await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('idle');
	note();
	await form.remove(root);
	return seen;
}

/** The behaviour every form of the voice memo recipe shares, run against one form. */
export function describeVoiceMemoForm(name: string, form: VoiceMemoForm): void {
	describe(`voice memo (${name})`, () => {
		test('starts idle with only Record enabled and the instructions in the status line', async () => {
			const root = await form.mount();

			expect(stateOf(root)).toBe('idle');
			expect(buttons(root)).toEqual(['record:on', 'pause:off', 'stop:off', 'discard:off']);
			expect(statusOf(root)).toContain('Press Record');
			expect(part(root, '[data-status]').getAttribute('aria-live')).toBe('polite');
			expect(part(root, '[data-result]').hidden).toBe(true);
			for (const control of ['record', 'pause', 'stop', 'discard']) {
				expect(part(root, `[data-${control}]`).getAttribute('aria-label')).toBeTruthy();
			}
		});

		test('Record then Stop gives a playable result with a download link', async () => {
			const root = await form.mount();

			await record(root);
			expect(statusOf(root)).toContain('Recording');
			expect(buttons(root)).toEqual(['record:off', 'pause:on', 'stop:on', 'discard:on']);
			await sleep(1200);
			expect(elapsedOf(root)).not.toBe('0:00');
			await click(root, '[data-stop]');
			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('stopped');

			const player = part<HTMLAudioElement>(root, '[data-player]');
			await expect.poll(() => player.src, { timeout: 5000 }).toMatch(/^blob:/);
			await expect.poll(() => player.readyState, { timeout: 5000 }).toBeGreaterThan(0);
			expect(player.error).toBeNull();
			expect(part(root, '[data-result]').hidden).toBe(false);
			const link = part<HTMLAnchorElement>(root, '[data-download]');
			expect(link.getAttribute('href')).toBe(player.src);
			expect(link.download).toMatch(/^voice-memo\.(webm|m4a|ogg)$/);
			expect(statusOf(root)).toContain('Recorded 0:01');
			await form.remove(root);
		});

		test('Pause holds the clock and Resume goes on', async () => {
			const root = await form.mount();
			await record(root);
			await sleep(700);

			await click(root, '[data-pause]');
			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('paused');
			expect(part(root, '[data-pause]').getAttribute('aria-label')).toBe('Resume');
			const held = elapsedOf(root);
			await sleep(1200);
			expect(elapsedOf(root)).toBe(held);

			await click(root, '[data-pause]');
			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('recording');
			expect(part(root, '[data-pause]').getAttribute('aria-label')).toBe('Pause');
			await expect.poll(() => elapsedOf(root)).not.toBe(held);
			await form.remove(root);
		});

		test('Discard clears the player and the link and returns to idle', async () => {
			const root = await form.mount();
			await recordAndStop(root);

			await click(root, '[data-discard]');

			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('idle');
			expect(part(root, '[data-player]').hasAttribute('src')).toBe(false);
			expect(part(root, '[data-download]').hasAttribute('href')).toBe(false);
			expect(part(root, '[data-result]').hidden).toBe(true);
			expect(elapsedOf(root)).toBe('0:00');
			await form.remove(root);
		});

		test('a second take clears the player before it starts and plays the new result', async () => {
			const root = await form.mount();
			await recordAndStop(root);
			const first = part<HTMLAudioElement>(root, '[data-player]').src;

			await click(root, '[data-record]');
			expect(part(root, '[data-player]').hasAttribute('src')).toBe(false);
			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('recording');
			await sleep(800);
			await click(root, '[data-stop]');
			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('stopped');

			await expect
				.poll(() => part<HTMLAudioElement>(root, '[data-player]').src, { timeout: 5000 })
				.not.toBe(first);
			await expect.poll(() => part<HTMLAudioElement>(root, '[data-player]').error?.message ?? null).toBeNull();
			await form.remove(root);
		});

		test('a refused permission is shown with how to try again, and Record still works', async () => {
			const root = await form.mount();
			const spy = vi
				.spyOn(navigator.mediaDevices, 'getUserMedia')
				.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));

			await click(root, '[data-record]');

			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('denied');
			expect(statusOf(root)).toContain('try again');
			expect(statusOf(root)).toContain('Allow the microphone');
			expect(buttons(root)).toEqual(['record:on', 'pause:off', 'stop:off', 'discard:off']);
			spy.mockRestore();
			await record(root);
			await form.remove(root);
		});

		test('any other failure is the error state', async () => {
			const root = await form.mount();
			vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockRejectedValueOnce(
				new DOMException('No device', 'NotFoundError'),
			);

			await click(root, '[data-record]');

			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('error');
			expect(statusOf(root)).toContain('Recording failed');
			expect(buttons(root)[0]).toBe('record:on');
			await form.remove(root);
		});

		test('a browser without MediaRecorder shows unsupported and disables every control', async () => {
			vi.stubGlobal('MediaRecorder', undefined);
			const root = await form.mount();

			await click(root, '[data-record]');

			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('unsupported');
			expect(statusOf(root)).toBe('This browser cannot record audio.');
			expect(buttons(root)).toEqual(['record:off', 'pause:off', 'stop:off', 'discard:off']);
			await form.remove(root);
		});

		test('removing the memo while it records stops the microphone', async () => {
			const streams = captureStreams();
			const root = await form.mount();
			await record(root);
			expect(streams).toHaveLength(1);
			expect(streams[0].getTracks().some((track) => track.readyState === 'live')).toBe(true);

			await form.remove(root);

			await expect.poll(() => streams[0].getTracks().every((track) => track.readyState === 'ended')).toBe(true);
		});

		test('Stop and Discard end the take and stop the microphone', async () => {
			const streams = captureStreams();
			const root = await form.mount();
			await record(root);
			await click(root, '[data-discard]');

			await expect.poll(() => stateOf(root), { timeout: 5000 }).toBe('idle');
			expect(streams[0].getTracks().every((track) => track.readyState === 'ended')).toBe(true);
			await form.remove(root);
		});
	});
}
