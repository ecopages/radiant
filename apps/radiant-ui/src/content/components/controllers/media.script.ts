import { MediaController, type MediaState } from '@ecopages/radiant-ui/controllers';
import { formatMediaTime } from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';

const RATES = [1, 1.5, 2];

function toneUrl(seconds: number): string {
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
	for (let index = 0; index < samples; index++) {
		view.setInt16(44 + index * 2, Math.sin((2 * Math.PI * 440 * index) / rate) * 4000, true);
	}
	return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
}

export function mount(root: HTMLElement): () => void {
	const audio = root.querySelector('audio')!;
	const play = root.querySelector<HTMLButtonElement>('[data-action="play"]')!;
	const back = root.querySelector<HTMLButtonElement>('[data-action="back"]')!;
	const forward = root.querySelector<HTMLButtonElement>('[data-action="forward"]')!;
	const mute = root.querySelector<HTMLButtonElement>('[data-action="mute"]')!;
	const rate = root.querySelector<HTMLButtonElement>('[data-action="rate"]')!;
	const seek = root.querySelector<HTMLInputElement>('input[type="range"]')!;
	const status = root.querySelector('[data-status]')!;
	const url = toneUrl(4);

	const renderProgress = (state: MediaState) => {
		const hours = state.duration >= 3600;
		const position = formatMediaTime(state.position, { hours });
		const duration = formatMediaTime(state.duration, { hours });
		seek.max = String(Number.isFinite(state.duration) ? state.duration : 0);
		seek.value = String(state.position);
		seek.setAttribute('aria-valuetext', `${position} of ${duration}`);
		status.textContent = state.error
			? `error: ${state.error.message || 'the media failed'}`
			: `${state.status}, ${position} of ${duration}, buffered to ${formatMediaTime(state.buffered)}`;
	};

	const renderState = (state: MediaState) => {
		play.setAttribute('aria-pressed', String(!audio.paused));
		mute.setAttribute('aria-pressed', String(state.muted));
		rate.textContent = `${state.rate}x`;
		seek.disabled = !state.seekable;
		back.disabled = !state.seekable;
		forward.disabled = !state.seekable;
		renderProgress(state);
	};

	const media = new MediaController({
		getMedia: () => audio,
		onState: renderState,
		onProgress: renderProgress,
	});
	media.attach();
	media.setLoop(true);
	void media.load(url);

	play.addEventListener('click', () => void media.toggle());
	back.addEventListener('click', () => media.skip(-1));
	forward.addEventListener('click', () => media.skip(1));
	mute.addEventListener('click', () => media.toggleMuted());
	rate.addEventListener('click', () =>
		media.setRate(RATES[(RATES.indexOf(media.getState().rate) + 1) % RATES.length]!),
	);
	seek.addEventListener('input', () => media.scrub(Number(seek.value)));

	return () => {
		media.destroy();
		URL.revokeObjectURL(url);
	};
}

mountExample('media', mount);
