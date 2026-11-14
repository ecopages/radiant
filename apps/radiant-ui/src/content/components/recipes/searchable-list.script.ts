import { RovingController } from '@ecopages/radiant-ui/controllers';
import { textContains } from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
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
		const shown = visible().length;
		status.textContent = shown === 0 ? 'No matches' : `${shown} of ${all.length} shown`;
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
	return () => roving.destroy();
}

mountExample('searchable-list', mount);
