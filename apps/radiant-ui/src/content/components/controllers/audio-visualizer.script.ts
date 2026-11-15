import { AudioVisualizerController, bars, wave } from '@ecopages/radiant-ui/controllers';
import { dots } from './audio-visualizer-dots';
import { mountExample } from '../../../components/primitive-example/mount-example';

function createToneUrl(): string {
	const sampleRate = 22050;
	const seconds = 2;
	const samples = sampleRate * seconds;
	const buffer = new ArrayBuffer(44 + samples * 2);
	const view = new DataView(buffer);
	const write = (offset: number, text: string) =>
		[...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
	write(0, 'RIFF');
	view.setUint32(4, 36 + samples * 2, true);
	write(8, 'WAVEfmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	write(36, 'data');
	view.setUint32(40, samples * 2, true);
	const partials = [
		[110, 0.5],
		[440, 0.3],
		[1760, 0.2],
	];
	for (let index = 0; index < samples; index++) {
		const time = index / sampleRate;
		const swell = 0.6 + 0.4 * Math.sin(Math.PI * time);
		const value = partials.reduce(
			(sum, [frequency, gain], partial) =>
				sum + gain * Math.sin(2 * Math.PI * frequency * time) * (partial === 0 ? 1 : swell),
			0,
		);
		view.setInt16(44 + index * 2, value * 6000, true);
	}
	return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

export function mount(root: HTMLElement): () => void {
	const audio = root.querySelector('audio')!;
	const play = root.querySelector<HTMLButtonElement>('[data-play]')!;
	const visual = root.querySelector<HTMLElement>('[data-visual]')!;
	const choices = [...root.querySelectorAll<HTMLButtonElement>('[data-preset]')];
	const presets = {
		'bars-dom': () => bars({ mode: 'dom', selector: 'span' }),
		'bars-canvas': () => bars({ mode: 'canvas', count: 32 }),
		wave: () => wave({ fill: true }),
		dots: () => dots(),
	};

	audio.src = createToneUrl();
	audio.loop = true;

	const visualizer = new AudioVisualizerController({
		getMedia: () => audio,
		getTarget: () => visual,
		preset: presets['bars-dom'](),
	});
	visualizer.attach();

	const sync = () => (play.textContent = audio.paused ? 'Play' : 'Pause');
	audio.addEventListener('play', sync);
	audio.addEventListener('pause', sync);
	play.addEventListener('click', () => {
		visualizer.resume();
		if (audio.paused) {
			void audio.play();
		} else {
			audio.pause();
		}
	});
	for (const choice of choices) {
		choice.addEventListener('click', () => {
			visualizer.setPreset(presets[choice.dataset.preset as keyof typeof presets]());
			choices.forEach((other) => other.setAttribute('aria-pressed', String(other === choice)));
		});
	}

	return () => {
		visualizer.destroy();
		audio.pause();
		URL.revokeObjectURL(audio.src);
	};
}

mountExample('audio-visualizer', mount);
