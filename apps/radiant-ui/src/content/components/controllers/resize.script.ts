import { ResizeController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const box = root.querySelector<HTMLElement>('[data-box]')!;
	const status = root.querySelector('[data-status]')!;

	const resize = new ResizeController({
		getTargets: () => [box],
		onResize: ([entry]) => (status.textContent = `Width ${Math.round(entry.contentRect.width)}px`),
	});
	resize.attach();

	root.querySelector('button')!.addEventListener('click', () => {
		box.style.width = box.style.width === '12rem' ? '6rem' : '12rem';
	});
	return () => resize.destroy();
}

mountExample('resize', mount);
