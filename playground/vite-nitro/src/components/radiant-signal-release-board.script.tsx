import type { WritableSignal } from '@ecopages/signals';
import { ContextProvider, RadiantComponent, customElement, provideContext, signal } from '@ecopages/radiant';
import './radiant-signal-release-board-focus.script.tsx';
import './radiant-signal-release-board-queue.script.tsx';
import {
	radiantSignalReleaseBoardContext,
} from './radiant-signal-release-board.context.ts';
import {
	createInitialReleaseBoardState,
	createReleaseBoardState,
	createReleaseBoardStore,
	patchReleaseBoardState,
	type ReleaseBoardSnapshot,
	type ReleaseBoardSyncPayload,
	type ReleaseBoardStore,
} from './radiant-signal-release-board.model.ts';

@customElement('radiant-signal-release-board')
export class RadiantSignalReleaseBoardElement extends RadiantComponent {
	@provideContext({ context: radiantSignalReleaseBoardContext })
	declare boardContext: ContextProvider<typeof radiantSignalReleaseBoardContext>;

	@signal({ hydrate: Object, initial: createInitialReleaseBoardState() })
	declare boardSeed: WritableSignal<ReleaseBoardSnapshot>;

	private releaseBoardStore?: ReleaseBoardStore;

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncBoardContext();
	}

	/** Applies a partial board-state override before or after the store is created. */
	public configureBoardState(nextState: Partial<ReleaseBoardSnapshot>): void {
		if (this.releaseBoardStore) {
			patchReleaseBoardState(this.releaseBoardStore.state, nextState);
			return;
		}

		this.boardSeed.update((currentState) => createInitialReleaseBoardState({ ...currentState, ...nextState }));
	}

	private syncBoardContext(): void {
		this.boardContext.setContext({ store: this.store });
	}

	private get store() {
		if (this.releaseBoardStore) {
			return this.releaseBoardStore;
		}

		this.releaseBoardStore = createReleaseBoardStore({
			state: this.createBoardState(),
			syncReleaseBrief: this.syncReleaseBrief,
		});

		return this.releaseBoardStore;
	}

	private createBoardState() {
		return createReleaseBoardState(this.boardSeed.get());
	}

	private readonly syncReleaseBrief = async (): Promise<ReleaseBoardSyncPayload> => {
		const response = await fetch('/api/hello');

		if (!response.ok) {
			throw new Error(`Request failed with ${response.status}`);
		}

		return (await response.json()) as ReleaseBoardSyncPayload;
	};

	override render() {
		const board = this.store.views.board.get();
		this.syncBoardContext();

		return (
			<section class="component-card component-card--signals">
				<p class="component-tag">Signal store story</p>
				<h3>Release command deck</h3>
				<p class="component-copy">
					This board hydrates a single release snapshot, materializes a per-instance signal store, and lets
					the focus and queue panels read computed views directly from context. The app state lives in one
					store instead of a pile of host-local <code>@signal</code> fields.
				</p>
				<div class="signal-story__toolbar">
					<p class="status component-status" data-status={board.boardTone}>
						Board: {board.boardTone}
					</p>
					<p class="signal-story__chip">Filter: {board.filterLabel}</p>
					<p class="signal-story__chip">Visible: {board.visibleCount}</p>
					<p class="signal-story__chip">Blocked: {board.blockedCount}</p>
				</div>
				<p class="signal-story__headline">{board.headline}</p>
				<p class="signal-story__lane-summary">{board.laneBreakdown}</p>
				<div class="signal-story__layout">
					<radiant-signal-release-board-focus />
					<radiant-signal-release-board-queue />
				</div>
			</section>
		);
	}
}
