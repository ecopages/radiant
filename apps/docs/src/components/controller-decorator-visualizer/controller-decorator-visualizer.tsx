import './controller-decorator-visualizer.script';
import type { JsxRenderable } from '@ecopages/jsx/jsx-runtime';

type DecoratorGraphCardProps = {
	id: string;
	kind: string;
	title: string;
	summary: string;
	decorators: string[];
	connection: JsxRenderable;
	children?: any;
	className?: string;
	data?: Record<string, string>;
};

const DecoratorGraphCard = ({
	id,
	kind,
	title,
	summary,
	decorators,
	connection,
	children,
	className,
	data,
}: DecoratorGraphCardProps) => (
	<article
		class={`controller-decorator-visualizer__panel controller-decorator-visualizer__node ${className ?? ''}`.trim()}
		data={data}
	>
		<div class="controller-decorator-visualizer__card-head">
			<p class="controller-decorator-visualizer__card-id">{id}</p>
			<p class="controller-decorator-visualizer__label">{kind}</p>
		</div>
		<h4>{title}</h4>
		<p class="controller-decorator-visualizer__copy">{summary}</p>
		<ul class="controller-decorator-visualizer__decorators" aria={{ label: `${title} decorators` }}>
			{decorators.map((decorator) => (
				<li>{decorator}</li>
			))}
		</ul>
		<p class="controller-decorator-visualizer__connection-note">{connection}</p>
		{children}
	</article>
);

const VisualizerHeader = () => (
	<div class="controller-decorator-visualizer__header">
		<div class="controller-decorator-visualizer__intro">
			<p class="controller-decorator-visualizer__eyebrow">Controller decorator graph</p>
			<h3>How authored DOM wiring moves through a controller</h3>
			<p>
				This diagram stays entirely on authored markup. A single controller reads host attributes, resolves DOM
				refs, handles delegated events, and pushes reactive updates back into the same tree.
			</p>
			<ul class="controller-decorator-visualizer__decorators" aria={{ label: 'Decorators used in this demo' }}>
				<li>@controller</li>
				<li>@attr</li>
				<li>@query</li>
				<li>@onEvent</li>
				<li>@state</li>
				<li>@onUpdated</li>
			</ul>
		</div>
		<div class="controller-decorator-visualizer__snapshot">
			<p class="controller-decorator-visualizer__snapshot-label">Reading guide</p>
			<ul class="controller-decorator-visualizer__snapshot-list">
				<li>Each card names the specific controller concern it owns.</li>
				<li>Each card states how that concern connects back to authored DOM.</li>
				<li>The live panel below traces the latest controller transmission.</li>
			</ul>
		</div>
	</div>
);

const VisualizerActions = () => (
	<div class="controller-decorator-visualizer__actions">
		<button type="button" class="button button--sm button--outline" data={{ signalChoice: 'ready' }}>
			Ready
		</button>
		<button type="button" class="button button--sm button--outline" data={{ signalChoice: 'focus' }}>
			Focus
		</button>
		<button type="button" class="button button--sm button--outline" data={{ signalChoice: 'alert' }}>
			Alert
		</button>
		<button type="button" class="button button--sm button--outline" data={{ ref: 'ping' }}>
			Ping refs
		</button>
	</div>
);

const TransmissionPanel = () => (
	<aside class="controller-decorator-visualizer__transmissions" aria={{ live: 'polite' }}>
		<div class="controller-decorator-visualizer__transmissions-copy">
			<p class="controller-decorator-visualizer__label">Live transmission</p>
			<h4 data={{ ref: 'flow-title' }}>Initial hydrate</h4>
			<p class="controller-decorator-visualizer__detail" data={{ ref: 'flow-description' }}>
				The host attribute seeded controller state and all queried nodes resolved on connect.
			</p>
		</div>
		<ul class="controller-decorator-visualizer__transmission-list">
			<li>
				<span class="controller-decorator-visualizer__transmission-dot"></span>
				<div class="controller-decorator-visualizer__transmission-step">
					<p class="controller-decorator-visualizer__transmission-tag">Step 1</p>
					<p class="controller-decorator-visualizer__transmission-copy">host input read</p>
				</div>
			</li>
			<li>
				<span class="controller-decorator-visualizer__transmission-dot"></span>
				<div class="controller-decorator-visualizer__transmission-step">
					<p class="controller-decorator-visualizer__transmission-tag">Step 2</p>
					<p class="controller-decorator-visualizer__transmission-copy">refs and events resolved</p>
				</div>
			</li>
			<li>
				<span class="controller-decorator-visualizer__transmission-dot"></span>
				<div class="controller-decorator-visualizer__transmission-step">
					<p class="controller-decorator-visualizer__transmission-tag">Step 3</p>
					<p class="controller-decorator-visualizer__transmission-copy">DOM written back out</p>
				</div>
			</li>
		</ul>
	</aside>
);

type RailStepProps = {
	step: string;
	title: string;
	description: string;
};

const RailStep = ({ step, title, description }: RailStepProps) => (
	<article class="controller-decorator-visualizer__rail-step">
		<p class="controller-decorator-visualizer__label">{step}</p>
		<h4>{title}</h4>
		<p>{description}</p>
	</article>
);

export const ControllerDecoratorVisualizer = () => {
	return (
		<section
			class="controller-decorator-visualizer unstyled"
			data={{ controller: 'controller-dom-flow-visualizer', signal: 'ready' }}
		>
			<VisualizerHeader />

			<VisualizerActions />

			<div class="controller-decorator-visualizer__stage">
				<div
					class="controller-decorator-visualizer__diagram"
					aria={{ label: 'Live controller decorator diagram' }}
				>
					<div
						class="controller-decorator-visualizer__beam controller-decorator-visualizer__beam--attr"
						aria={{ hidden: true }}
					>
						<span class="controller-decorator-visualizer__packet controller-decorator-visualizer__packet--attr"></span>
						<span>@attr</span>
					</div>
					<div
						class="controller-decorator-visualizer__beam controller-decorator-visualizer__beam--query"
						aria={{ hidden: true }}
					>
						<span class="controller-decorator-visualizer__packet controller-decorator-visualizer__packet--query"></span>
						<span>@query</span>
					</div>
					<div
						class="controller-decorator-visualizer__beam controller-decorator-visualizer__beam--event"
						aria={{ hidden: true }}
					>
						<span class="controller-decorator-visualizer__packet controller-decorator-visualizer__packet--event"></span>
						<span>@onEvent</span>
					</div>
					<div
						class="controller-decorator-visualizer__beam controller-decorator-visualizer__beam--state"
						aria={{ hidden: true }}
					>
						<span class="controller-decorator-visualizer__packet controller-decorator-visualizer__packet--state"></span>
						<span>@state + @onUpdated</span>
					</div>

					<DecoratorGraphCard
						id="N1"
						kind="Authored host"
						title="Attribute inputs"
						summary="The host remains plain HTML. @attr reads data-signal and keeps the controller in sync with markup state."
						decorators={['@controller', '@attr']}
						connection={
							<>
								<b>Connects to N2</b> by seeding the controller from authored host attributes.
							</>
						}
						className="controller-decorator-visualizer__node--host"
						data={{ ref: 'host-node' }}
					>
						<div class="controller-decorator-visualizer__metric-grid">
							<p>
								<span>data-signal</span>
								<strong data={{ ref: 'host-signal' }}>ready</strong>
							</p>
							<p>
								<span>aria-busy</span>
								<strong data={{ ref: 'host-busy' }}>false</strong>
							</p>
						</div>
					</DecoratorGraphCard>

					<div class="controller-decorator-visualizer__core">
						<div class="controller-decorator-visualizer__card-head">
							<p class="controller-decorator-visualizer__card-id">N2</p>
							<p class="controller-decorator-visualizer__label">Controller core</p>
						</div>
						<h4>controller-dom-flow-visualizer</h4>
						<p class="controller-decorator-visualizer__copy">
							One controller bridges the authored host, reactive controller fields, and imperative DOM
							updates.
						</p>
						<p class="controller-decorator-visualizer__connection-note">
							<b>Connects N1 to N3, N4, and N5</b> by coordinating reads, events, state, and DOM writes.
						</p>
					</div>

					<DecoratorGraphCard
						id="N3"
						kind="Authored descendant"
						title="Delegated actions"
						summary="@onEvent handles authored button clicks without the controller owning the surrounding DOM."
						decorators={['@onEvent']}
						connection={
							<>
								<b>Receives from N2</b> and turns authored button input into controller updates.
							</>
						}
						className="controller-decorator-visualizer__node--events"
						data={{ ref: 'event-node' }}
					>
						<p class="controller-decorator-visualizer__detail" data={{ ref: 'event-action' }}>
							initial hydrate
						</p>
					</DecoratorGraphCard>

					<DecoratorGraphCard
						id="N4"
						kind="Stable refs"
						title="Query surface"
						summary="@query pins the controller to authored nodes it needs to read and update repeatedly."
						decorators={['@query']}
						connection={
							<>
								<b>Receives from N2</b> and gives the controller stable access to authored nodes.
							</>
						}
						className="controller-decorator-visualizer__node--queries"
						data={{ ref: 'query-node' }}
					>
						<p class="controller-decorator-visualizer__value" data={{ ref: 'query-count' }}>
							0
						</p>
						<p class="controller-decorator-visualizer__meta">resolved refs inside this host</p>
					</DecoratorGraphCard>

					<DecoratorGraphCard
						id="N5"
						kind="Reactive output"
						title="State and updates"
						summary="@state stores controller-only data, while @onUpdated pushes that data back into authored DOM."
						decorators={['@state', '@onUpdated']}
						connection={
							<>
								<b>Receives from N2</b> and reflects controller state back into host attributes and
								text.
							</>
						}
						className="controller-decorator-visualizer__node--state"
						data={{ ref: 'state-node' }}
					>
						<div class="controller-decorator-visualizer__metric-grid">
							<p>
								<span>signal</span>
								<strong data={{ ref: 'state-signal' }}>ready</strong>
							</p>
							<p>
								<span>pulses</span>
								<strong data={{ ref: 'state-pulses' }}>0</strong>
							</p>
						</div>
						<p class="controller-decorator-visualizer__detail" data={{ ref: 'state-last-action' }}>
							Hydrated from host attribute
						</p>
					</DecoratorGraphCard>

					<TransmissionPanel />
				</div>

				<div class="controller-decorator-visualizer__rail">
					<RailStep
						step="Step 1"
						title="Read the host"
						description="The controller starts from authored attributes and stable refs, not a custom-element API."
					/>
					<RailStep
						step="Step 2"
						title="Handle input"
						description="Buttons emit delegated events that move through controller fields instead of inline handlers in markup."
					/>
					<RailStep
						step="Step 3"
						title="Write back out"
						description="Reactive state updates host attributes, textual status, and the rest of the authored DOM view."
					/>
				</div>
			</div>
		</section>
	);
};

ControllerDecoratorVisualizer.config = {
	dependencies: {
		scripts: ['./controller-decorator-visualizer.script.tsx'],
		stylesheets: ['./controller-decorator-visualizer.css'],
	},
};
