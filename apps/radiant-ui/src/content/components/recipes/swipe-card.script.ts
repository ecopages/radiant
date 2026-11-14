import { PointerDragController } from '@ecopages/radiant-ui/controllers';
import { resolveSwipeDirection } from '@ecopages/radiant-ui/helpers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
	const card = root.querySelector<HTMLElement>('[data-card]')!;
	const dismissButton = root.querySelector<HTMLElement>('[data-dismiss]')!;
	const restoreButton = root.querySelector<HTMLElement>('[data-restore]')!;
	const status = root.querySelector('[data-status]')!;

	function setShown(shown: boolean, message: string): void {
		card.hidden = !shown;
		restoreButton.hidden = shown;
		status.textContent = message;
		card.style.setProperty('--swipe-dx', '0px');
		card.style.setProperty('--swipe-opacity', '1');
	}

	function follow(dx: number): void {
		const distance = Math.min(Math.abs(dx) / card.offsetWidth, 1);
		card.style.setProperty('--swipe-dx', `${dx}px`);
		card.style.setProperty('--swipe-opacity', `${1 - distance / 2}`);
	}

	const drag = new PointerDragController({
		getTarget: () => card,
		capture: false,
		canStart: (event) => !(event.target instanceof Element && event.target.closest('button')),
		onStart: () => {
			card.dataset.dragging = '';
		},
		onMove: ({ dx }) => follow(dx),
		onEnd: ({ reason, dx, dy, elapsedMs }) => {
			delete card.dataset.dragging;
			const direction =
				reason === 'release'
					? resolveSwipeDirection(dx, dy, { minVelocity: 0.5, dominance: 2, elapsedMs })
					: null;
			if (!direction) {
				follow(0);
				return;
			}
			follow(direction === 'left' ? -card.offsetWidth : card.offsetWidth);
			Promise.allSettled(card.getAnimations().map((animation) => animation.finished)).then(() =>
				setShown(false, `Card dismissed, swiped ${direction}`),
			);
		},
	});
	drag.attach();

	dismissButton.addEventListener('click', () => {
		setShown(false, 'Card dismissed');
		restoreButton.focus();
	});
	restoreButton.addEventListener('click', () => {
		setShown(true, 'The card is shown');
		dismissButton.focus();
	});
	return () => drag.destroy();
}

mountExample('swipe-card', mount);
