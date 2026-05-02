import { RadiantController, controller, state } from '@ecopages/radiant';

export type ContextVisualizerState = {
	count: number;
	history: string[];
	transmissionTitle: string;
	transmissionDescription: string;
};

type ContextVisualizerHandlers = {
	onIncrement?: () => void;
	onDecrement?: () => void;
	onReset?: () => void;
};

export const INITIAL_CONTEXT_VISUALIZER_STATE: ContextVisualizerState = {
	count: 2,
	history: ['Initialized count at 2'],
	transmissionTitle: 'Initial hydration',
	transmissionDescription:
		'The controller rendered the provider and consumer snapshots from a single context state object.',
};

type ContextMetricProps = {
	label: string;
	value: string | number;
	valueClassName?: string;
};

type ContextStepProps = {
	step: string;
	title: string;
	description: string;
};

const ContextMetric = ({ label, value, valueClassName }: ContextMetricProps) => (
	<p>
		<span>{label}</span>
		<strong class={valueClassName}>{value}</strong>
	</p>
);

const ContextHeader = () => (
	<div class="controller-context-visualizer__header">
		<div class="controller-context-visualizer__intro">
			<p class="controller-context-visualizer__eyebrow">Controller-owned context view</p>
			<h3>The controller renders provider and consumer snapshots from the same state source</h3>
			<p>
				The host remains a plain controller target. The controller owns the JSX tree, button handlers, provider
				summary, and derived consumer projections.
			</p>
		</div>
		<div class="controller-context-visualizer__snapshot">
			<p class="controller-context-visualizer__snapshot-label">Reading guide</p>
			<ul class="controller-context-visualizer__snapshot-list">
				<li>
					The host only carries <code>data-controller</code>.
				</li>
				<li>The provider state drives every consumer-facing panel.</li>
				<li>Buttons mutate controller state and the view re-renders directly.</li>
			</ul>
		</div>
	</div>
);

const ContextActions = ({ onIncrement, onDecrement, onReset }: ContextVisualizerHandlers) => (
	<div class="controller-context-visualizer__actions">
		<button type="button" class="button button--sm button--outline" on:click={onDecrement}>
			-1
		</button>
		<button type="button" class="button button--sm button--primary" on:click={onIncrement}>
			+1
		</button>
		<button type="button" class="button button--sm button--outline" on:click={onReset}>
			Reset
		</button>
	</div>
);

const ContextProviderCard = ({ count, history }: ContextVisualizerState) => {
	const lastEntry = history[history.length - 1] ?? 'Waiting for updates';

	return (
		<article class="controller-context-visualizer__panel controller-context-visualizer__node controller-context-visualizer__node--provider">
			<div class="controller-context-visualizer__card-head">
				<p class="controller-context-visualizer__card-id">N1</p>
				<p class="controller-context-visualizer__label">Provider state</p>
			</div>
			<h4>Shared context payload</h4>
			<p class="controller-context-visualizer__copy">
				The controller owns the count and history and uses that state as the shared payload.
			</p>
			<div class="controller-context-visualizer__metric-grid">
				<ContextMetric
					label="count"
					value={count}
					valueClassName="controller-context-visualizer__provider-count"
				/>
				<ContextMetric
					label="events"
					value={history.length}
					valueClassName="controller-context-visualizer__provider-events"
				/>
			</div>
			<p class="controller-context-visualizer__detail controller-context-visualizer__provider-last">
				{lastEntry}
			</p>
		</article>
	);
};

const ContextSnapshotCard = () => (
	<article class="controller-context-visualizer__panel controller-context-visualizer__node controller-context-visualizer__node--context">
		<div class="controller-context-visualizer__card-head">
			<p class="controller-context-visualizer__card-id">N2</p>
			<p class="controller-context-visualizer__label">Context snapshot</p>
		</div>
		<h4>controllerVisualizerContext</h4>
		<p class="controller-context-visualizer__copy">
			A single state object fans out into provider metrics, consumer text, and selector-style projections.
		</p>
		<p class="controller-context-visualizer__connection-note">
			<b>Connects N1 to N3 and N4</b> by exposing the current count and history.
		</p>
	</article>
);

const ContextConsumerCard = ({ count, history }: ContextVisualizerState) => {
	const lastEntry = history[history.length - 1] ?? 'Waiting for updates';
	const parity = count % 2 === 0 ? 'even' : 'odd';

	return (
		<article class="controller-context-visualizer__panel controller-context-visualizer__node controller-context-visualizer__node--controller">
			<div class="controller-context-visualizer__card-head">
				<p class="controller-context-visualizer__card-id">N3</p>
				<p class="controller-context-visualizer__label">Consumer snapshot</p>
			</div>
			<h4>Controller-facing projection</h4>
			<p class="controller-context-visualizer__copy">
				This panel mirrors what a consumer controller would read from the shared context payload.
			</p>
			<p class="controller-context-visualizer__value controller-context-visualizer__consumer-count">{count}</p>
			<p class="controller-context-visualizer__meta controller-context-visualizer__consumer-mode">{parity}</p>
			<p class="controller-context-visualizer__detail controller-context-visualizer__consumer-last">
				{lastEntry}
			</p>
		</article>
	);
};

const ContextSelectorCard = ({ count, history }: ContextVisualizerState) => {
	const parity = count % 2 === 0 ? 'even' : 'odd';
	const recentEntries = history.slice(-4).reverse();

	return (
		<article class="controller-context-visualizer__panel controller-context-visualizer__panel--element controller-context-visualizer__node controller-context-visualizer__node--element">
			<div class="controller-context-visualizer__card-head">
				<p class="controller-context-visualizer__card-id">N4</p>
				<p class="controller-context-visualizer__label">Selector snapshot</p>
			</div>
			<h4>Derived slice view</h4>
			<p class="controller-context-visualizer__copy">
				This panel renders the same state as a selector-style consumer projection.
			</p>
			<p class="controller-context-visualizer__value controller-context-visualizer__selector-count">{count}</p>
			<p class="controller-context-visualizer__meta">selected slice: context.count · {parity} count</p>
			<ul class="controller-context-visualizer__history">
				{recentEntries.map((entry) => (
					<li>{entry}</li>
				))}
			</ul>
		</article>
	);
};

const ContextTransmissionPanel = ({ transmissionTitle, transmissionDescription }: ContextVisualizerState) => (
	<aside class="controller-context-visualizer__transmissions" aria={{ live: 'polite' }}>
		<div class="controller-context-visualizer__transmissions-copy">
			<p class="controller-context-visualizer__label">Live transmission</p>
			<h4 class="controller-context-visualizer__flow-title">{transmissionTitle}</h4>
			<p class="controller-context-visualizer__detail controller-context-visualizer__flow-description">
				{transmissionDescription}
			</p>
		</div>
		<ul class="controller-context-visualizer__transmission-list">
			<li>
				<span class="controller-context-visualizer__transmission-dot"></span>
				<div class="controller-context-visualizer__transmission-step">
					<p class="controller-context-visualizer__transmission-tag">Step 1</p>
					<p class="controller-context-visualizer__transmission-copy">Mutate provider state</p>
				</div>
			</li>
			<li>
				<span class="controller-context-visualizer__transmission-dot"></span>
				<div class="controller-context-visualizer__transmission-step">
					<p class="controller-context-visualizer__transmission-tag">Step 2</p>
					<p class="controller-context-visualizer__transmission-copy">
						Recompute consumer-facing projections
					</p>
				</div>
			</li>
			<li>
				<span class="controller-context-visualizer__transmission-dot"></span>
				<div class="controller-context-visualizer__transmission-step">
					<p class="controller-context-visualizer__transmission-tag">Step 3</p>
					<p class="controller-context-visualizer__transmission-copy">
						Commit the refreshed provider and consumer panels
					</p>
				</div>
			</li>
		</ul>
	</aside>
);

const ContextStep = ({ step, title, description }: ContextStepProps) => (
	<article class="controller-context-visualizer__rail-step">
		<p class="controller-context-visualizer__label">{step}</p>
		<h4>{title}</h4>
		<p>{description}</p>
	</article>
);

const ContextRail = () => (
	<div class="controller-context-visualizer__rail">
		<ContextStep
			step="Step 1"
			title="Keep a plain host"
			description="The page authors only the controller host instead of a custom element wrapper."
		/>
		<ContextStep
			step="Step 2"
			title="Render provider and consumer snapshots together"
			description="The controller owns the JSX that represents both the source state and its projections."
		/>
		<ContextStep
			step="Step 3"
			title="Refresh the whole view from state"
			description="Buttons mutate state and the controller re-renders every dependent panel directly."
		/>
	</div>
);

@controller('controller-context-visualizer')
export class ControllerContextVisualizer extends RadiantController {
	@state count = INITIAL_CONTEXT_VISUALIZER_STATE.count;
	@state history = [...INITIAL_CONTEXT_VISUALIZER_STATE.history];
	@state transmissionTitle = INITIAL_CONTEXT_VISUALIZER_STATE.transmissionTitle;
	@state transmissionDescription = INITIAL_CONTEXT_VISUALIZER_STATE.transmissionDescription;

	increment() {
		this.updateCount(1, 'Incremented');
		this.transmissionTitle = 'Increment event';
		this.transmissionDescription =
			'The controller incremented the shared count and re-rendered the provider and consumer projections.';
	}

	decrement() {
		this.updateCount(-1, 'Decremented');
		this.transmissionTitle = 'Decrement event';
		this.transmissionDescription = 'The controller lowered the shared count and refreshed every dependent panel.';
	}

	reset() {
		this.count = INITIAL_CONTEXT_VISUALIZER_STATE.count;
		this.history = [...this.history, 'Reset to 2'];
		this.transmissionTitle = 'Reset event';
		this.transmissionDescription =
			'The controller restored the baseline context payload and re-rendered the consumer views.';
	}

	private updateCount(delta: number, label: string) {
		const nextCount = this.count + delta;
		this.count = nextCount;
		this.history = [...this.history, `${label} to ${nextCount}`];
	}

	override render() {
		const viewState: ContextVisualizerState = {
			count: this.count,
			history: this.history,
			transmissionTitle: this.transmissionTitle,
			transmissionDescription: this.transmissionDescription,
		};
		const viewHandlers: ContextVisualizerHandlers = {
			onIncrement: () => this.increment(),
			onDecrement: () => this.decrement(),
			onReset: () => this.reset(),
		};

		return (
			<>
				<ContextHeader />
				<ContextActions {...viewHandlers} />
				<div class="controller-context-visualizer__stage">
					<div
						class="controller-context-visualizer__diagram"
						aria={{ label: 'Controller-owned context diagram' }}
					>
						<ContextProviderCard {...viewState} />
						<ContextSnapshotCard />
						<ContextConsumerCard {...viewState} />
						<ContextSelectorCard {...viewState} />
					</div>
					<ContextTransmissionPanel {...viewState} />
					<ContextRail />
				</div>
			</>
		);
	}
}
