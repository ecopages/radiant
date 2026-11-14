import { SwipeController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="swipe-card"]')!;
const card = root.querySelector<HTMLElement>('[data-card]')!;
const dismissButton = root.querySelector<HTMLElement>('[data-dismiss]')!;
const restoreButton = root.querySelector<HTMLElement>('[data-restore]')!;
const status = root.querySelector('[data-status]')!;

function setShown(shown: boolean, message: string): void {
	card.hidden = !shown;
	restoreButton.hidden = shown;
	status.textContent = message;
}

const swipe = new SwipeController({
	getTarget: () => card,
	exclude: (target) => target instanceof Element && target.closest('button') !== null,
	onSwipe: (direction) => setShown(false, `Card dismissed, swiped ${direction}`),
});
swipe.attach();

dismissButton.addEventListener('click', () => {
	setShown(false, 'Card dismissed');
	restoreButton.focus();
});
restoreButton.addEventListener('click', () => {
	setShown(true, 'The card is shown');
	dismissButton.focus();
});
