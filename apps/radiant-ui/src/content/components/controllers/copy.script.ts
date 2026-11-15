import { CopyController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const button = root.querySelector('button')!;
	const source = root.querySelector('code')!;
	const status = root.querySelector('[data-status]')!;

	const copy = new CopyController({
		getText: () => source.textContent ?? '',
		getTrigger: () => button,
		resetDelay: 1500,
		announce: (message) => (status.textContent = message),
	});
	copy.attach();
	return () => copy.destroy();
}

mountExample('copy', mount);
