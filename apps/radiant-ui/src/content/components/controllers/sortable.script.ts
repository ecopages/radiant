import { SortableController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="sortable"]')!;
const list = root.querySelector('ul')!;
const status = root.querySelector('[data-status]')!;

const sortable = new SortableController({
	getContainer: () => list,
	getItems: () => [...list.children] as HTMLElement[],
	announce: (message) => (status.textContent = message),
	onChange: ({ item, to }) => {
		const others = [...list.children].filter((child) => child !== item);
		list.insertBefore(item, others[to] ?? null);
		item.focus();
	},
});
sortable.attach();
