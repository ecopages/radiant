import { EventListenerController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const status = root.querySelector('[data-status]')!;

	const keys = new EventListenerController({
		getTarget: () => document,
		type: 'keydown',
		listener: (event) => (status.textContent = `Pressed ${event.key}`),
	});
	keys.attach();

	root.querySelector('button')!.addEventListener('click', () => keys.destroy());
	return () => keys.destroy();
}

mountExample('event-listener', mount);
