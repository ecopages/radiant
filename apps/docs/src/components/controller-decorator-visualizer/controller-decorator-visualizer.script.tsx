import { attr, controller, onEvent, onUpdated, query, RadiantController, state } from '@/utils/radiant-browser-runtime';
import '@ecopages/radiant-ui/radio-group';
import type { RuiRadioGroupChangeDetail, RuiRadioGroupElement } from '@ecopages/radiant-ui/radio-group';
import { ensureDocsControllersStarted } from '@/utils/start-docs-controllers';

@controller('controller-dom-flow-visualizer')
export class ControllerDomFlowVisualizer extends RadiantController {
	@attr({ source: 'data-signal' }) signal = 'ready';
	@state pulses = 0;
	@state lastAction = 'Hydrated from host attribute';
	@state lastEvent = 'initial hydrate';

	@query({ ref: 'host-signal' }) hostSignal!: HTMLElement;
	@query({ ref: 'host-busy' }) hostBusy!: HTMLElement;
	@query({ ref: 'event-action' }) eventAction!: HTMLElement;
	@query({ ref: 'query-count' }) queryCount!: HTMLElement;
	@query({ ref: 'state-signal' }) stateSignal!: HTMLElement;
	@query({ ref: 'state-pulses' }) statePulses!: HTMLElement;
	@query({ ref: 'state-last-action' }) stateLastAction!: HTMLElement;
	@query({ ref: 'flow-title' }) flowTitle!: HTMLElement;
	@query({ ref: 'flow-description' }) flowDescription!: HTMLElement;
	@query({ selector: 'rui-radio-group', cache: true }) signalPicker!: RuiRadioGroupElement;

	override connect(): void {
		super.connect();
		this.syncSignalNode();
		this.syncPulseNode();
		this.syncActionNode();
		this.syncEventNode();
		this.syncQueryNode();
		this.setTransmission(
			'Initial hydrate',
			'The host attribute seeded controller state and all queried nodes resolved on connect.',
		);
	}

	@onEvent({ selector: 'rui-radio-group', type: 'rui-change' })
	handleSignalChoice(event: Event) {
		const { value: nextSignal } = (event as CustomEvent<RuiRadioGroupChangeDetail>).detail;
		if (!nextSignal) return;

		this.lastEvent = `rui-change:${nextSignal}`;
		this.signal = nextSignal;
		this.pulses += 1;
		this.lastAction = `Host attribute changed to data-signal="${nextSignal}"`;
		this.setTransmission(
			'Signal rerouted',
			`The ${nextSignal} action updated the host attribute and refreshed queried nodes.`,
		);
	}

	@onEvent({ ref: 'ping', type: 'click' })
	handlePing() {
		this.lastEvent = 'click:ping';
		this.pulses += 1;
		this.lastAction = `Resolved ${this.host.querySelectorAll('[data-ref]').length} refs and refreshed DOM wiring.`;
		this.syncQueryNode();
		this.setTransmission('Ref pulse', 'The controller re-read its stable refs and wrote current state back out.');
	}

	@onUpdated('signal')
	syncSignalNode() {
		const busy = this.signal === 'alert' ? 'true' : 'false';

		this.hostSignal.textContent = this.signal;
		this.hostBusy.textContent = busy;
		this.stateSignal.textContent = this.signal;
		this.host.setAttribute('data-signal', this.signal);
		this.signalPicker.value = this.signal;

		if (busy === 'true') {
			this.host.setAttribute('aria-busy', 'true');
		} else {
			this.host.removeAttribute('aria-busy');
		}
	}

	@onUpdated('pulses')
	syncPulseNode() {
		this.statePulses.textContent = String(this.pulses);
	}

	@onUpdated('lastAction')
	syncActionNode() {
		this.stateLastAction.textContent = this.lastAction;
	}

	@onUpdated('lastEvent')
	syncEventNode() {
		this.eventAction.textContent = this.lastEvent;
	}

	private syncQueryNode() {
		this.queryCount.textContent = String(this.host.querySelectorAll('[data-ref]').length);
	}

	private setTransmission(title: string, description: string) {
		this.flowTitle.textContent = title;
		this.flowDescription.textContent = description;
	}
}

ensureDocsControllersStarted();
