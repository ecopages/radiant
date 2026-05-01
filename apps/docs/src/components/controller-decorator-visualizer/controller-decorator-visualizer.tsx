import './controller-decorator-visualizer.script';

export const ControllerDecoratorVisualizer = () => {
	return (
		<section
			class="controller-decorator-visualizer"
			data={{ controller: 'controller-dom-flow-visualizer', signal: 'ready' }}
		>
			<div class="controller-decorator-visualizer__header">
				<div class="controller-decorator-visualizer__intro">
					<p class="controller-decorator-visualizer__eyebrow">Controller decorator graph</p>
					<h3>How authored DOM wiring moves through a controller</h3>
					<p>
						This diagram stays entirely on authored markup. A single controller reads host attributes,
						resolves DOM refs, handles delegated events, and pushes reactive updates back into the same
						tree.
					</p>
					<ul
						class="controller-decorator-visualizer__legend"
						aria={{ label: 'Decorators used in this demo' }}
					>
						<li>@controller</li>
						<li>@attr</li>
						<li>@query</li>
						<li>@onEvent</li>
						<li>@state</li>
						<li>@onUpdated</li>
					</ul>
				</div>
				<div class="controller-decorator-visualizer__snapshot">
					<p class="controller-decorator-visualizer__snapshot-label">What this demo traces</p>
					<ul class="controller-decorator-visualizer__snapshot-list">
						<li>host attributes becoming reactive controller inputs</li>
						<li>
							stable refs resolved from authored HTML via <code>data-ref</code>
						</li>
						<li>events fanning into controller state and reflected DOM output</li>
					</ul>
				</div>
			</div>

			<div class="controller-decorator-visualizer__actions">
				<button type="button" data={{ signalChoice: 'ready' }}>
					Ready
				</button>
				<button type="button" data={{ signalChoice: 'focus' }}>
					Focus
				</button>
				<button type="button" data={{ signalChoice: 'alert' }}>
					Alert
				</button>
				<button type="button" data={{ ref: 'ping' }}>
					Ping refs
				</button>
			</div>

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

					<article
						class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--host"
						data={{ ref: 'host-node' }}
					>
						<p class="controller-decorator-visualizer__label">Authored host</p>
						<h4>Attribute inputs</h4>
						<p class="controller-decorator-visualizer__copy">
							The host remains plain HTML. <code>@attr</code> reads <code>data-signal</code> and keeps the
							controller in sync with markup state.
						</p>
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
					</article>

					<div class="controller-decorator-visualizer__core">
						<p class="controller-decorator-visualizer__label">Controller brain</p>
						<h4>controller-dom-flow-visualizer</h4>
						<p class="controller-decorator-visualizer__copy">
							One controller bridges the authored host, reactive controller fields, and imperative DOM
							updates.
						</p>
					</div>

					<article
						class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--events"
						data={{ ref: 'event-node' }}
					>
						<p class="controller-decorator-visualizer__label">Event inputs</p>
						<h4>Delegated actions</h4>
						<p class="controller-decorator-visualizer__copy">
							<code>@onEvent</code> handles authored button clicks without the controller owning the
							surrounding DOM.
						</p>
						<p class="controller-decorator-visualizer__detail" data={{ ref: 'event-action' }}>
							initial hydrate
						</p>
					</article>

					<article
						class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--queries"
						data={{ ref: 'query-node' }}
					>
						<p class="controller-decorator-visualizer__label">DOM refs</p>
						<h4>Stable query surface</h4>
						<p class="controller-decorator-visualizer__copy">
							<code>@query</code> pins the controller to authored nodes it needs to read and update
							repeatedly.
						</p>
						<p class="controller-decorator-visualizer__value" data={{ ref: 'query-count' }}>
							0
						</p>
						<p class="controller-decorator-visualizer__meta">resolved refs inside this host</p>
					</article>

					<article
						class="controller-decorator-visualizer__panel controller-decorator-visualizer__node controller-decorator-visualizer__node--state"
						data={{ ref: 'state-node' }}
					>
						<p class="controller-decorator-visualizer__label">Reactive output</p>
						<h4>State and updates</h4>
						<p class="controller-decorator-visualizer__copy">
							<code>@state</code> stores controller-only data, while <code>@onUpdated</code> pushes that
							data back into authored DOM.
						</p>
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
					</article>

					<aside class="controller-decorator-visualizer__transmissions" aria={{ live: 'polite' }}>
						<p class="controller-decorator-visualizer__label">Live transmission</p>
						<h4 data={{ ref: 'flow-title' }}>Initial hydrate</h4>
						<p class="controller-decorator-visualizer__detail" data={{ ref: 'flow-description' }}>
							The host attribute seeded controller state and all queried nodes resolved on connect.
						</p>
					</aside>
				</div>

				<div class="controller-decorator-visualizer__rail">
					<article class="controller-decorator-visualizer__rail-step">
						<p class="controller-decorator-visualizer__label">Step 1</p>
						<h4>Read the host</h4>
						<p>The controller starts from authored attributes and stable refs, not a custom-element API.</p>
					</article>
					<article class="controller-decorator-visualizer__rail-step">
						<p class="controller-decorator-visualizer__label">Step 2</p>
						<h4>Handle input</h4>
						<p>
							Buttons emit delegated events that move through controller fields instead of inline handlers
							in markup.
						</p>
					</article>
					<article class="controller-decorator-visualizer__rail-step">
						<p class="controller-decorator-visualizer__label">Step 3</p>
						<h4>Write back out</h4>
						<p>
							Reactive state updates host attributes, textual status, and the rest of the authored DOM
							view.
						</p>
					</article>
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
