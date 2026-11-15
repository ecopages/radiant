import { userEvent } from 'vitest/browser';
import { describe, expect, test, vi } from 'vitest';

type Slider = HTMLElement & { value: number[]; disabled: boolean };

/** What differs between the forms of the recipe: how to start one, and how to take it off the page and back. */
export interface VideoPlayerForm {
	/** Mounts a player and resolves once it is on the page; it may still be loading. */
	mount: () => Promise<HTMLElement>;
	/** Takes the player off the page and puts it back, which is how a router or a reparenting reconnects it. */
	relocate: (root: HTMLElement) => Promise<void>;
	/** Takes the player off the page and lets its cleanup run. */
	remove: (root: HTMLElement) => Promise<void>;
}

/** The shown track when there is one: a form that is moved and mounted again leaves its released track at index 0. */
const liveTrack = (root: HTMLElement): TextTrack => {
	const tracks = Array.from(root.querySelector<HTMLVideoElement>('[data-video]')!.textTracks);
	return tracks.find((track) => track.mode === 'showing') ?? tracks.at(-1)!;
};

const hook = <T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string) =>
	root.querySelector<T>(selector)!;
const video = (root: HTMLElement) => hook<HTMLVideoElement>(root, '[data-video]');
const stage = (root: HTMLElement) => hook(root, '[data-stage]');
const seek = (root: HTMLElement) => hook<Slider>(root, '[data-seek]');
const thumb = (root: HTMLElement) => hook(root, '[data-seek] [role="slider"]');
const volume = (root: HTMLElement) => hook<Slider>(root, '[data-volume-input]');
const playback = (root: HTMLElement) => hook(root, '[data-playback]');
const status = (root: HTMLElement) => hook(root, '[data-status]').textContent;
const state = (root: HTMLElement) => stage(root).getAttribute('data-state');
const text = (root: HTMLElement, selector: string) => hook(root, selector).textContent;
const segments = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-buffered] i')];
const settle = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const ready = async (root: HTMLElement) => {
	await expect.poll(() => seek(root).disabled).toBe(false);
	return root;
};
const playing = async (root: HTMLElement) => {
	await userEvent.click(playback(root));
	await expect.poll(() => video(root).paused).toBe(false);
};

/** Moves a slider the way a pointer does: it takes the new position and reports it with `rui-change`. */
function drag(slider: Slider, value: number): void {
	slider.value = [value];
	slider.dispatchEvent(new CustomEvent('rui-change', { bubbles: true, composed: true, detail: { value: [value] } }));
}

/** Replaces `fetch` for the urls containing `match`; a handler that returns nothing lets the request through. */
function interceptFetch(
	match: string,
	handler: (url: string, count: number) => Promise<Response | undefined> | Response | undefined,
) {
	const real = window.fetch;
	const requests: string[] = [];
	window.fetch = async (input, init) => {
		const url = String(input);
		if (!url.includes(match)) return real(input, init);
		requests.push(url);
		return (await handler(url, requests.length)) ?? real(input, init);
	};
	return { requests, restore: () => (window.fetch = real) };
}

/** Records the object URLs the page makes and revokes, so a test can tell which are still alive. */
function trackObjectUrls() {
	const create = URL.createObjectURL;
	const revoke = URL.revokeObjectURL;
	const created: string[] = [];
	const revoked: string[] = [];
	URL.createObjectURL = (object) => {
		const url = create(object);
		created.push(url);
		return url;
	};
	URL.revokeObjectURL = (url) => {
		revoked.push(url);
		revoke(url);
	};
	return {
		alive: () => created.filter((url) => !revoked.includes(url)),
		stop: () => {
			URL.createObjectURL = create;
			URL.revokeObjectURL = revoke;
		},
	};
}

/** Pretends the browser is (or is not) full screen on `element`, and tells the document. */
function setFullscreen(element: Element | null): void {
	Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
	document.dispatchEvent(new Event('fullscreenchange'));
}

/** Everything `describeVideoPlayerForm` changes on the document, put back. */
function restoreDocument(): void {
	Reflect.deleteProperty(document, 'fullscreenElement');
	Reflect.deleteProperty(document, 'fullscreenEnabled');
}

/**
 * Puts the `primitive-example` frame class, which the docs page's `PrimitiveExample` gives, on what the stylesheet
 * scopes to: the plain root itself, or the parent of the element, component or controller root.
 */
function frame(root: HTMLElement): HTMLElement {
	document.body.classList.remove('primitive-example');
	(root.matches('[data-example]') ? root : root.parentElement!).classList.add('primitive-example');
	return root;
}

/**
 * The behaviour every form of the video player recipe shares, run against one form: the markup hooks, the state the
 * stage shows, the controls, the keyboard, the auto-hide, the failure states and the lifecycle.
 */
export function describeVideoPlayerForm(name: string, unframed: VideoPlayerForm): void {
	const form: VideoPlayerForm = { ...unframed, mount: async () => frame(await unframed.mount()) };
	describe(`video player (${name})`, () => {
		test('loads the clip into a seekable player, paused, with the duration, the poster and the buffered bar', async () => {
			const root = await ready(await form.mount());

			expect(video(root).poster).toMatch(/radiant-reel\.jpg$/);
			expect(video(root).src).toMatch(/^blob:/);
			expect(video(root).paused).toBe(true);
			expect(state(root)).toBe('paused');
			expect(text(root, '[data-duration]')).toBe('0:12');
			expect(text(root, '[data-elapsed]')).toBe('0:00');
			expect(seek(root).max).toBeCloseTo(video(root).duration, 1);
			await expect.poll(() => segments(root).length).toBeGreaterThan(0);
			const covered = segments(root).reduce((sum, bar) => sum + Number(bar.style.getPropertyValue('--size')), 0);
			expect(covered).toBeGreaterThan(95);
		});

		test('the buttons keep one fixed name and report their state with aria-pressed', async () => {
			const root = await ready(await form.mount());
			const names = { playback: 'Play', mute: 'Mute', captions: 'Captions', fullscreen: 'Fullscreen' };
			for (const [hookName, label] of Object.entries(names)) {
				const button = hook(root, `[data-${hookName}]`);
				expect(button.getAttribute('aria-label')).toBe(label);
				expect(button.getAttribute('aria-pressed')).toBe('false');
			}
			expect(hook(root, '[data-rate]').getAttribute('aria-label')).toBe('Speed 1x');
			expect(hook(root, '[data-rate]').hasAttribute('aria-pressed')).toBe(false);

			await userEvent.click(playback(root));
			await userEvent.click(hook(root, '[data-mute]'));
			await userEvent.click(hook(root, '[data-captions]'));

			for (const hookName of ['playback', 'mute', 'captions']) {
				const button = hook(root, `[data-${hookName}]`);
				await expect.poll(() => button.getAttribute('aria-pressed')).toBe('true');
				expect(button.getAttribute('aria-label')).toBe(names[hookName as keyof typeof names]);
			}
		});

		test('the stage is a labelled, focusable group described by the keyboard help', async () => {
			const root = await form.mount();

			expect(stage(root).getAttribute('role')).toBe('group');
			expect(stage(root).getAttribute('aria-label')).toBe('Video player');
			expect(stage(root).tabIndex).toBe(0);
			expect(document.getElementById(stage(root).getAttribute('aria-describedby')!)?.textContent).toContain(
				'Space or K plays and pauses',
			);
			expect(hook(root, '[data-status]').getAttribute('aria-live')).toBe('polite');
			expect(hook(root, '[data-spinner]').getAttribute('aria-hidden')).toBe('true');
		});

		test('the live region says nothing while the clip loads on its own, and not again when the player is moved', async () => {
			const said: string[] = [];
			const observer = new MutationObserver(() => {
				for (const node of document.querySelectorAll('[data-status]')) said.push(node.textContent ?? '');
			});
			observer.observe(document.body, { subtree: true, childList: true, characterData: true });
			try {
				const root = await ready(await form.mount());
				await settle(300);
				await form.relocate(root);
				await ready(root);
				await settle(300);
			} finally {
				observer.disconnect();
			}

			expect(said.filter(Boolean)).toEqual([]);
		});

		test('the keyboard help is hidden from browsing, described by the stage, and lists every key', async () => {
			const root = await form.mount();
			const help = document.getElementById(stage(root).getAttribute('aria-describedby')!)!;

			expect(help.hidden).toBe(true);
			expect(help.hasAttribute('data-help')).toBe(true);
			expect(help.textContent).toContain('Home and End');
			expect(getComputedStyle(help).display).toBe('none');
		});

		test('the focus ring on the controls is white, so it shows over any frame of the video', async () => {
			const root = await ready(await form.mount());
			stage(root).focus();

			await userEvent.tab();
			expect(document.activeElement).toBe(playback(root));
			expect(getComputedStyle(playback(root)).outlineColor).toBe('rgb(255, 255, 255)');
			expect(getComputedStyle(playback(root)).outlineStyle).toBe('solid');
			await userEvent.tab();
			expect(document.activeElement).toBe(thumb(root));
			expect(getComputedStyle(thumb(root)).outlineColor).toBe('rgb(255, 255, 255)');
		});

		test('the captions sit above the controls, also when they wrap to two rows on a narrow screen', async () => {
			const cueLine = (root: HTMLElement) => Number(video(root).textTracks[0].cues?.[0]?.line);
			const aboveControls = (root: HTMLElement) =>
				(100 * hook(root, '[data-controls]').offsetTop) / stage(root).clientHeight;
			try {
				document.body.style.width = '360px';
				const narrow = await ready(await form.mount());
				await userEvent.click(hook(narrow, '[data-captions]'));
				await expect.poll(() => cueLine(narrow)).toBeCloseTo(aboveControls(narrow), 0);
				expect(cueLine(narrow)).toBeLessThan(60);
				expect(video(narrow).textTracks[0].cues![0].lineAlign).toBe('end');

				document.body.style.width = '900px';
				await expect.poll(() => cueLine(narrow)).toBeCloseTo(aboveControls(narrow), 0);
				expect(cueLine(narrow)).toBeGreaterThan(75);
			} finally {
				document.body.style.width = '';
			}
		});

		test('Play, a click on the video and the big button start and stop it, and the status says so', async () => {
			const root = await ready(await form.mount());

			await userEvent.click(playback(root));
			await expect.poll(() => video(root).paused).toBe(false);
			await expect.poll(() => state(root)).toBe('playing');
			expect(status(root)).toBe('Playing');
			expect(playback(root).getAttribute('aria-pressed')).toBe('true');

			await userEvent.click(video(root), { position: { x: 12, y: 12 } });
			await expect.poll(() => video(root).paused).toBe(true);
			await expect.poll(() => status(root)).toBe('Paused');
			expect(playback(root).getAttribute('aria-pressed')).toBe('false');

			await userEvent.click(hook(root, '[data-big-play]'));
			await expect.poll(() => video(root).paused).toBe(false);
		});

		test('the big play button shows while paused and the controls are drawn from the stage state', async () => {
			const root = await ready(await form.mount());
			const big = hook(root, '[data-big-play]');

			await expect.poll(() => getComputedStyle(big).opacity).toBe('1');
			expect(getComputedStyle(hook(root, '[data-controls]')).opacity).toBe('1');
			await playing(root);
			await expect.poll(() => getComputedStyle(big).opacity).toBe('0');
		});

		test('Space and K on the focused player play and pause, and a button keeps Space for itself', async () => {
			const root = await ready(await form.mount());

			stage(root).focus();
			await userEvent.keyboard(' ');
			await expect.poll(() => video(root).paused).toBe(false);
			await userEvent.keyboard('k');
			await expect.poll(() => video(root).paused).toBe(true);

			playback(root).focus();
			await userEvent.keyboard(' ');
			await expect.poll(() => video(root).paused).toBe(false);
			await settle(250);
			expect(video(root).paused).toBe(false);
		});

		test('J, L, the arrows, the digits, Home and End seek from the focused player', async () => {
			const root = await ready(await form.mount());
			stage(root).focus();

			await userEvent.keyboard('l');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(10, 0);
			await userEvent.keyboard('{ArrowLeft}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(5, 0);
			await userEvent.keyboard('{ArrowRight}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(10, 0);
			await userEvent.keyboard('j');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(0, 0);
			await userEvent.keyboard('5');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(video(root).duration / 2, 0);
			await userEvent.keyboard('{Home}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(0, 0);
			await userEvent.keyboard('{End}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(video(root).duration, 0);
		});

		test('the arrows change the volume, M mutes, and keys with a modifier are left to the browser', async () => {
			const root = await ready(await form.mount());
			stage(root).focus();

			await userEvent.keyboard('{ArrowDown}{ArrowDown}');
			await expect.poll(() => video(root).volume).toBeCloseTo(0.8, 2);
			expect(status(root)).toBe('Volume 80%');
			expect(volume(root).value[0]).toBeCloseTo(0.8, 2);
			await userEvent.keyboard('m');
			await expect.poll(() => video(root).muted).toBe(true);
			expect(hook(root, '[data-mute]').getAttribute('aria-pressed')).toBe('true');
			expect(volume(root).value[0]).toBe(0);
			await userEvent.keyboard('{ArrowUp}');
			await expect.poll(() => video(root).muted).toBe(false);
			expect(video(root).volume).toBeCloseTo(0.9, 2);

			await userEvent.keyboard('{Control>}k{/Control}{Alt>}m{/Alt}{Meta>}c{/Meta}');
			await settle(150);
			expect(video(root).paused).toBe(true);
			expect(video(root).muted).toBe(false);
			expect(hook(root, '[data-captions]').getAttribute('aria-pressed')).toBe('false');
		});

		test('the arrows and the page keys on the seek thumb move the playback by whole seconds, once', async () => {
			const root = await ready(await form.mount());

			thumb(root).focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(5, 1);
			await settle(200);
			expect(video(root).currentTime).toBeCloseTo(5, 1);
			expect(text(root, '[data-elapsed]')).toBe('0:05');
			expect(seek(root).value[0]).toBeCloseTo(5, 1);
			expect(thumb(root).getAttribute('aria-valuetext')).toBe('0:05 of 0:12');

			await userEvent.keyboard('{PageUp}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(video(root).duration, 0);
			await userEvent.keyboard('{PageDown}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(video(root).duration - 10, 0);
			await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(0, 0);
			await expect.poll(() => seek(root).value[0]).toBeCloseTo(0, 0);
			await userEvent.keyboard('{End}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(video(root).duration, 0);
			await userEvent.keyboard('{Home}');
			await expect.poll(() => video(root).currentTime).toBeCloseTo(0, 0);
		});

		test('a burst of scrub input applies one seek to the last value while the clock follows at once', async () => {
			const root = await ready(await form.mount());
			let seeks = 0;
			video(root).addEventListener('seeking', () => (seeks += 1));

			for (const fraction of [0.1, 0.3, 0.5, 0.75]) drag(seek(root), fraction * video(root).duration);

			expect(text(root, '[data-elapsed]')).toBe('0:09');
			expect(thumb(root).getAttribute('aria-valuetext')).toBe('0:09 of 0:12');
			expect(video(root).currentTime).toBe(0);
			await expect.poll(() => video(root).currentTime).toBeCloseTo(video(root).duration * 0.75, 0);
			expect(seeks).toBe(1);
		});

		test('the volume slider sets the volume and a raised volume unmutes', async () => {
			const root = await ready(await form.mount());

			drag(volume(root), 0.3);
			expect(video(root).volume).toBeCloseTo(0.3);
			await userEvent.click(hook(root, '[data-mute]'));
			await expect.poll(() => video(root).muted).toBe(true);
			expect(volume(root).value[0]).toBe(0);

			drag(volume(root), 0.6);
			await expect.poll(() => video(root).muted).toBe(false);
			expect(video(root).volume).toBeCloseTo(0.6);
			await expect.poll(() => hook(root, '[data-mute]').getAttribute('aria-pressed')).toBe('false');
		});

		test('the speed button cycles 1x, 1.25x, 1.5x, 2x and 0.5x and sets the playback rate', async () => {
			const root = await ready(await form.mount());
			const rate = hook(root, '[data-rate]');
			expect(rate.textContent).toBe('1x');

			for (const expected of ['1.25', '1.5', '2', '0.5', '1']) {
				await userEvent.click(rate);
				await expect.poll(() => video(root).playbackRate).toBe(Number(expected));
				expect(rate.textContent).toBe(`${expected}x`);
				expect(rate.getAttribute('aria-label')).toBe(`Speed ${expected}x`);
				expect(rate.getAttribute('aria-label')).toContain(rate.textContent!);
			}
			expect(status(root)).toBe('Speed 1x');
		});

		test('the captions button and C toggle the track between showing and hidden', async () => {
			const root = await ready(await form.mount());
			const track = video(root).textTracks[0];
			const button = hook(root, '[data-captions]');
			expect(track.kind).toBe('captions');
			expect(track.mode).toBe('disabled');
			expect(video(root).querySelector('track')).toBeNull();

			await userEvent.click(button);
			expect(track.mode).toBe('showing');
			expect(button.getAttribute('aria-pressed')).toBe('true');
			expect(status(root)).toBe('Captions on');
			stage(root).focus();
			await userEvent.keyboard('c');
			expect(track.mode).toBe('disabled');
			expect(button.getAttribute('aria-pressed')).toBe('false');
			expect(status(root)).toBe('Captions off');
			await userEvent.click(button);
			expect(track.cues).toHaveLength(5);
			expect(track.cues![0].text).toBe('Scene one: a slow start');
		});

		test('a player that was moved while its captions were on starts with them off, and the button agrees', async () => {
			const root = await ready(await form.mount());
			const button = hook(root, '[data-captions]');
			await userEvent.click(button);
			expect(liveTrack(root).mode).toBe('showing');
			expect(button.getAttribute('aria-pressed')).toBe('true');

			await form.relocate(root);
			await ready(root);

			expect(liveTrack(root).mode).toBe('disabled');
			await expect.poll(() => button.getAttribute('aria-pressed')).toBe('false');
			await userEvent.click(button);
			expect(liveTrack(root).mode).toBe('showing');
			await expect.poll(() => button.getAttribute('aria-pressed')).toBe('true');
		});

		test('fullscreen goes through the stage, the button follows fullscreenchange, F and a double click toggle it', async () => {
			try {
				const root = await ready(await form.mount());
				const request = vi.fn(() => Promise.resolve());
				const exit = vi.fn(() => Promise.resolve());
				stage(root).requestFullscreen = request;
				document.exitFullscreen = exit;
				const button = hook(root, '[data-fullscreen]');
				expect(button.hidden).toBe(false);

				await userEvent.click(button);
				expect(request).toHaveBeenCalledTimes(1);
				expect(button.getAttribute('aria-pressed')).toBe('false');
				setFullscreen(stage(root));
				expect(button.getAttribute('aria-pressed')).toBe('true');

				await userEvent.click(button);
				expect(exit).toHaveBeenCalledTimes(1);
				setFullscreen(null);
				expect(button.getAttribute('aria-pressed')).toBe('false');

				stage(root).focus();
				await userEvent.keyboard('f');
				expect(request).toHaveBeenCalledTimes(2);
				video(root).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
				expect(request).toHaveBeenCalledTimes(3);
			} finally {
				restoreDocument();
			}
		});

		test('the fullscreen button is hidden where the browser cannot go full screen', async () => {
			try {
				Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
				const root = await form.mount();

				expect(hook(root, '[data-fullscreen]').hidden).toBe(true);
				expect(getComputedStyle(hook(root, '[data-fullscreen]')).display).toBe('none');
			} finally {
				restoreDocument();
			}
		});

		test('the controls hide after 2.5 seconds without activity while playing, and come back on movement', async () => {
			const root = await ready(await form.mount());
			await playing(root);
			await userEvent.hover(video(root), { position: { x: 8, y: 8 } });

			expect(stage(root).hasAttribute('data-controls-hidden')).toBe(false);
			await expect.poll(() => stage(root).hasAttribute('data-controls-hidden'), { timeout: 4500 }).toBe(true);
			await expect.poll(() => getComputedStyle(hook(root, '[data-controls]')).opacity).toBe('0');

			stage(root).dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
			expect(stage(root).hasAttribute('data-controls-hidden')).toBe(false);
			await expect.poll(() => getComputedStyle(hook(root, '[data-controls]')).opacity).toBe('1');
		}, 15000);

		test('the controls stay visible while paused and while a control has keyboard focus', async () => {
			const root = await ready(await form.mount());
			await playing(root);
			await userEvent.tab();
			expect(stage(root).contains(document.activeElement)).toBe(true);

			await settle(3200);
			expect(stage(root).hasAttribute('data-controls-hidden')).toBe(false);

			video(root).pause();
			await expect.poll(() => state(root)).toBe('paused');
			expect(stage(root).hasAttribute('data-controls-hidden')).toBe(false);
		}, 15000);

		test('a touch tap on the playing video shows or hides the controls and does not pause it', async () => {
			const root = await ready(await form.mount());
			await playing(root);
			const surface = video(root);
			const tap = () => {
				surface.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
				surface.click();
			};

			tap();
			expect(stage(root).hasAttribute('data-controls-hidden')).toBe(true);
			tap();
			expect(stage(root).hasAttribute('data-controls-hidden')).toBe(false);
			expect(video(root).paused).toBe(false);
		});

		test('a stalled video shows the spinner and says Buffering, and playing again clears it', async () => {
			const root = await ready(await form.mount());
			await playing(root);

			Object.defineProperty(video(root), 'readyState', { configurable: true, get: () => 1 });
			video(root).dispatchEvent(new Event('waiting'));
			await expect.poll(() => state(root)).toBe('buffering');
			expect(status(root)).toBe('Buffering');
			await expect.poll(() => getComputedStyle(hook(root, '[data-spinner]')).opacity).toBe('1');
			expect(hook(root, '[data-spinner]').getAttribute('aria-hidden')).toBe('true');
			expect(playback(root).getAttribute('aria-pressed')).toBe('true');

			Reflect.deleteProperty(video(root), 'readyState');
			video(root).dispatchEvent(new Event('playing'));
			await expect.poll(() => state(root)).toBe('playing');
			expect(status(root)).toBe('Playing');
			await expect.poll(() => getComputedStyle(hook(root, '[data-spinner]')).opacity).toBe('0');
		});

		test('a clip that cannot be fetched shows the error with Retry, and Retry loads it', async () => {
			const fetches = interceptFetch('radiant-reel.webm', (_url, count) =>
				count === 1 ? new Response('missing', { status: 404 }) : undefined,
			);
			try {
				const root = await form.mount();

				await expect.poll(() => state(root)).toBe('error');
				expect(hook(root, '[data-error]').hidden).toBe(false);
				expect(hook(root, '[data-error]').textContent).toContain('Could not load the video');
				expect(status(root)).toBe('Could not load the video');
				expect(seek(root).disabled).toBe(true);

				await userEvent.click(hook(root, '[data-retry]'));

				await ready(root);
				expect(fetches.requests).toHaveLength(2);
				expect(hook(root, '[data-error]').hidden).toBe(true);
				expect(state(root)).toBe('paused');
				await playing(root);
			} finally {
				fetches.restore();
			}
		});

		test('autoplay that the browser blocks says so and leaves the player paused, and Play works afterwards', async () => {
			const root = await ready(await form.mount());
			video(root).play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));

			await userEvent.click(playback(root));

			await expect.poll(() => status(root)).toBe('Playback was blocked, press Play to start');
			expect(video(root).paused).toBe(true);
			expect(playback(root).getAttribute('aria-pressed')).toBe('false');
			Reflect.deleteProperty(video(root), 'play');
			await userEvent.click(playback(root));
			await expect.poll(() => video(root).paused).toBe(false);
			await expect.poll(() => status(root)).toBe('Playing');
		});

		test('the clip plays from a blob URL that is released when the player is removed', async () => {
			const urls = trackObjectUrls();
			try {
				const root = await ready(await form.mount());
				expect(urls.alive()).toHaveLength(1);
				const player = video(root);
				await playing(root);

				await form.remove(root);
				await settle(100);

				expect(player.paused).toBe(true);
				expect(player.hasAttribute('src')).toBe(false);
				expect(urls.alive()).toEqual([]);
			} finally {
				urls.stop();
			}
		});

		test('removing the player while the clip is still loading leaves no object URL and no source behind', async () => {
			let open!: () => void;
			const held = new Promise<void>((resolve) => (open = resolve));
			const fetches = interceptFetch('radiant-reel.webm', () => held.then(() => undefined));
			const urls = trackObjectUrls();
			try {
				const root = await form.mount();
				await expect.poll(() => fetches.requests).toHaveLength(1);
				const player = video(root);

				await form.remove(root);
				open();
				await settle(300);

				expect(player.hasAttribute('src')).toBe(false);
				expect(urls.alive()).toEqual([]);
			} finally {
				fetches.restore();
				urls.stop();
			}
		});

		test('a player that was moved to another parent loads the clip again and plays', async () => {
			const root = await ready(await form.mount());

			await form.relocate(root);

			await ready(root);
			expect(video(root).src).toMatch(/^blob:/);
			await playing(root);
			await expect.poll(() => status(root)).toBe('Playing');
		});
	});
}
