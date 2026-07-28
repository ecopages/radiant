import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import {
	type ContextProvider,
	RadiantController,
	RadiantElement,
	contextSelector,
	controller,
	createContext,
	customElement,
	onContextUpdate,
	onEvent,
	provideContext,
	query,
} from '@/utils/radiant-browser-runtime';
import { ensureDocsControllersStarted } from '@/utils/start-docs-controllers';

type ControllerVisualizerContext = {
	count: number;
	history: string[];
};

const controllerVisualizerContext = createContext<ControllerVisualizerContext>(Symbol('controller-visualizer-context'));

@controller('controller-context-provider')
export class ControllerContextProvider extends RadiantController {
	@provideContext<typeof controllerVisualizerContext>({
		context: controllerVisualizerContext,
		initialValue: {
			count: 2,
			history: ['Initialized count at 2'],
		},
	})
	provider!: ContextProvider<typeof controllerVisualizerContext>;

	@query({ ref: 'provider-count' }) providerCount!: HTMLElement;
	@query({ ref: 'provider-events' }) providerEvents!: HTMLElement;
	@query({ ref: 'provider-last' }) providerLast!: HTMLElement;
	@query({ ref: 'status' }) status!: HTMLElement;

	override connect(): void {
		super.connect();
		this.syncSnapshot(this.provider.getContext());
		this.status.textContent = 'Provider seeded context. Both consumers resolved their first value.';
	}

	@onEvent({ ref: 'increment', type: 'click' })
	increment() {
		this.updateCount(1, 'Incremented');
		this.status.textContent = 'Increment updated the shared context. Both consumers reacted.';
	}

	@onEvent({ ref: 'decrement', type: 'click' })
	decrement() {
		this.updateCount(-1, 'Decremented');
		this.status.textContent = 'Decrement updated the shared context. Both consumers reacted.';
	}

	@onEvent({ ref: 'reset', type: 'click' })
	reset() {
		const nextContext = {
			count: 2,
			history: [...this.provider.getContext().history, 'Reset to 2'],
		};

		this.provider.setContext(nextContext);
		this.syncSnapshot(nextContext);
		this.status.textContent = 'Reset restored the baseline count and replayed it to each consumer.';
	}

	private updateCount(delta: number, label: string) {
		const currentContext = this.provider.getContext();
		const nextCount = currentContext.count + delta;
		const nextContext = {
			count: nextCount,
			history: [...currentContext.history, `${label} to ${nextCount}`],
		};

		this.provider.setContext(nextContext);
		this.syncSnapshot(nextContext);
	}

	private syncSnapshot(context: ControllerVisualizerContext) {
		const lastEntry = context.history[context.history.length - 1] ?? 'Waiting for updates';
		this.providerCount.textContent = String(context.count);
		this.providerEvents.textContent = String(context.history.length);
		this.providerLast.textContent = lastEntry;
	}
}

@controller('controller-context-consumer')
export class ControllerContextConsumer extends RadiantController {
	@query({ ref: 'controller-count' }) controllerCount!: HTMLElement;
	@query({ ref: 'controller-mode' }) controllerMode!: HTMLElement;
	@query({ ref: 'controller-last' }) controllerLast!: HTMLElement;

	@onContextUpdate({ context: controllerVisualizerContext, select: (context) => context.count })
	onCountChange(count: number) {
		this.controllerCount.textContent = String(count);
		this.controllerMode.textContent = count % 2 === 0 ? 'even' : 'odd';
	}

	@onContextUpdate({ context: controllerVisualizerContext, select: (context) => context.history })
	onHistoryChange(history: string[]) {
		this.controllerLast.textContent = history[history.length - 1] ?? 'Waiting for updates';
	}
}

@customElement('controller-context-viewer')
export class ControllerContextViewer extends RadiantElement {
	@contextSelector({ context: controllerVisualizerContext, select: (context) => context.count }) count = 0;

	@contextSelector({ context: controllerVisualizerContext, select: (context) => context.history })
	history: string[] = [];

	override render(): JsxRenderable {
		const lastEntry = this.history[this.history.length - 1] ?? 'Waiting for updates';
		const recentEntries = this.history.slice(-3).reverse();
		const parityLabel = this.count % 2 === 0 ? 'even' : 'odd';

		return (
			<article class="controller-context-visualizer__panel--element grid gap-3 rounded-sm border border-border bg-secondary-container/20 p-4">
				<div class="grid gap-1">
					<p class="m-0 text-sm font-semibold">Selector element</p>
					<p class="m-0 text-sm text-on-background/70">
						<code>@customElement</code> · <code>@contextSelector</code>
					</p>
				</div>
				<dl class="m-0 grid grid-cols-2 gap-3 text-sm text-on-background/70">
					<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
						<dt class="m-0">count</dt>
						<dd class="controller-context-visualizer__value m-0 font-medium text-on-background">
							{this.count}
						</dd>
					</div>
					<div class="grid gap-1 rounded-sm border border-border/60 bg-background/60 p-3">
						<dt class="m-0">parity</dt>
						<dd class="m-0 font-medium text-on-background">{parityLabel}</dd>
					</div>
				</dl>
				<p class="controller-context-visualizer__detail m-0 text-sm text-on-background/80">{lastEntry}</p>
				{recentEntries.length > 0 ? (
					<ul class="m-0 grid list-none gap-1 p-0 text-sm text-on-background/70">
						{recentEntries.map((entry) => (
							<li class="m-0 border-t border-border/50 pt-1 first:border-0 first:pt-0">{entry}</li>
						))}
					</ul>
				) : null}
			</article>
		);
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'controller-context-viewer': JsxCustomElementAttributes<ControllerContextViewer>;
	}
}

ensureDocsControllersStarted();
