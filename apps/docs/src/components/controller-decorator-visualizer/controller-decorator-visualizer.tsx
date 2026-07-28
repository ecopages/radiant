import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './controller-decorator-visualizer.script';

export const ControllerDecoratorVisualizer = eco.component<{}, JsxRenderable>({
	dependencies: {
		scripts: ['./controller-decorator-visualizer.script.tsx'],
		stylesheets: ['./controller-decorator-visualizer.css'],
	},
	render: () => {
		return (
			<section
				class="controller-decorator-visualizer unstyled grid gap-4 rounded-sm border border-border bg-background p-4 text-on-background"
				data={{ controller: 'controller-dom-flow-visualizer', signal: 'ready' }}
			>
				<div class="grid gap-2">
					<p class="m-0 text-sm font-semibold">Controller decorators</p>
					<p class="m-0 text-sm text-on-background/70">
						A single <code>RadiantController</code> reads host attributes, resolves DOM refs, handles
						delegated events, and pushes reactive updates back into authored markup.
					</p>
				</div>

				<div class="grid gap-1">
					<p class="m-0 text-sm font-semibold" data={{ ref: 'flow-title' }}>
						Initial hydrate
					</p>
					<p class="m-0 text-sm text-on-background/70" data={{ ref: 'flow-description' }}>
						The host attribute seeded controller state and all queried nodes resolved on connect.
					</p>
				</div>

				<div class="flex flex-wrap gap-2">
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

				<div class="grid gap-3 sm:grid-cols-2">
					<article class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4">
						<div class="grid gap-1">
							<p class="m-0 text-sm font-semibold">Host attributes</p>
							<p class="m-0 text-sm text-on-background/70">
								<code>@controller</code> · <code>@attr</code>
							</p>
						</div>
						<dl class="m-0 grid grid-cols-2 gap-3 text-sm text-on-background/70">
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">data-signal</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'host-signal' }}>
									ready
								</dd>
							</div>
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">aria-busy</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'host-busy' }}>
									false
								</dd>
							</div>
						</dl>
					</article>

					<article class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4">
						<div class="grid gap-1">
							<p class="m-0 text-sm font-semibold">Delegated events</p>
							<p class="m-0 text-sm text-on-background/70">
								<code>@onEvent</code>
							</p>
						</div>
						<p
							class="m-0 rounded-sm border border-border/60 bg-background/60 p-3 text-sm font-medium text-on-background"
							data={{ ref: 'event-action' }}
						>
							initial hydrate
						</p>
					</article>

					<article class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4">
						<div class="grid gap-1">
							<p class="m-0 text-sm font-semibold">Query surface</p>
							<p class="m-0 text-sm text-on-background/70">
								<code>@query</code>
							</p>
						</div>
						<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
							<p class="m-0 text-sm text-on-background/70">resolved refs</p>
							<p class="m-0 text-3xl font-semibold text-on-background" data={{ ref: 'query-count' }}>
								0
							</p>
						</div>
					</article>

					<article class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4">
						<div class="grid gap-1">
							<p class="m-0 text-sm font-semibold">State and updates</p>
							<p class="m-0 text-sm text-on-background/70">
								<code>@state</code> · <code>@onUpdated</code>
							</p>
						</div>
						<dl class="m-0 grid grid-cols-2 gap-3 text-sm text-on-background/70">
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">signal</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'state-signal' }}>
									ready
								</dd>
							</div>
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">pulses</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'state-pulses' }}>
									0
								</dd>
							</div>
						</dl>
						<p class="m-0 text-sm text-on-background/80" data={{ ref: 'state-last-action' }}>
							Hydrated from host attribute
						</p>
					</article>
				</div>
			</section>
		);
	},
});
