import { PointerDragController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="pointer-drag"]')!;
const handle = root.querySelector<HTMLElement>('[data-box]')!;
const status = root.querySelector('[data-status]')!;

const drag = new PointerDragController({
	getTarget: () => handle,
	onMove: ({ dx, dy }) => {
		handle.style.transform = `translate(${dx}px, ${dy}px)`;
		status.textContent = `Moved ${dx}, ${dy}`;
	},
	onEnd: ({ reason }) => {
		handle.style.transform = '';
		status.textContent = `Ended: ${reason}`;
	},
});
drag.attach();
