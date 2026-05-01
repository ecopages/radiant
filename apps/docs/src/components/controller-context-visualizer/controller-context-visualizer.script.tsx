import {
	type ContextProvider,
	RadiantController,
	RadiantElement,
	consumeContext,
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
	private updateResetTimer: ReturnType<typeof setTimeout> | undefined;

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
	@query({ ref: 'provider-node' }) providerNode!: HTMLElement;
	@query({ ref: 'controller-node' }) controllerNode!: HTMLElement;
	@query({ ref: 'flow-title' }) flowTitle!: HTMLElement;
	@query({ ref: 'flow-description' }) flowDescription!: HTMLElement;

	override connect(): void {
		super.connect();
		this.syncSnapshot(this.provider.getContext());
		this.flowTitle.textContent = 'Initial hydration';
		this.flowDescription.textContent = 'The provider seeded context and both consumers resolved their first value.';
		this.playTransmission('hydrate');
	}

	@onEvent({ ref: 'increment', type: 'click' })
	increment() {
		this.updateCount(1, 'Incremented');
		this.setTransmissionMessage(
			'Increment event',
			'A click event updated provider state and sent a fresh count through the graph.',
		);
		this.playTransmission('increment');
	}

	@onEvent({ ref: 'decrement', type: 'click' })
	decrement() {
		this.updateCount(-1, 'Decremented');
		this.setTransmissionMessage(
			'Decrement event',
			'The provider published a lower count and both consumer paths reacted immediately.',
		);
		this.playTransmission('decrement');
	}

	@onEvent({ ref: 'reset', type: 'click' })
	reset() {
		const nextContext = {
			count: 2,
			history: [...this.provider.getContext().history, 'Reset to 2'],
		};

		this.provider.setContext(nextContext);
		this.syncSnapshot(nextContext);
		this.setTransmissionMessage(
			'Reset event',
			'The provider restored its baseline value and replayed the update to each consumer.',
		);
		this.playTransmission('reset');
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

	private setTransmissionMessage(title: string, description: string) {
		this.flowTitle.textContent = title;
		this.flowDescription.textContent = description;
	}

	private playTransmission(flow: string) {
		const root = this.host;
		root.setAttribute('data-flow', flow);
		root.setAttribute('data-updated', 'true');

		if (this.updateResetTimer !== undefined) {
			clearTimeout(this.updateResetTimer);
		}

		for (const node of [
			this.providerNode,
			this.controllerNode,
			root.querySelector<HTMLElement>('.controller-context-visualizer__panel--element'),
		]) {
			node?.animate(
				[
					{ boxShadow: '0 0 0 rgba(14, 116, 144, 0)' },
					{ boxShadow: '0 0 0 0.35rem rgba(14, 116, 144, 0.14)' },
					{ boxShadow: '0 0 0 rgba(14, 116, 144, 0)' },
				],
				{ duration: 820, easing: 'ease-out' },
			);
		}

		this.updateResetTimer = setTimeout(() => {
			root.removeAttribute('data-flow');
			root.removeAttribute('data-updated');
			this.updateResetTimer = undefined;
		}, 900);
	}
}

@controller('controller-context-consumer')
export class ControllerContextConsumer extends RadiantController {
	@consumeContext(controllerVisualizerContext) context!: ContextProvider<typeof controllerVisualizerContext>;

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

	override render() {
		const lastEntry = this.history[this.history.length - 1] ?? 'Waiting for updates';
		const recentEntries = this.history.slice(-4).reverse();
		const parityLabel = this.count % 2 === 0 ? 'even count' : 'odd count';

		return (
			<article class="controller-context-visualizer__panel controller-context-visualizer__panel--element controller-context-visualizer__node controller-context-visualizer__node--element">
				<div class="controller-context-visualizer__card-head">
					<p class="controller-context-visualizer__card-id">N4</p>
					<p class="controller-context-visualizer__label">Custom element descendant</p>
					<span class="controller-context-visualizer__status" aria-hidden="true">
						<span class="controller-context-visualizer__status-ping"></span>
						<span class="controller-context-visualizer__status-dot"></span>
					</span>
				</div>
				<h4>Selector-driven element</h4>
				<p class="controller-context-visualizer__copy">
					Receives selected context slices and re-renders directly from those values.
				</p>
				<ul class="controller-context-visualizer__decorators" aria-label="Element decorators">
					<li>@customElement</li>
					<li>@contextSelector</li>
				</ul>
				<p class="controller-context-visualizer__connection-note">
					<b>Receives from N2</b> using the selected <code>context.count</code> slice.
				</p>
				<p class="controller-context-visualizer__value">{this.count}</p>
				<p class="controller-context-visualizer__meta">selected slice: context.count · {parityLabel}</p>
				<p class="controller-context-visualizer__detail">{lastEntry}</p>
				<ul class="controller-context-visualizer__history">
					{recentEntries.map((entry) => (
						<li>{entry}</li>
					))}
				</ul>
			</article>
		);
	}
}

ensureDocsControllersStarted();
