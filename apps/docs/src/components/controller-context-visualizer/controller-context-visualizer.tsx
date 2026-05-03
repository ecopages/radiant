import { eco } from '@ecopages/core';
import './controller-context-visualizer.script';
import type { JsxRenderable } from '@ecopages/jsx/jsx-runtime';

type GraphCardProps = {
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

const GraphCard = ({ id, kind, title, summary, decorators, connection, children, className, data }: GraphCardProps) => (
	<article
		class={`controller-context-visualizer__panel controller-context-visualizer__node ${className ?? ''}`.trim()}
		data={data}
	>
		<div class="controller-context-visualizer__card-head">
			<p class="controller-context-visualizer__card-id">{id}</p>
			<p class="controller-context-visualizer__label">{kind}</p>
		</div>
		<h4>{title}</h4>
		<p class="controller-context-visualizer__copy">{summary}</p>
		<ul class="controller-context-visualizer__decorators" aria={{ label: `${title} decorators` }}>
			{decorators.map((decorator) => (
				<li>{decorator}</li>
			))}
		</ul>
		<p class="controller-context-visualizer__connection-note">{connection}</p>
		{children}
	</article>
);

const VisualizerActions = () => (
	<div class="controller-context-visualizer__actions">
		<button type="button" class="button button--sm button--outline" data={{ ref: 'decrement' }}>
			-1
		</button>
		<button type="button" class="button button--sm button--primary" data={{ ref: 'increment' }}>
			+1
		</button>
		<button type="button" class="button button--sm button--outline" data={{ ref: 'reset' }}>
			Reset
		</button>
	</div>
);

const VisualizerHeader = () => (
	<div class="controller-context-visualizer__header">
		<div class="controller-context-visualizer__intro">
			<p class="controller-context-visualizer__eyebrow">Controller context graph</p>
			<h3>A compact view of one provider and two consumers</h3>
			<p>
				One <code>RadiantController</code> publishes context, one controller consumes it imperatively, and one
				nested <code>RadiantElement</code> re-renders from a selected slice.
			</p>
		</div>
		<div class="controller-context-visualizer__snapshot">
			<p class="controller-context-visualizer__snapshot-label">Reading guide</p>
			<ul class="controller-context-visualizer__snapshot-list">
				<li>Each card has a stable ID.</li>
				<li>Each card states its direct connection.</li>
				<li>The live panel below explains the last transmission.</li>
			</ul>
		</div>
	</div>
);

export const ControllerContextVisualizer = eco.component({
	dependencies: {
		scripts: ['./controller-context-visualizer.script.tsx'],
		stylesheets: ['./controller-context-visualizer.css'],
	},
	render() {
		return (
			<section
				class="controller-context-visualizer unstyled"
				data={{ controller: 'controller-context-provider' }}
			>
				<VisualizerHeader />

				<VisualizerActions />

				<div class="controller-context-visualizer__stage">
					<div
						class="controller-context-visualizer__diagram"
						aria={{ label: 'Live context relationship diagram' }}
					>
						<GraphCard
							id="N1"
							kind="Authored host"
							title="Provider controller"
							summary="Publishes the shared context from plain DOM and owns the interactive counter state."
							decorators={['@controller', '@provideContext', '@onEvent']}
							connection={
								<>
									<b>Connects to N2</b> by publishing controllerVisualizerContext.
								</>
							}
							className="controller-context-visualizer__node--provider"
							data={{ ref: 'provider-node' }}
						>
							<div class="controller-context-visualizer__metric-grid">
								<p>
									<span>count</span>
									<strong data={{ ref: 'provider-count' }}>2</strong>
								</p>
								<p>
									<span>events</span>
									<strong data={{ ref: 'provider-events' }}>1</strong>
								</p>
							</div>
							<p class="controller-context-visualizer__detail" data={{ ref: 'provider-last' }}>
								Initialized count at 2
							</p>
						</GraphCard>

						<GraphCard
							id="N2"
							kind="Shared token"
							title="controllerVisualizerContext"
							summary="Acts as the handoff point between the provider and the two downstream consumers."
							decorators={['nearest provider resolution', 'reactive slice delivery']}
							connection={
								<>
									<b>Receives from N1</b> and fans out to N3 and N4.
								</>
							}
							className="controller-context-visualizer__node--context"
						/>

						<GraphCard
							id="N3"
							kind="Authored descendant"
							title="Consumer controller"
							summary="Consumes the full context and reacts imperatively when the selected slices change."
							decorators={['@controller', '@consumeContext', '@onContextUpdate']}
							connection={
								<>
									<b>Receives from N2</b> and updates text without rendering its own view.
								</>
							}
							className="controller-context-visualizer__node--controller"
							data={{ controller: 'controller-context-consumer', ref: 'controller-node' }}
						>
							<p class="controller-context-visualizer__value" data={{ ref: 'controller-count' }}>
								2
							</p>
							<p class="controller-context-visualizer__meta" data={{ ref: 'controller-mode' }}>
								even
							</p>
							<p class="controller-context-visualizer__detail" data={{ ref: 'controller-last' }}>
								Initialized count at 2
							</p>
						</GraphCard>

						<div class="controller-context-visualizer__element-slot controller-context-visualizer__node--element-shell">
							<controller-context-viewer />
						</div>
					</div>

					<aside class="controller-context-visualizer__transmissions" aria={{ live: 'polite' }}>
						<div class="controller-context-visualizer__transmissions-copy">
							<p class="controller-context-visualizer__label">Live transmission</p>
							<h4 data={{ ref: 'flow-title' }}>Initial hydration</h4>
							<p class="controller-context-visualizer__detail" data={{ ref: 'flow-description' }}>
								The provider seeded context and both consumers resolved their first value.
							</p>
						</div>
						<ul class="controller-context-visualizer__transmission-list">
							<li>
								<span class="controller-context-visualizer__transmission-dot"></span>
								<div class="controller-context-visualizer__transmission-step">
									<p class="controller-context-visualizer__transmission-tag">Step 1</p>
									<p class="controller-context-visualizer__transmission-copy">event received</p>
								</div>
							</li>
							<li>
								<span class="controller-context-visualizer__transmission-dot"></span>
								<div class="controller-context-visualizer__transmission-step">
									<p class="controller-context-visualizer__transmission-tag">Step 2</p>
									<p class="controller-context-visualizer__transmission-copy">context published</p>
								</div>
							</li>
							<li>
								<span class="controller-context-visualizer__transmission-dot"></span>
								<div class="controller-context-visualizer__transmission-step">
									<p class="controller-context-visualizer__transmission-tag">Step 3</p>
									<p class="controller-context-visualizer__transmission-copy">consumers reacted</p>
								</div>
							</li>
						</ul>
					</aside>

					<div class="controller-context-visualizer__rail">
						<article class="controller-context-visualizer__rail-step">
							<p class="controller-context-visualizer__label">Step 1</p>
							<h4>Provider writes</h4>
							<p>The authored host receives button events and updates the shared context object.</p>
						</article>
						<article class="controller-context-visualizer__rail-step">
							<p class="controller-context-visualizer__label">Step 2</p>
							<h4>Context propagates</h4>
							<p>The closest provider satisfies downstream consumers, selectors, and update hooks.</p>
						</article>
						<article class="controller-context-visualizer__rail-step">
							<p class="controller-context-visualizer__label">Step 3</p>
							<h4>Consumers diverge</h4>
							<p>
								The controller reacts imperatively while the custom element re-renders from a selected
								slice.
							</p>
						</article>
					</div>
				</div>
			</section>
		);
	},
});
