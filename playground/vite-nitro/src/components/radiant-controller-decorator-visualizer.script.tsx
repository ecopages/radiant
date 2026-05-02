import { RadiantController, attr, controller, state } from '@ecopages/radiant';

export type DecoratorVisualizerState = {
	signal: string;
	pulses: number;
	lastAction: string;
	lastEvent: string;
	transmissionTitle: string;
	transmissionDescription: string;
	manualRefCount: number;
};

type DecoratorVisualizerHandlers = {
	onSignalChoice?: (signal: string) => void;
	onPing?: () => void;
};

export const INITIAL_DECORATOR_VISUALIZER_STATE: DecoratorVisualizerState = {
	signal: 'ready',
	pulses: 0,
	lastAction: 'Hydrated from the initial host attribute',
	lastEvent: 'initial hydrate',
	transmissionTitle: 'Initial hydrate',
	transmissionDescription: 'The controller rendered the authored host directly from its reactive fields.',
	manualRefCount: 0,
};

type DecoratorMetricProps = {
	label: string;
	value: string | number;
	valueClassName?: string;
};

type DecoratorStepProps = {
	step: string;
	title: string;
	description: string;
};

const DecoratorMetric = ({ label, value, valueClassName }: DecoratorMetricProps) => (
	<p>
		<span>{label}</span>
		<strong class={valueClassName}>{value}</strong>
	</p>
);

const DecoratorHeader = () => (
	<div class="controller-decorator-visualizer__header">
		<div class="controller-decorator-visualizer__intro">
			<p class="controller-decorator-visualizer__eyebrow">Controller-owned render</p>
			<h3>The controller renders the full JSX view into its authored host</h3>
			<p>
				This version drops the hardcoded host markup and lets the controller own the whole inner tree, including
				events, state reads, and the transmission summary.
			</p>
			<ul
				class="controller-decorator-visualizer__decorators"
				aria={{ label: 'Controller features used in this demo' }}
			>
				<li>@controller</li>
				<li>@attr</li>
				<li>@state</li>
				<li>render()</li>
			</ul>
		</div>
		<div class="controller-decorator-visualizer__snapshot">
			<p class="controller-decorator-visualizer__snapshot-label">Reading guide</p>
			<ul class="controller-decorator-visualizer__snapshot-list">
				<li>
					The host keeps only <code>data-controller</code> and the signal attribute.
				</li>
				<li>The controller reads its own fields directly inside JSX.</li>
				<li>
					No manual <code>data-ref</code> wiring is needed for updates.
				</li>
			</ul>
		</div>
	</div>
);

const DecoratorActions = ({ onSignalChoice, onPing }: DecoratorVisualizerHandlers) => {
	const bindSignalChoice = (signal: string) => (onSignalChoice ? () => onSignalChoice(signal) : undefined);
	const pingHandler = onPing ? () => onPing() : undefined;

	return (
		<div class="controller-decorator-visualizer__actions">
			<button type="button" class="button button--sm button--outline" on:click={bindSignalChoice('ready')}>
				Ready
			</button>
			<button type="button" class="button button--sm button--outline" on:click={bindSignalChoice('focus')}>
				Focus
			</button>
			<button type="button" class="button button--sm button--outline" on:click={bindSignalChoice('alert')}>
				Alert
			</button>
			<button type="button" class="button button--sm button--outline" on:click={pingHandler}>
				Ping render
			</button>
		</div>
	);
};

const DecoratorHostCard = ({ signal }: DecoratorVisualizerState) => (
	<article class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--host">
		<div class="controller-decorator-visualizer__card-head">
			<p class="controller-decorator-visualizer__card-id">N1</p>
			<p class="controller-decorator-visualizer__label">Authored host</p>
		</div>
		<h4>Root host attributes</h4>
		<p class="controller-decorator-visualizer__copy">
			The page only authors the host element. The controller owns everything inside it.
		</p>
		<div class="controller-decorator-visualizer__metric-grid">
			<DecoratorMetric
				label="data-signal"
				value={signal}
				valueClassName="controller-decorator-visualizer__host-signal"
			/>
			<DecoratorMetric
				label="aria-busy"
				value={signal === 'alert' ? 'true' : 'false'}
				valueClassName="controller-decorator-visualizer__host-busy"
			/>
		</div>
		<p class="controller-decorator-visualizer__connection-note">
			<b>Connects to N2</b> by seeding controller state from the host attribute.
		</p>
	</article>
);

const DecoratorCoreCard = () => (
	<div class="controller-decorator-visualizer__core">
		<div class="controller-decorator-visualizer__card-head">
			<p class="controller-decorator-visualizer__card-id">N2</p>
			<p class="controller-decorator-visualizer__label">Controller core</p>
		</div>
		<h4>controller-dom-flow-visualizer</h4>
		<p class="controller-decorator-visualizer__copy">
			A render-owning controller reads reactive fields directly and produces the full tree.
		</p>
		<p class="controller-decorator-visualizer__connection-note">
			<b>Connects N1 to N3, N4, and N5</b> by handling events and re-rendering from state.
		</p>
	</div>
);

const DecoratorEventCard = ({ lastEvent }: DecoratorVisualizerState) => (
	<article class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--events">
		<div class="controller-decorator-visualizer__card-head">
			<p class="controller-decorator-visualizer__card-id">N3</p>
			<p class="controller-decorator-visualizer__label">Event surface</p>
		</div>
		<h4>Direct JSX handlers</h4>
		<p class="controller-decorator-visualizer__copy">
			Buttons call controller methods directly from JSX instead of delegating through authored refs.
		</p>
		<p class="controller-decorator-visualizer__detail controller-decorator-visualizer__last-event">{lastEvent}</p>
	</article>
);

const DecoratorInputsCard = ({ manualRefCount }: DecoratorVisualizerState) => (
	<article class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--queries">
		<div class="controller-decorator-visualizer__card-head">
			<p class="controller-decorator-visualizer__card-id">N4</p>
			<p class="controller-decorator-visualizer__label">Render inputs</p>
		</div>
		<h4>Manual refs removed</h4>
		<p class="controller-decorator-visualizer__copy">
			Reactive fields are read directly inside JSX, so the render tree no longer depends on manual ref binding.
		</p>
		<p class="controller-decorator-visualizer__value controller-decorator-visualizer__manual-ref-count">
			{manualRefCount}
		</p>
		<p class="controller-decorator-visualizer__meta">manual refs still required</p>
	</article>
);

const DecoratorStateCard = ({ signal, pulses, lastAction }: DecoratorVisualizerState) => (
	<article class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--state">
		<div class="controller-decorator-visualizer__card-head">
			<p class="controller-decorator-visualizer__card-id">N5</p>
			<p class="controller-decorator-visualizer__label">Reactive output</p>
		</div>
		<h4>State and updates</h4>
		<p class="controller-decorator-visualizer__copy">
			Every button press mutates controller state and the whole view stays in sync through render().
		</p>
		<div class="controller-decorator-visualizer__metric-grid">
			<DecoratorMetric
				label="signal"
				value={signal}
				valueClassName="controller-decorator-visualizer__state-signal"
			/>
			<DecoratorMetric
				label="pulses"
				value={pulses}
				valueClassName="controller-decorator-visualizer__state-pulses"
			/>
		</div>
		<p class="controller-decorator-visualizer__detail controller-decorator-visualizer__state-last-action">
			{lastAction}
		</p>
	</article>
);

const DecoratorTransmissionPanel = ({ transmissionTitle, transmissionDescription }: DecoratorVisualizerState) => (
	<aside class="controller-decorator-visualizer__transmissions" aria={{ live: 'polite' }}>
		<div class="controller-decorator-visualizer__transmissions-copy">
			<p class="controller-decorator-visualizer__label">Live transmission</p>
			<h4 class="controller-decorator-visualizer__flow-title">{transmissionTitle}</h4>
			<p class="controller-decorator-visualizer__detail controller-decorator-visualizer__flow-description">
				{transmissionDescription}
			</p>
		</div>
		<ul class="controller-decorator-visualizer__transmission-list">
			<li>
				<span class="controller-decorator-visualizer__transmission-dot"></span>
				<div class="controller-decorator-visualizer__transmission-step">
					<p class="controller-decorator-visualizer__transmission-tag">Step 1</p>
					<p class="controller-decorator-visualizer__transmission-copy">Read controller state</p>
				</div>
			</li>
			<li>
				<span class="controller-decorator-visualizer__transmission-dot"></span>
				<div class="controller-decorator-visualizer__transmission-step">
					<p class="controller-decorator-visualizer__transmission-tag">Step 2</p>
					<p class="controller-decorator-visualizer__transmission-copy">Produce JSX directly from fields</p>
				</div>
			</li>
			<li>
				<span class="controller-decorator-visualizer__transmission-dot"></span>
				<div class="controller-decorator-visualizer__transmission-step">
					<p class="controller-decorator-visualizer__transmission-tag">Step 3</p>
					<p class="controller-decorator-visualizer__transmission-copy">
						Commit the refreshed DOM back into the host
					</p>
				</div>
			</li>
		</ul>
	</aside>
);

const DecoratorStep = ({ step, title, description }: DecoratorStepProps) => (
	<article class="controller-decorator-visualizer__rail-step">
		<p class="controller-decorator-visualizer__label">{step}</p>
		<h4>{title}</h4>
		<p>{description}</p>
	</article>
);

const DecoratorRail = () => (
	<div class="controller-decorator-visualizer__rail">
		<DecoratorStep
			step="Step 1"
			title="Author only the host"
			description="The page keeps a plain host with data-controller and the initial signal."
		/>
		<DecoratorStep
			step="Step 2"
			title="Render from controller fields"
			description="The controller owns the JSX tree and uses reactive state directly inside render()."
		/>
		<DecoratorStep
			step="Step 3"
			title="Re-render instead of patching refs"
			description="Interactions update controller state and the full view re-renders without manual ref syncing."
		/>
	</div>
);

@controller('controller-dom-flow-visualizer')
export class ControllerDomFlowVisualizer extends RadiantController {
	@attr({ source: 'data-signal' }) signal = INITIAL_DECORATOR_VISUALIZER_STATE.signal;
	@state pulses = INITIAL_DECORATOR_VISUALIZER_STATE.pulses;
	@state lastAction = INITIAL_DECORATOR_VISUALIZER_STATE.lastAction;
	@state lastEvent = INITIAL_DECORATOR_VISUALIZER_STATE.lastEvent;
	@state transmissionTitle = INITIAL_DECORATOR_VISUALIZER_STATE.transmissionTitle;
	@state transmissionDescription = INITIAL_DECORATOR_VISUALIZER_STATE.transmissionDescription;
	@state manualRefCount = INITIAL_DECORATOR_VISUALIZER_STATE.manualRefCount;

	override connect(): void {
		super.connect();
		this.syncHostAttributes();
	}

	selectSignal(nextSignal: string) {
		this.lastEvent = `click:${nextSignal}`;
		this.signal = nextSignal;
		this.syncHostAttributes();
		this.pulses += 1;
		this.lastAction = `Host attribute changed to data-signal="${nextSignal}"`;
		this.transmissionTitle = 'Signal rerouted';
		this.transmissionDescription = `The ${nextSignal} action re-rendered the host directly from controller state.`;
	}

	pingRender() {
		this.lastEvent = 'click:ping';
		this.pulses += 1;
		this.lastAction = 'The controller replayed its current JSX tree without consulting any manual refs.';
		this.transmissionTitle = 'Render pulse';
		this.transmissionDescription =
			'A render pulse refreshed the same host tree from the current controller fields.';
	}

	syncHostAttributes() {
		this.host.setAttribute('data-signal', this.signal);
		this.host.toggleAttribute('aria-busy', this.signal === 'alert');
	}

	override render() {
		const viewState: DecoratorVisualizerState = {
			signal: this.signal,
			pulses: this.pulses,
			lastAction: this.lastAction,
			lastEvent: this.lastEvent,
			transmissionTitle: this.transmissionTitle,
			transmissionDescription: this.transmissionDescription,
			manualRefCount: this.manualRefCount,
		};
		const viewHandlers: DecoratorVisualizerHandlers = {
			onSignalChoice: (signal) => this.selectSignal(signal),
			onPing: () => this.pingRender(),
		};

		return (
			<>
				<DecoratorHeader />
				<DecoratorActions {...viewHandlers} />
				<div class="controller-decorator-visualizer__stage">
					<div
						class="controller-decorator-visualizer__diagram"
						aria={{ label: 'Controller render lifecycle diagram' }}
					>
						<DecoratorHostCard {...viewState} />
						<DecoratorCoreCard />
						<DecoratorEventCard {...viewState} />
						<DecoratorInputsCard {...viewState} />
						<DecoratorStateCard {...viewState} />
						<DecoratorTransmissionPanel {...viewState} />
					</div>
					<DecoratorRail />
				</div>
			</>
		);
	}
}
