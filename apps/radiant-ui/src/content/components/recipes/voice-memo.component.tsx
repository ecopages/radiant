import { RadiantElement, customElement, onEvent, query, state } from '@ecopages/radiant';
import { createMediaRecorderController } from '@ecopages/radiant-ui/controllers';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { MeterContext, createRecorderConfig, showResult, viewOf, type VoiceMemoView } from './voice-memo.data';

/**
 * @remarks
 * The view of the recorder is one `@state`, and `render()` draws the four buttons, the clock, the meter and the
 * status from it. The loudness changes about ten times a second, so it is written to the meter by hand instead of
 * redrawing the controls. The player and the download link are not state: their `src` and `href` are the recorder's
 * object URL, which the recorder revokes on the next `start()`, so they are written and cleared by hand around it.
 */
@customElement('voice-memo-app')
export class VoiceMemoApp extends RadiantElement {
	@state view: VoiceMemoView = viewOf({ status: 'idle', duration: 0, mimeType: null, level: 0, error: null });

	@query('[data-meter]') private meterNode!: HTMLElement;

	private readonly meter = new MeterContext();

	private readonly recorder = createMediaRecorderController(
		this,
		createRecorderConfig(this.meter, {
			onState: (snapshot) => this.show(viewOf(snapshot)),
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

	private shown = '';

	private show(view: VoiceMemoView): void {
		this.meterNode?.style.setProperty('--level', view.level.toFixed(2));
		const key = JSON.stringify({ ...view, level: 0 });
		if (key !== this.shown) {
			this.shown = key;
			this.view = view;
		}
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

	override render() {
		const { view } = this;
		return (
			<>
				<div data-meter aria-hidden="true" data-state={view.state}>
					<span></span>
				</div>
				<output data-elapsed>{view.elapsed}</output>
				<div data-controls>
					<RuiButton size="lg" square data-record aria-label="Record" disabled={!view.record}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<circle cx="12" cy="12" r="6" fill="currentColor" />
						</svg>
					</RuiButton>
					<RuiButton
						variant="ghost"
						square
						data-pause
						data-paused={view.paused ? '' : undefined}
						aria-label={view.paused ? 'Resume' : 'Pause'}
						disabled={!view.pause}
					>
						<svg
							viewBox="0 0 24 24"
							width="16"
							height="16"
							aria-hidden="true"
							focusable="false"
							data-icon="pause"
						>
							<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" />
						</svg>
						<svg
							viewBox="0 0 24 24"
							width="16"
							height="16"
							aria-hidden="true"
							focusable="false"
							data-icon="resume"
						>
							<path d="M8 5v14l10-7z" fill="currentColor" />
						</svg>
					</RuiButton>
					<RuiButton variant="ghost" square data-stop aria-label="Stop" disabled={!view.stop}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path d="M7 7h10v10H7z" fill="currentColor" />
						</svg>
					</RuiButton>
					<RuiButton variant="ghost" square data-discard aria-label="Discard" disabled={!view.discard}>
						<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
							<path
								d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</RuiButton>
				</div>
				<div data-result hidden={!view.result}>
					<audio data-player controls preload="auto"></audio>
					<a class="rui-button rui-button--outline rui-button--sm" data-download download="voice-memo.webm">
						Download
					</a>
				</div>
				<p data-status aria-live="polite" data-state={view.state}>
					{view.status}
				</p>
			</>
		);
	}
}
