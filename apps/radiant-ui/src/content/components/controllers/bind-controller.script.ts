import { bindController, type Controller } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="bind-controller"]')!;
const status = root.querySelector('[data-status]')!;
const [connect, disconnect] = root.querySelectorAll('button');

class Pulse implements Controller {
	attach(): void {
		status.textContent = 'Attached';
	}
	destroy(): void {
		status.textContent = 'Destroyed';
	}
}

const connected: (() => void)[] = [];
const cleanup: (() => void)[] = [];
bindController(
	{
		registerConnectedCallback: (callback) => connected.push(callback),
		registerCleanupCallback: (callback) => cleanup.push(callback),
	},
	new Pulse(),
);

connect.addEventListener('click', () => connected.forEach((callback) => callback()));
disconnect.addEventListener('click', () => cleanup.forEach((callback) => callback()));
