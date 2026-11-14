import { SwipeController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="swipe"]')!;
const box = root.querySelector<HTMLElement>('[data-box]')!;
const status = root.querySelector('[data-status]')!;

const swipe = new SwipeController({
	getTarget: () => box,
	onSwipe: (direction) => (status.textContent = `Swiped ${direction}`),
});
swipe.attach();
