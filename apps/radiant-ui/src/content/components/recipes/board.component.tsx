import { RadiantElement, customElement, state } from '@ecopages/radiant';
import { SortableGroup, createSortableController } from '@ecopages/radiant-ui/controllers';
import { initialColumns, moveCard } from './board.data';

@customElement('board-app')
export class BoardApp extends RadiantElement<{ status: string }> {
	@state columns = initialColumns;
	@state status = 'Focus a card, press Space, PageDown for the next column, Space to drop';

	private focusCard: string | null = null;
	private readonly group = new SortableGroup();

	private readonly sortables = initialColumns.map((_, column) =>
		createSortableController(this, {
			group: this.group,
			preview: true,
			createPlaceholder: () => document.createElement('li'),
			getContainer: () => this.querySelectorAll('ul')[column] ?? null,
			getItems: () => [...(this.querySelectorAll('ul')[column]?.children ?? [])] as HTMLElement[],
			announce: (message) => (this.status = message),
			onChange: ({ item, to, toContainer }) => {
				this.focusCard = item.dataset.boardCard!;
				this.columns = moveCard(this.columns, item.dataset.boardCard!, toContainer.dataset.columnId!, to);
			},
		}),
	);

	/**
	 * Attaches the sortables to the lists the render produced, and focuses the card that was just moved.
	 *
	 * @remarks
	 * The controllers attach when the element connects, before the first render, when no list exists yet; a second
	 * `attach()` resolves each list again. The keyed sections keep their lists across renders, so later calls change
	 * nothing, but one that replaced a list would need them. A card that changed column is a new node, so it is found
	 * by its id.
	 */
	protected override updated(): void {
		for (const sortable of this.sortables) sortable.attach();
		if (this.focusCard) {
			this.querySelector<HTMLElement>(`[data-board-card="${this.focusCard}"]`)?.focus();
			this.focusCard = null;
		}
	}

	override render() {
		return (
			<>
				<div data-board>
					{this.columns.map((column) => (
						<section key={column.id} data-column>
							<h3>{column.title}</h3>
							<ul aria-label={column.title} data-column-id={column.id}>
								{column.cards.map((card) => (
									<li key={card.id} data-board-card={card.id} tabindex="0">
										{card.title}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
				<p data-status aria-live="polite">
					{this.$.status}
				</p>
			</>
		);
	}
}
