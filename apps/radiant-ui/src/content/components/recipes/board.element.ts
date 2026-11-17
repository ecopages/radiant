import { RadiantElement, customElement, query, queryAll } from '@ecopages/radiant';
import { SortableGroup, createSortableController } from '@ecopages/radiant-ui/controllers';

@customElement('board-element')
export class BoardElement extends RadiantElement {
	@queryAll('ul') private lists!: HTMLElement[];
	@query('[data-status]') private status!: HTMLElement;

	private readonly group = new SortableGroup();

	/**
	 * One sortable per column.
	 *
	 * @remarks
	 * A controller binds to the host when the class is constructed, before the markup can be queried, so the count is
	 * written here and has to match the number of `ul` in the markup; the component form takes it from its data.
	 */
	private readonly sortables = Array.from({ length: 3 }, (_, column) =>
		createSortableController(this, {
			group: this.group,
			preview: true,
			createPlaceholder: () => document.createElement('li'),
			getContainer: () => this.lists[column] ?? null,
			getItems: () => [...this.lists[column].children] as HTMLElement[],
			announce: (message) => (this.status.textContent = message),
			onChange: ({ item, to, toContainer }) => {
				const others = [...toContainer.children].filter((child) => child !== item);
				toContainer.insertBefore(item, others[to] ?? null);
				item.focus();
			},
		}),
	);
}
