import { RadiantController, controller, query } from '@ecopages/radiant';
import { createRovingController, createSortableController } from '@ecopages/radiant-ui/controllers';
import { reorder } from '@ecopages/radiant-ui/helpers';

/**
 * @remarks
 * `RadiantController` has the two registration methods a radiant-ui controller needs from its host, so
 * `createSortableController(this, ...)` and `createRovingController(this, ...)` attach on connect and are destroyed
 * when the registry disconnects the controller, with no extra cleanup here.
 */
@controller('sortable-list')
export class SortableListController extends RadiantController {
	@query({ selector: 'ul' }) private list!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private items: HTMLElement[] = [];

	private readonly roving = createRovingController(this, {
		getItems: () => this.items,
		getTarget: () => this.list,
		orientation: 'vertical',
		getEnabled: () => this.sortable.getState() === null,
	});

	private readonly sortable = createSortableController(this, {
		preview: true,
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => this.list,
		getItems: () => this.items,
		announce: (message) => (this.status.textContent = message),
		onChange: ({ item, from, to }) => {
			this.items = reorder(this.items, from, to);
			this.list.append(...this.items);
			this.roving.focus(item);
		},
	});

	override connect(): void {
		super.connect();
		this.items = [...this.list.children] as HTMLElement[];
		this.roving.sync();
	}
}
