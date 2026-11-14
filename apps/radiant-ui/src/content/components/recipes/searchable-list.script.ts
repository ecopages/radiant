import { RovingController } from '@ecopages/radiant-ui/controllers';
import { textContains } from '@ecopages/radiant-ui/helpers';

const root = document.querySelector('[data-example="searchable-list"]')!;
const input = root.querySelector('input')!;
const list = root.querySelector('ul')!;
const status = root.querySelector('[data-status]')!;

const all = [...list.children] as HTMLElement[];
const visible = () => all.filter((item) => !item.hidden);

const roving = new RovingController({
	getItems: visible,
	getTarget: () => list,
	orientation: 'vertical',
	wrap: false,
});
roving.attach();
roving.sync();

input.addEventListener('input', () => {
	for (const item of all) {
		item.hidden = !textContains(item.textContent, input.value);
	}
	roving.sync();
	status.textContent = `${visible().length} of ${all.length} shown`;
});

input.addEventListener('keydown', (event) => {
	const first = visible()[0];
	if (event.key === 'ArrowDown' && first) {
		event.preventDefault();
		roving.focus(first);
	}
});

list.addEventListener('keydown', (event) => {
	if (event.key === 'Enter' && event.target instanceof HTMLElement) {
		status.textContent = `Chose ${event.target.textContent}`;
	}
});
