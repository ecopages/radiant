import { MediaRecorderController, type MediaRecorderSnapshot } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const record = root.querySelector<HTMLButtonElement>('[data-record]')!;
	const pause = root.querySelector<HTMLButtonElement>('[data-pause]')!;
	const stop = root.querySelector<HTMLButtonElement>('[data-stop]')!;
	const status = root.querySelector('[data-status]')!;
	const player = root.querySelector('audio')!;

	const labels: Record<MediaRecorderSnapshot['status'], string> = {
		idle: 'Ready',
		requesting: 'Waiting for the microphone',
		recording: 'Recording',
		paused: 'Paused',
		stopped: 'Recorded',
		denied: 'Microphone access was denied',
		unsupported: 'This browser cannot record',
		error: 'Recording failed',
	};

	const recorder = new MediaRecorderController({
		mimeTypes: ['audio/webm;codecs=opus', 'audio/mp4'],
		maxDuration: 30,
		onState: ({ status: next, duration }) => {
			status.textContent = `${labels[next]} ${duration.toFixed(1)} s`;
			record.disabled = next === 'requesting' || next === 'recording' || next === 'paused';
			pause.disabled = next !== 'recording' && next !== 'paused';
			pause.textContent = next === 'paused' ? 'Resume' : 'Pause';
			stop.disabled = pause.disabled;
		},
		onStop: ({ url }) => {
			player.src = url;
			player.hidden = false;
		},
	});
	recorder.attach();

	record.addEventListener('click', () => {
		player.hidden = true;
		player.removeAttribute('src');
		player.load();
		void recorder.start();
	});
	pause.addEventListener('click', () => {
		if (recorder.getState().status === 'paused') {
			recorder.resume();
		} else {
			recorder.pause();
		}
	});
	stop.addEventListener('click', () => void recorder.stop());
	return () => recorder.destroy();
}

mountExample('media-recorder', mount);
