import { ScrollLockController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="scroll-lock"]')!;
const toggle = root.querySelector('button')!;
const scroller = root.querySelector<HTMLElement>('[data-scroller]')!;
const status = root.querySelector('[data-status]')!;

const lock = new ScrollLockController({ getTarget: () => scroller });
let locked = false;

toggle.addEventListener('click', () => {
	locked = !locked;
	if (locked) {
		lock.attach();
	} else {
		lock.destroy();
	}
	toggle.textContent = locked ? 'Unlock scrolling' : 'Lock scrolling';
	status.textContent = locked ? 'The list does not scroll' : 'The list scrolls';
});
