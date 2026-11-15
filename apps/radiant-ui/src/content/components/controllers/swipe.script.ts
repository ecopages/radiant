import { SwipeController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const box = root.querySelector<HTMLElement>('[data-box]')!;
	const status = root.querySelector('[data-status]')!;

	const swipe = new SwipeController({
		getTarget: () => box,
		minVelocity: 0.5,
		dominance: 2,
		onSwipe: (direction) => (status.textContent = `Swiped ${direction}`),
	});
	swipe.attach();
	return () => swipe.destroy();
}

mountExample('swipe', mount);
