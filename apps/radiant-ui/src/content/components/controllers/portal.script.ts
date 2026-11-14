import { PortalController } from '@ecopages/radiant-ui/controllers';

const root = document.querySelector('[data-example="portal"]')!;
const panel = root.querySelector<HTMLElement>('[data-box]')!;
const toggle = root.querySelector('button')!;
const status = root.querySelector('[data-status]')!;

const portal = new PortalController({ getNode: () => panel });

toggle.addEventListener('click', () => {
	if (portal.isMounted) {
		portal.destroy();
	} else {
		portal.attach();
	}
	status.textContent = `Parent: ${panel.parentElement!.tagName.toLowerCase()}`;
});
