import { MediaRecorderController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';
import { MeterContext, createRecorderConfig, paint, showResult, viewOf } from './voice-memo.data';

export function mount(root: HTMLElement): () => void {
	const part = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
	const meter = new MeterContext();
	const listeners = new AbortController();
	const { signal } = listeners;

	const recorder = new MediaRecorderController(
		createRecorderConfig(meter, {
			onState: (snapshot) => paint(root, viewOf(snapshot)),
			onStop: (result) => showResult(root, result),
		}),
	);

	const clearResult = () => showResult(root, null);

	part('[data-record]').addEventListener(
		'click',
		() => {
			clearResult();
			void recorder.start();
		},
		{ signal },
	);
	part('[data-pause]').addEventListener(
		'click',
		() => (recorder.getState().status === 'paused' ? recorder.resume() : recorder.pause()),
		{ signal },
	);
	part('[data-stop]').addEventListener('click', () => void recorder.stop(), { signal });
	part('[data-discard]').addEventListener(
		'click',
		() => {
			clearResult();
			recorder.discard();
		},
		{ signal },
	);

	recorder.attach();
	paint(root, viewOf(recorder.getState()));

	return () => {
		listeners.abort();
		clearResult();
		recorder.destroy();
		meter.close();
		paint(root, viewOf(recorder.getState()));
	};
}

mountExample('voice-memo', mount);
