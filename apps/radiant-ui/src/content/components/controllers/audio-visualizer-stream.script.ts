import { AudioVisualizerController, bars } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

/**
 * A stream that needs no microphone: a sawtooth whose low-pass filter sweeps up and down, rendered into a
 * `MediaStreamAudioDestinationNode`. It is connected to nothing else, so it makes no sound.
 */
function createGeneratedStream(context: AudioContext): { stream: MediaStream; stop: () => void } {
	const destination = context.createMediaStreamDestination();
	const oscillator = context.createOscillator();
	oscillator.type = 'sawtooth';
	oscillator.frequency.value = 110;
	const filter = context.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.value = 1200;
	const sweep = context.createOscillator();
	sweep.frequency.value = 0.5;
	const depth = context.createGain();
	depth.gain.value = 1000;
	sweep.connect(depth).connect(filter.frequency);
	oscillator.connect(filter).connect(destination);
	oscillator.start();
	sweep.start();
	return {
		stream: destination.stream,
		stop: () => {
			oscillator.stop();
			sweep.stop();
		},
	};
}

export function mount(root: HTMLElement): () => void {
	const toggle = root.querySelector<HTMLButtonElement>('[data-stream]')!;
	const visual = root.querySelector<HTMLElement>('[data-visual]')!;
	const context = new AudioContext();
	let generated: ReturnType<typeof createGeneratedStream> | null = null;

	const visualizer = new AudioVisualizerController({
		getStream: () => generated?.stream ?? null,
		getTarget: () => visual,
		preset: bars({ mode: 'canvas', count: 32, segments: 8, peaks: {}, idle: 'floor' }),
	});
	visualizer.attach();

	toggle.addEventListener('click', () => {
		if (generated) {
			generated.stop();
			generated = null;
		} else {
			void context.resume();
			generated = createGeneratedStream(context);
		}
		toggle.textContent = generated ? 'Stop the stream' : 'Start the stream';
		toggle.setAttribute('aria-pressed', String(generated !== null));
		visualizer.refresh();
		visualizer.resume();
	});

	return () => {
		visualizer.destroy();
		generated?.stop();
		generated = null;
		toggle.textContent = 'Start the stream';
		toggle.setAttribute('aria-pressed', 'false');
		void context.close();
	};
}

mountExample('audio-visualizer-stream', mount);
