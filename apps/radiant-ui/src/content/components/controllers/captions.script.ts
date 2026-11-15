import { CaptionsController, type CaptionsState } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

const TRACKS = [
	{
		language: 'en',
		label: 'English',
		cues: [
			{ start: 0, end: 2.5, text: 'Captions are a track of cues' },
			{ start: 3, end: 5.5, text: 'They stay above the controls' },
		],
	},
	{
		language: 'it',
		label: 'Italiano',
		cues: [
			{ start: 0, end: 2.5, text: 'I sottotitoli sono una traccia di cue' },
			{ start: 3, end: 5.5, text: 'Restano sopra i controlli' },
		],
	},
];

function silentUrl(seconds: number): string {
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

export function mount(root: HTMLElement): () => void {
	const video = root.querySelector('video')!;
	const controls = root.querySelector<HTMLElement>('[data-controls]')!;
	const play = root.querySelector<HTMLButtonElement>('[data-action="play"]')!;
	const toggle = root.querySelector<HTMLButtonElement>('[data-action="captions"]')!;
	const language = root.querySelector<HTMLButtonElement>('[data-action="language"]')!;
	const status = root.querySelector('[data-status]')!;
	const url = silentUrl(6);
	video.src = url;

	const captions = new CaptionsController({
		getMedia: () => video,
		getAvoid: () => controls,
		tracks: TRACKS,
		onState: (state: CaptionsState) => {
			toggle.setAttribute('aria-pressed', String(state.enabled));
			status.textContent = state.enabled ? `Captions on: ${state.language}` : 'Captions off';
		},
	});
	captions.attach();

	const onKey = (event: KeyboardEvent) => {
		if (event.key === 'c' && !event.ctrlKey && !event.altKey && !event.metaKey) {
			captions.toggle();
		}
	};

	play.addEventListener('click', () => (video.paused ? void video.play() : video.pause()));
	toggle.addEventListener('click', () => captions.toggle());
	language.addEventListener('click', () => {
		const next = captions.getState().tracks.find((track) => track.language !== language.dataset.language)!;
		captions.setLanguage(next.id);
		language.dataset.language = next.language;
		language.textContent = next.label;
	});
	root.addEventListener('keydown', onKey);

	return () => {
		root.removeEventListener('keydown', onKey);
		captions.destroy();
		URL.revokeObjectURL(url);
	};
}

mountExample('captions', mount);
