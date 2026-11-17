import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { ControllerHost } from './controller';
import { frames } from './event.fixture';
import { CaptionsController, createCaptionsController, type CaptionTrackSource } from './captions-controller';

const SIGNALS = ['loadedmetadata', 'seeked', 'timeupdate', 'load', 'error', 'cuechange'];
const waiters = new Set<() => void>();

/**
 * Resolves once `check` holds, re-checked on a controller callback, a DOM mutation or a media or track event.
 *
 * @remarks A track's `cuechange` does not bubble, so every `<track>` element's text track is listened to directly.
 */
const settle = (check: () => boolean): Promise<void> =>
	new Promise((resolve) => {
		const tracks = [...document.querySelectorAll('track')].map((element) => element.track);
		const observer = new MutationObserver(() => attempt());
		const stop = () => {
			observer.disconnect();
			waiters.delete(attempt);
			SIGNALS.forEach((type) => document.removeEventListener(type, attempt, true));
			tracks.forEach((track) => track.removeEventListener('cuechange', attempt));
		};
		function attempt() {
			if (!check()) {
				return;
			}
			stop();
			resolve();
		}
		observer.observe(document, { attributes: true, childList: true, characterData: true, subtree: true });
		waiters.add(attempt);
		SIGNALS.forEach((type) => document.addEventListener(type, attempt, true));
		tracks.forEach((track) => track.addEventListener('cuechange', attempt));
		onTestFinished(stop);
		attempt();
	});

function silentWav(seconds: number): string {
	const rate = 8000;
	const samples = rate * seconds;
	const view = new DataView(new ArrayBuffer(44 + samples * 2));
	const text = (offset: number, value: string) =>
		[...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
	text(0, 'RIFF');
	view.setUint32(4, 36 + samples * 2, true);
	text(8, 'WAVEfmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, rate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	text(36, 'data');
	view.setUint32(40, samples * 2, true);
	return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
}

const CUES = [
	{ start: 0, end: 2, text: 'Hello' },
	{ start: 2, end: 4, text: 'World' },
];
const EN: CaptionTrackSource = { language: 'en', label: 'English', cues: CUES };
const IT: CaptionTrackSource = { language: 'it', label: 'Italiano', cues: [{ start: 0, end: 2, text: 'Ciao' }] };
const VTT = `WEBVTT\n\n00:00.000 --> 00:02.000\nFrom vtt\n`;

const controllers: CaptionsController[] = [];

function video(): HTMLVideoElement {
	const element = document.createElement('video');
	element.src = silentWav(4);
	element.style.cssText = 'width:200px;height:100px;display:block';
	element.muted = true;
	document.body.append(element);
	return element;
}

function make(config: ConstructorParameters<typeof CaptionsController>[0]): CaptionsController {
	const notify = () => [...waiters].forEach((waiter) => waiter());
	const controller = new CaptionsController({
		...config,
		onState: (state) => {
			config.onState?.(state);
			notify();
		},
		onError: (error, track) => {
			config.onError?.(error, track);
			notify();
		},
	});
	controllers.push(controller);
	return controller;
}

async function loaded(media: HTMLVideoElement): Promise<void> {
	await settle(() => media.readyState >= 1);
}

async function seek(media: HTMLVideoElement, time: number): Promise<void> {
	media.currentTime = time;
	await settle(() => !media.seeking && Math.abs(media.currentTime - time) < 0.05);
	await frames();
}

const modes = (media: HTMLMediaElement) => [...media.textTracks].map((track) => track.mode);

afterEach(async () => {
	controllers.splice(0).forEach((controller) => controller.destroy());
	await Promise.resolve();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe('CaptionsController tracks', () => {
	it('shows a cues track natively and hides it again', async () => {
		const media = video();
		const captions = make({ getMedia: () => media, tracks: [EN] });
		captions.attach();
		expect(modes(media)).toEqual(['disabled']);

		captions.enable();
		expect(media.textTracks[0].mode).toBe('showing');
		expect(media.textTracks[0].cues).toHaveLength(2);
		expect(captions.getState()).toMatchObject({ enabled: true, language: 'en' });

		captions.disable();
		expect(media.textTracks[0].mode).toBe('disabled');
		expect(captions.getState()).toMatchObject({ enabled: false, language: null });
	});

	it('toggles and reports the same state', () => {
		const media = video();
		const captions = make({ getMedia: () => media, tracks: [EN] });
		captions.attach();
		captions.toggle();
		expect(captions.getState().enabled).toBe(true);
		captions.toggle();
		expect(captions.getState().enabled).toBe(false);
	});

	it('parses a vtt string through a blob track element', async () => {
		const media = video();
		const captions = make({ getMedia: () => media, tracks: [{ language: 'en', label: 'English', vtt: VTT }] });
		captions.attach();
		const element = media.querySelector('track')!;
		expect(element.src.startsWith('blob:')).toBe(true);
		expect(captions.getState().tracks[0].status).toBe('loading');

		await settle(() => captions.getState().tracks[0].status === 'ready');
		captions.enable();
		expect(element.track.mode).toBe('showing');
		expect([...element.track.cues!].map((cue) => (cue as VTTCue).text)).toEqual(['From vtt']);
	});

	it('fetches a src as vtt text whatever its extension, and reports a failed fetch as an error', async () => {
		const body = vi.fn(() => Promise.resolve(new Response(VTT, { status: 200 })));
		vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
			String(input).includes('missing') ? Promise.resolve(new Response('', { status: 404 })) : body(),
		);
		const media = video();
		const onError = vi.fn();
		const captions = make({
			getMedia: () => media,
			onError,
			tracks: [
				{ language: 'en', label: 'English', src: '/captions.txt' },
				{ language: 'it', label: 'Italiano', src: '/missing' },
			],
		});
		captions.attach();
		await settle(() => captions.getState().tracks.every((track) => track.status !== 'loading'));

		expect(captions.getState().tracks.map((track) => track.status)).toEqual(['ready', 'error']);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0][1]).toMatchObject({ language: 'it', status: 'error' });
		expect(media.querySelectorAll('track')).toHaveLength(1);
	});

	it('reports a network failure as an error and never throws', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
		const media = video();
		const onError = vi.fn();
		const captions = make({
			getMedia: () => media,
			onError,
			tracks: [{ language: 'en', label: 'English', src: '/x' }],
		});
		captions.attach();
		await settle(() => onError.mock.calls.length > 0);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(captions.getState().tracks[0].status).toBe('error');
	});

	it('reports a vtt the browser cannot parse as an error', async () => {
		const media = video();
		const onError = vi.fn();
		const captions = make({
			getMedia: () => media,
			onError,
			tracks: [{ language: 'en', label: 'English', vtt: 'not webvtt' }],
		});
		captions.attach();
		await settle(() => onError.mock.calls.length > 0);
		expect(captions.getState().tracks[0].status).toBe('error');
	});

	it('leaves tracks it did not create alone, and adopts them with adoptExisting', async () => {
		const media = video();
		const own = document.createElement('track');
		own.kind = 'captions';
		own.srclang = 'fr';
		own.label = 'Francais';
		own.src = URL.createObjectURL(new Blob([VTT], { type: 'text/vtt' }));
		media.append(own);
		own.track.mode = 'showing';

		const plain = make({ getMedia: () => media, tracks: [EN] });
		plain.attach();
		plain.enable();
		expect(own.track.mode).toBe('showing');
		plain.destroy();
		await Promise.resolve();

		const adopting = make({ getMedia: () => media, tracks: [EN], adoptExisting: true });
		adopting.attach();
		expect(own.track.mode).toBe('hidden');
		expect(adopting.getState().tracks.map((track) => track.language)).toEqual(['en', 'fr']);
		await settle(() => adopting.getState().tracks[1].status === 'ready');

		adopting.enable('fr');
		expect(own.track.mode).toBe('showing');
		expect(adopting.getState().language).toBe('fr');

		adopting.destroy();
		await Promise.resolve();
		expect(own.isConnected).toBe(true);
		expect(own.track.mode).toBe('showing');
	});

	it('lets only the first of two adopting controllers claim a track', async () => {
		const media = video();
		const own = document.createElement('track');
		own.kind = 'captions';
		own.srclang = 'fr';
		own.label = 'Francais';
		own.src = URL.createObjectURL(new Blob([VTT], { type: 'text/vtt' }));
		media.append(own);

		const first = make({ getMedia: () => media, adoptExisting: true });
		const second = make({ getMedia: () => media, adoptExisting: true });
		first.attach();
		second.attach();
		expect(first.getState().tracks.map((track) => track.language)).toEqual(['fr']);
		expect(second.getState().tracks).toEqual([]);

		first.enable();
		second.enable();
		expect(own.track.mode).toBe('showing');
		expect(second.getState().enabled).toBe(false);
	});

	it('keeps exactly one track active while the language changes, by id or language tag', () => {
		const media = video();
		const captions = make({
			getMedia: () => media,
			tracks: [EN, IT, { ...IT, language: 'pt-BR', label: 'Portugues', id: 'br' }],
		});
		captions.attach();
		captions.enable('it');
		expect(modes(media)).toEqual(['disabled', 'showing', 'disabled']);
		captions.setLanguage('br');
		expect(modes(media)).toEqual(['disabled', 'disabled', 'showing']);
		captions.setLanguage('pt');
		expect(captions.getState().language).toBe('pt-BR');
		captions.setLanguage('en');
		expect(modes(media)).toEqual(['showing', 'disabled', 'disabled']);
		expect(captions.setLanguage('zz')).toBe(false);
		expect(captions.enable('zz')).toBe(false);
		expect(captions.getState().language).toBe('en');
	});

	it('remembers a language chosen while off for the next enable', () => {
		const media = video();
		const captions = make({ getMedia: () => media, tracks: [EN, IT] });
		captions.attach();
		captions.setLanguage('it');
		expect(modes(media)).toEqual(['disabled', 'disabled']);
		captions.enable();
		expect(modes(media)).toEqual(['disabled', 'showing']);
	});

	it('reads getTracks again on refresh, adding, removing and replacing tracks', async () => {
		const media = video();
		let list: CaptionTrackSource[] = [EN];
		const captions = make({ getMedia: () => media, getTracks: () => list });
		captions.attach();
		captions.enable('en');

		list = [EN, { language: 'it', label: 'Italiano', vtt: VTT }];
		captions.refresh();
		expect(captions.getState().tracks.map((track) => track.id)).toEqual(['en-captions', 'it-captions']);
		expect(media.querySelectorAll('track')).toHaveLength(1);

		list = [{ ...EN, cues: [{ start: 0, end: 1, text: 'New' }] }];
		captions.refresh();
		expect(media.querySelectorAll('track')).toHaveLength(0);
		expect(captions.getState().language).toBe('en');
		expect([...media.textTracks].find((track) => track.mode === 'showing')!.cues).toHaveLength(1);
	});
});

describe('CaptionsController without a media element yet', () => {
	it('attaches without throwing and reports no tracks', () => {
		const onState = vi.fn();
		const captions = make({ getMedia: () => null, tracks: [EN], onState });
		expect(() => captions.attach()).not.toThrow();
		expect(captions.getState()).toMatchObject({ enabled: false, tracks: [] });
		expect(captions.enable()).toBe(false);
		expect(() => captions.refresh()).not.toThrow();
	});

	it('picks the element up on a later refresh and attach', () => {
		let media: HTMLVideoElement | null = null;
		const captions = make({ getMedia: () => media, tracks: [EN] });
		captions.attach();
		media = video();
		captions.refresh();
		expect(captions.getState().tracks).toHaveLength(1);
		expect(captions.enable()).toBe(true);
		expect(media.textTracks[0].mode).toBe('showing');

		const other = make({ getMedia: () => media, tracks: [EN] });
		media = null;
		other.attach();
		media = video();
		other.attach();
		expect(other.getState().tracks).toHaveLength(1);
	});

	it('releases the tracks when the element goes away again', () => {
		let media: HTMLVideoElement | null = video();
		const element = media;
		const captions = make({ getMedia: () => media, tracks: [EN] });
		captions.attach();
		captions.enable();
		media = null;
		captions.refresh();
		expect(captions.getState().tracks).toEqual([]);
		expect(element.textTracks[0].mode).toBe('disabled');
	});
});

describe('CaptionsController placement', () => {
	function stage() {
		const wrapper = document.createElement('div');
		wrapper.style.cssText = 'position:relative;width:200px;height:100px';
		const media = video();
		media.style.cssText = 'position:absolute;inset:0;width:200px;height:100px';
		const bar = document.createElement('div');
		bar.style.cssText = 'position:absolute;left:0;right:0;bottom:0;height:20px';
		wrapper.append(media, bar);
		document.body.append(wrapper);
		return { media, bar };
	}

	const cueOf = (media: HTMLMediaElement) => [...media.textTracks][0].cues![0] as VTTCue;

	it('keeps native cues above the avoided element and follows its height', async () => {
		const { media, bar } = stage();
		const captions = make({ getMedia: () => media, getAvoid: () => bar, tracks: [EN] });
		captions.attach();
		captions.enable();
		await frames();
		expect(cueOf(media)).toMatchObject({ snapToLines: false, lineAlign: 'end' });
		expect(cueOf(media).line).toBeCloseTo(80, 0);

		bar.style.height = '50px';
		await frames();
		expect(cueOf(media).line).toBeCloseTo(50, 0);
	});

	it('places the cues of a parsed vtt track too', async () => {
		const { media, bar } = stage();
		const captions = make({
			getMedia: () => media,
			getAvoid: () => bar,
			tracks: [{ language: 'en', label: 'English', vtt: VTT }],
		});
		captions.attach();
		captions.enable();
		await settle(() => captions.getState().tracks[0].status === 'ready');
		await frames();
		expect(cueOf(media).line).toBeCloseTo(80, 0);
	});

	it('skips placement while the media has no height and places once it has', async () => {
		const { media, bar } = stage();
		media.style.display = 'none';
		const captions = make({ getMedia: () => media, getAvoid: () => bar, tracks: [EN] });
		captions.attach();
		captions.enable();
		await frames();
		expect(cueOf(media).line).toBe(64);

		media.style.display = 'block';
		await frames();
		expect(cueOf(media).line).toBeCloseTo(80, 0);
	});

	it('does not touch the line without getAvoid', () => {
		const { media } = stage();
		const captions = make({ getMedia: () => media, tracks: [EN] });
		captions.attach();
		captions.enable();
		expect(cueOf(media).snapToLines).toBe(true);
	});

	it('stops observing on destroy', async () => {
		const { media, bar } = stage();
		const getAvoid = vi.fn(() => bar);
		const captions = make({ getMedia: () => media, getAvoid, tracks: [EN] });
		captions.attach();
		await frames();
		captions.destroy();
		await Promise.resolve();
		const calls = getAvoid.mock.calls.length;
		bar.style.height = '60px';
		media.style.height = '90px';
		await frames();
		expect(getAvoid).toHaveBeenCalledTimes(calls);
	});
});

describe('CaptionsController overlay', () => {
	function overlayed(tracks: CaptionTrackSource[] = [EN]) {
		const media = video();
		const overlay = document.createElement('div');
		document.body.append(overlay);
		const onState = vi.fn();
		const captions = make({ getMedia: () => media, getOverlay: () => overlay, render: 'overlay', tracks, onState });
		return { media, overlay, onState, captions };
	}

	it('writes the active cue into the overlay, keeps the track hidden and clears it', async () => {
		const { media, overlay, captions } = overlayed();
		await loaded(media);
		captions.attach();
		captions.enable();
		expect(media.textTracks[0].mode).toBe('hidden');

		await seek(media, 0.5);
		await settle(() => overlay.textContent === 'Hello');
		expect(overlay.textContent).toBe('Hello');

		await seek(media, 3);
		await settle(() => overlay.textContent === 'World');
		expect(overlay.textContent).toBe('World');

		captions.disable();
		expect(overlay.textContent).toBe('');
	});

	it('clears the overlay when no cue is active', async () => {
		const { media, overlay, captions } = overlayed([{ language: 'en', label: 'English', cues: [CUES[0]] }]);
		await loaded(media);
		captions.attach();
		captions.enable();
		await seek(media, 0.5);
		await settle(() => overlay.textContent === 'Hello');
		await seek(media, 3.5);
		await settle(() => overlay.textContent === '');
		expect(overlay.textContent).toBe('');
	});

	it('never inserts cue text as markup', async () => {
		const { media, overlay, captions } = overlayed([
			{
				language: 'en',
				label: 'English',
				cues: [{ start: 0, end: 2, text: 'Hi <img src=x onerror=alert(1)> there' }],
			},
		]);
		await loaded(media);
		captions.attach();
		captions.enable();
		await seek(media, 0.5);
		await settle(() => overlay.textContent !== '');
		expect(overlay.querySelector('img')).toBeNull();
		expect(overlay.children).toHaveLength(0);
		expect(overlay.textContent).toBe('Hi  there');
	});

	it('drops WebVTT markup and shows plain text', async () => {
		const { media, overlay, captions } = overlayed([
			{ language: 'en', label: 'English', cues: [{ start: 0, end: 2, text: '<i>Hello</i> <v Speaker>World' }] },
		]);
		await loaded(media);
		captions.attach();
		captions.enable();
		await seek(media, 0.5);
		await settle(() => overlay.textContent !== '');
		expect(overlay.textContent).toBe('Hello World');
		expect(overlay.children).toHaveLength(0);
	});

	it('calls onState on cue changes in overlay mode', async () => {
		const { media, onState, captions } = overlayed();
		await loaded(media);
		captions.attach();
		captions.enable();
		const before = onState.mock.calls.length;
		await seek(media, 0.5);
		await settle(() => onState.mock.calls.length > before);
		expect(onState.mock.calls.at(-1)![0].activeText).toBe('Hello');
	});

	it('clears the overlay on destroy', async () => {
		const { media, overlay, captions } = overlayed();
		await loaded(media);
		captions.attach();
		captions.enable();
		await seek(media, 0.5);
		await settle(() => overlay.textContent === 'Hello');

		captions.destroy();
		await Promise.resolve();
		expect(overlay.textContent).toBe('');
	});
});

describe('CaptionsController state', () => {
	it('calls onState once on attach and only when something changes', async () => {
		const media = video();
		const onState = vi.fn();
		const captions = make({ getMedia: () => media, tracks: [EN, IT], onState });
		captions.attach();
		expect(onState).toHaveBeenCalledTimes(1);
		expect(onState.mock.calls[0][0]).toMatchObject({ enabled: false, language: null });

		captions.enable('en');
		expect(onState).toHaveBeenCalledTimes(2);
		captions.enable('en');
		captions.setLanguage('en');
		captions.refresh();
		expect(onState).toHaveBeenCalledTimes(2);

		captions.setLanguage('it');
		expect(onState).toHaveBeenCalledTimes(3);
		captions.disable();
		captions.disable();
		expect(onState).toHaveBeenCalledTimes(4);

		await seek(media, 1);
		expect(onState).toHaveBeenCalledTimes(4);
		expect(onState.mock.calls.at(-1)![0]).toMatchObject({ enabled: false, language: null });
	});

	it('does not call onState per cue in native mode', async () => {
		const media = video();
		await loaded(media);
		const onState = vi.fn();
		const captions = make({ getMedia: () => media, tracks: [EN], onState });
		captions.attach();
		captions.enable();
		const calls = onState.mock.calls.length;
		await seek(media, 0.5);
		await seek(media, 3);
		expect(onState).toHaveBeenCalledTimes(calls);
	});

	it('reports a track as loading, then ready, in the state passed to onState', async () => {
		const media = video();
		const statuses: string[] = [];
		const captions = make({
			getMedia: () => media,
			tracks: [{ language: 'en', label: 'English', vtt: VTT }],
			onState: (state) => statuses.push(state.tracks[0].status),
		});
		captions.attach();
		await settle(() => statuses.includes('ready'));
		expect(statuses).toEqual(['loading', 'ready']);
	});
});

describe('CaptionsController lifecycle', () => {
	it('removes added track elements and cues on destroy, and keeps adopted ones', async () => {
		const media = video();
		const captions = make({
			getMedia: () => media,
			tracks: [EN, { language: 'it', label: 'Italiano', vtt: VTT }],
		});
		captions.attach();
		captions.enable('en');
		await settle(() => captions.getState().tracks[1].status === 'ready');
		const cueTrack = [...media.textTracks].find((track) => track.label === 'English')!;

		captions.destroy();
		expect(cueTrack.mode).toBe('showing');
		await Promise.resolve();
		expect(media.querySelectorAll('track')).toHaveLength(0);
		expect(cueTrack.mode).toBe('disabled');
		cueTrack.mode = 'hidden';
		expect(cueTrack.cues).toHaveLength(0);
		expect(captions.getState().tracks).toEqual([]);
	});

	it('reuses a released addTextTrack track instead of adding another', async () => {
		const media = video();
		const first = make({ getMedia: () => media, tracks: [EN] });
		first.attach();
		first.destroy();
		await Promise.resolve();
		expect(media.textTracks).toHaveLength(1);

		const second = make({ getMedia: () => media, tracks: [EN] });
		second.attach();
		second.enable();
		expect(media.textTracks).toHaveLength(1);
		expect(media.textTracks[0].cues).toHaveLength(2);
	});

	it('is safe to destroy while a fetch is in flight', async () => {
		let resolve!: (response: Response) => void;
		vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>((done) => (resolve = done)));
		const media = video();
		const onState = vi.fn();
		const onError = vi.fn();
		const captions = make({
			getMedia: () => media,
			onState,
			onError,
			tracks: [{ language: 'en', label: 'English', src: '/x' }],
		});
		captions.attach();
		captions.destroy();
		await Promise.resolve();
		const calls = onState.mock.calls.length;

		resolve(new Response(VTT));
		await new Promise((done) => setTimeout(done, 50));
		expect(media.querySelectorAll('track')).toHaveLength(0);
		expect(onState).toHaveBeenCalledTimes(calls);
		expect(onError).not.toHaveBeenCalled();
	});

	it('does not report an aborted fetch as an error', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			(_input, init) =>
				new Promise((_, reject) => {
					init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
				}),
		);
		const media = video();
		const onError = vi.fn();
		const captions = make({
			getMedia: () => media,
			onError,
			tracks: [{ language: 'en', label: 'English', src: '/x' }],
		});
		captions.attach();
		captions.destroy();
		await new Promise((done) => setTimeout(done, 30));
		expect(onError).not.toHaveBeenCalled();
	});

	it('lets two controllers share an element without touching each other tracks', async () => {
		const media = video();
		const a = make({ getMedia: () => media, tracks: [EN] });
		const b = make({ getMedia: () => media, tracks: [{ ...EN, label: 'English B' }, IT] });
		a.attach();
		b.attach();
		a.enable('en');
		b.enable('it');
		const byLabel = (label: string) => [...media.textTracks].find((track) => track.label === label)!;
		expect(byLabel('English').mode).toBe('showing');
		expect(byLabel('Italiano').mode).toBe('showing');
		expect(byLabel('English B').mode).toBe('disabled');

		a.disable();
		expect(byLabel('English').mode).toBe('disabled');
		expect(byLabel('Italiano').mode).toBe('showing');

		a.destroy();
		await Promise.resolve();
		expect(byLabel('Italiano').mode).toBe('showing');
		expect(b.getState().language).toBe('it');
	});

	it('keeps tracks and selection when the host disconnects and connects again in one task', async () => {
		const media = video();
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};
		const captions = createCaptionsController(host, {
			getMedia: () => media,
			tracks: [EN, { language: 'it', label: 'Italiano', vtt: VTT }],
		});
		controllers.push(captions);
		connected[0]();
		captions.enable('it');
		await settle(() => captions.getState().tracks[1].status === 'ready');
		const element = media.querySelector('track')!;

		cleanup[0]();
		connected[0]();
		await Promise.resolve();

		expect(media.querySelector('track')).toBe(element);
		expect(media.textTracks).toHaveLength(2);
		expect(captions.getState().language).toBe('it');
		expect(element.track.mode).toBe('showing');
	});

	it('keeps a vtt track working when the media element moves to another parent', async () => {
		const media = video();
		const target = document.createElement('section');
		document.body.append(target);
		const captions = make({ getMedia: () => media, tracks: [{ language: 'en', label: 'English', vtt: VTT }] });
		captions.attach();
		captions.enable();
		await settle(() => captions.getState().tracks[0].status === 'ready');

		captions.destroy();
		target.append(media);
		captions.attach();
		await Promise.resolve();

		expect(media.querySelectorAll('track')).toHaveLength(1);
		expect(media.textTracks[0].mode).toBe('showing');
		expect(captions.getState().tracks[0].status).toBe('ready');
	});

	it('restarts a fetch that destroy aborted when attached again at once', async () => {
		const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
			return new Promise((resolve, reject) => {
				init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
				setTimeout(() => resolve(new Response(VTT)), 20);
			});
		});
		const media = video();
		const captions = make({ getMedia: () => media, tracks: [{ language: 'en', label: 'English', src: '/x' }] });
		captions.attach();
		captions.destroy();
		captions.attach();
		await settle(() => captions.getState().tracks[0].status === 'ready');
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(media.querySelectorAll('track')).toHaveLength(1);
	});

	it('tolerates repeated attach and destroy', async () => {
		const media = video();
		const captions = make({ getMedia: () => media, tracks: [EN] });
		captions.attach();
		captions.attach();
		expect(media.textTracks).toHaveLength(1);
		captions.destroy();
		captions.destroy();
		await Promise.resolve();
		expect(() => captions.refresh()).not.toThrow();
	});
});
