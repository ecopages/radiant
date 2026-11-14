import { RovingController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const toolbar = root.querySelector<HTMLElement>('[role="toolbar"]')!;

	const roving = new RovingController({
		getItems: () => [...toolbar.querySelectorAll('button')],
		getTarget: () => toolbar,
	});
	roving.attach();
	roving.sync();
	return () => roving.destroy();
}

mountExample('roving', mount);
