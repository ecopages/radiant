import { attr, bindTo, controller, onEvent, query, RadiantController, state } from '@/utils/radiant-browser-runtime';
import { ensureDocsControllersStarted } from '@/utils/start-docs-controllers';

@controller('controller-dom-flow-visualizer')
export class ControllerDomFlowVisualizer extends RadiantController {
	@bindTo([
		{ ref: 'host-signal', text: true },
		{ ref: 'state-signal', text: true },
		{ attr: 'data-signal' },
		{ ref: 'host-busy', text: true, map: (signal) => (signal === 'alert' ? 'true' : 'false') },
		{ bool: 'aria-busy', map: (signal) => signal === 'alert' },
	])
	@attr({ source: 'data-signal' })
	signal = 'ready';

	@bindTo({ ref: 'state-pulses', text: true })
	@state
	pulses = 0;

	@bindTo({ ref: 'state-last-action', text: true })
	@state
	lastAction = 'Hydrated from host attribute';

	@bindTo({ ref: 'event-action', text: true })
	@state
	lastEvent = 'initial hydrate';

	@bindTo({ ref: 'query-count', text: true })
	@state
	refCount = 0;

	@bindTo({ ref: 'flow-title', text: true })
	@state
	flowTitleText = '';

	@bindTo({ ref: 'flow-description', text: true })
	@state
	flowDescriptionText = '';

	@query({ selector: '[data-ref]', all: true }) refs!: HTMLElement[];

	override connect(): void {
		super.connect();
		this.syncQueryNode();
		this.setTransmission(
			'Initial hydrate',
			'The host attribute seeded controller state and @bindTo painted the authored nodes.',
		);
	}

	@onEvent({ selector: 'input[type="radio"]', type: 'change' })
	handleSignalChoice(event: Event) {
		const nextSignal = (event.target as HTMLInputElement).value;
		if (!nextSignal) return;

		this.lastEvent = `change:${nextSignal}`;
		this.signal = nextSignal;
		this.pulses += 1;
		this.lastAction = `Host attribute changed to data-signal="${nextSignal}"`;
		this.setTransmission(
			'Signal rerouted',
			`The ${nextSignal} action updated the host attribute and @bindTo refreshed the authored nodes.`,
		);
	}

	@onEvent({ ref: 'ping', type: 'click' })
	handlePing() {
		this.lastEvent = 'click:ping';
		this.pulses += 1;
		this.lastAction = `Resolved ${this.refs.length} refs and refreshed DOM wiring.`;
		this.syncQueryNode();
		this.setTransmission('Ref pulse', 'The controller re-read its stable refs. Field copies stay on @bindTo.');
	}

	private syncQueryNode() {
		this.refCount = this.refs.length;
	}

	private setTransmission(title: string, description: string) {
		this.flowTitleText = title;
		this.flowDescriptionText = description;
	}
}

ensureDocsControllersStarted();
