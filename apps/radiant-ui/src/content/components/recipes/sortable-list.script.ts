import { RovingController, SortableController } from '@ecopages/radiant-ui/controllers';
import { reorder } from '@ecopages/radiant-ui/helpers';

const root = document.querySelector('[data-example="sortable-list"]')!;
const list = root.querySelector('ul')!;
const status = root.querySelector('[data-status]')!;

let items = [...list.children] as HTMLElement[];

const roving = new RovingController({
	getItems: () => items,
	getTarget: () => list,
	orientation: 'vertical',
	enabled: () => sortable.getState() === null,
});

const sortable = new SortableController({
	getContainer: () => list,
	getItems: () => items,
	announce: (message) => (status.textContent = message),
	onChange: ({ item, from, to }) => {
		items = reorder(items, from, to);
		list.append(...items);
		roving.focus(item);
	},
});

sortable.attach();
roving.attach();
roving.sync();
