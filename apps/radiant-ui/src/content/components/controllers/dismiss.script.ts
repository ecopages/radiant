import { DismissController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="dismiss"]')!;
const panel = root.querySelector<HTMLElement>('[data-box]')!;
const reopen = root.querySelector('button')!;
const status = root.querySelector('[data-status]')!;

const dismiss = new DismissController({
	getSurface: () => panel,
	getRelated: () => [reopen],
	getOpen: () => !panel.hidden,
	onDismiss: (reason) => {
		panel.hidden = true;
		status.textContent = `Dismissed by ${reason}`;
	},
});
dismiss.attach();

reopen.addEventListener('click', () => {
	panel.hidden = false;
	status.textContent = 'Open';
});
