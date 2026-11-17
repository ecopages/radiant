import { RadiantController, controller, query, queryAll } from '@ecopages/radiant';
import { SortableGroup, createSortableController } from '@ecopages/radiant-ui/controllers';

@controller('board')
export class BoardController extends RadiantController {
	@queryAll('ul') private lists!: HTMLElement[];
	@query('[data-status]') private status!: HTMLElement;

	private readonly group = new SortableGroup();

	/**
	 * @remarks
	 * `RadiantController` has the two registration methods `createSortableController` asks of a host, so the sortables
	 * attach when the controller connects and are destroyed when the registry disconnects it, as on an element. They are
	 * bound when the class is constructed, before the lists can be queried, so there is one per column written here, and the
	 * count has to match the number of `ul` in the markup.
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
