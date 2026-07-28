import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './controller-context-visualizer.script';

export const ControllerContextVisualizer = eco.component<{}, JsxRenderable>({
	dependencies: {
		scripts: ['./controller-context-visualizer.script.tsx'],
		stylesheets: ['./controller-context-visualizer.css'],
	},
	render() {
		return (
			<section
				class="controller-context-visualizer unstyled grid gap-4 rounded-sm border border-border bg-background p-4 text-on-background"
				data={{ controller: 'controller-context-provider' }}
			>
				<div class="grid gap-2">
					<p class="m-0 text-sm font-semibold">Controller context</p>
					<p class="m-0 text-sm text-on-background/70">
						One <code>RadiantController</code> publishes context. A second controller updates authored DOM
						imperatively, while a nested <code>RadiantElement</code> re-renders from a selected slice.
					</p>
				</div>

				<p class="m-0 text-sm text-on-background/70" data={{ ref: 'status' }}>
					Provider seeded context. Both consumers resolved their first value.
				</p>

				<div class="flex flex-wrap gap-2">
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

				<div class="grid gap-3 md:grid-cols-3">
					<article class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4">
						<div class="grid gap-1">
							<p class="m-0 text-sm font-semibold">Provider controller</p>
							<p class="m-0 text-sm text-on-background/70">
								<code>@provideContext</code> · <code>@onEvent</code>
							</p>
						</div>
						<dl class="m-0 grid grid-cols-2 gap-3 text-sm text-on-background/70">
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">count</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'provider-count' }}>
									2
								</dd>
							</div>
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">events</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'provider-events' }}>
									1
								</dd>
							</div>
						</dl>
						<p
							class="controller-context-visualizer__detail m-0 text-sm text-on-background/80"
							data={{ ref: 'provider-last' }}
						>
							Initialized count at 2
						</p>
					</article>

					<article
						class="grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4"
						data={{ controller: 'controller-context-consumer' }}
					>
						<div class="grid gap-1">
							<p class="m-0 text-sm font-semibold">Consumer controller</p>
							<p class="m-0 text-sm text-on-background/70">
								<code>@onContextUpdate</code>
							</p>
						</div>
						<dl class="m-0 grid grid-cols-2 gap-3 text-sm text-on-background/70">
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">count</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'controller-count' }}>
									2
								</dd>
							</div>
							<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
								<dt class="m-0">parity</dt>
								<dd class="m-0 font-medium text-on-background" data={{ ref: 'controller-mode' }}>
									even
								</dd>
							</div>
						</dl>
						<p
							class="controller-context-visualizer__detail m-0 text-sm text-on-background/80"
							data={{ ref: 'controller-last' }}
						>
							Initialized count at 2
						</p>
					</article>

					<controller-context-viewer />
				</div>
			</section>
		);
	},
});
