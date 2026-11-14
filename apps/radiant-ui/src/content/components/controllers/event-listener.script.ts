import { EventListenerController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="event-listener"]')!;
const status = root.querySelector('[data-status]')!;

const keys = new EventListenerController({
	getTarget: () => document,
	type: 'keydown',
	listener: (event) => (status.textContent = `Pressed ${event.key}`),
});
keys.attach();

root.querySelector('button')!.addEventListener('click', () => keys.destroy());
