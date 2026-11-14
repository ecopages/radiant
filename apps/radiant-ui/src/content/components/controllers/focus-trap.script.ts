import { FocusTrapController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="focus-trap"]')!;
const panel = root.querySelector<HTMLElement>('[data-box]')!;
const toggle = root.querySelector('[data-toggle]')!;

const trap = new FocusTrapController({ getSurface: () => panel });
let trapped = false;

toggle.addEventListener('click', () => {
	trapped = !trapped;
	if (trapped) {
		trap.attach();
	} else {
		trap.destroy();
	}
	toggle.textContent = trapped ? 'Release focus' : 'Trap focus';
});
