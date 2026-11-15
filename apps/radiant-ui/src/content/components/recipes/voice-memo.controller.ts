import { RadiantController, controller, onEvent } from '@ecopages/radiant';
import { createMediaRecorderController } from '@ecopages/radiant-ui/controllers';
import { MeterContext, createRecorderConfig, paint, showResult, viewOf } from './voice-memo.data';

/**
 * @remarks
 * The element form's logic on a `RadiantController`, with `connect()` in place of `onConnected()`. `this.element` is the
 * host the markup carries `data-controller` on, and `createMediaRecorderController(this, ...)` takes the controller as
 * its host, so the recorder attaches when the registry connects it and is destroyed when it disconnects.
 */
@controller('voice-memo')
export class VoiceMemoController extends RadiantController {
	private get root(): HTMLElement {
		return this.element as HTMLElement;
	}

	private readonly meter = new MeterContext();

	private readonly recorder = createMediaRecorderController(
		this,
		createRecorderConfig(this.meter, {
			onState: (snapshot) => paint(this.root, viewOf(snapshot)),
			onStop: (result) => showResult(this.root, result),
		}),
	);

	constructor(host: Element) {
		super(host);
		this.registerCleanupCallback(() => {
			showResult(this.root, null);
			this.meter.close();
		});
	}

	override connect(): void {
		super.connect();
		paint(this.root, viewOf(this.recorder.getState()));
	}

	@onEvent({ selector: '[data-record]', type: 'click' })
	record(): void {
		showResult(this.root, null);
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
		showResult(this.root, null);
		this.recorder.discard();
	}
}
