import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import { createMediaRecorderController } from '@ecopages/radiant-ui/controllers';
import { MeterContext, createRecorderConfig, paint, showResult, viewOf } from './voice-memo.data';

/**
 * @remarks
 * The authored markup is the element's content, and `paint` writes every state change onto it. The recorder is
 * created with the element as its host, so it attaches when the element connects and is destroyed, with its
 * tracks stopped and its result URL revoked, when it leaves. The meter's `AudioContext` is closed by the cleanup
 * registered once in the constructor, because one registered in `onConnected` would be added again on every move.
 */
@customElement('voice-memo-element')
export class VoiceMemoElement extends RadiantElement {
	@query({ selector: '[data-player]' }) private player!: HTMLAudioElement;

	private readonly meter = new MeterContext();

	private readonly recorder = createMediaRecorderController(
		this,
		createRecorderConfig(this.meter, {
			onState: (snapshot) => paint(this, viewOf(snapshot)),
			onStop: (result) => showResult(this, result),
		}),
	);

	constructor() {
		super();
		this.registerCleanupCallback(() => {
			showResult(this, null);
			this.meter.close();
		});
	}

	override onConnected(): void {
		paint(this, viewOf(this.recorder.getState()));
	}

	@onEvent({ selector: '[data-record]', type: 'click' })
	record(): void {
		showResult(this, null);
		void this.recorder.start();
	}

	@onEvent({ selector: '[data-pause]', type: 'click' })
	togglePause(): void {
		if (this.recorder.getState().status === 'paused') this.recorder.resume();
		else this.recorder.pause();
	}

	@onEvent({ selector: '[data-stop]', type: 'click' })
	stop(): void {
		void this.recorder.stop();
	}

	@onEvent({ selector: '[data-discard]', type: 'click' })
	discard(): void {
		showResult(this, null);
		this.recorder.discard();
	}
}
