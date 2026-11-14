import { PortalController } from '@ecopages/radiant-ui/controllers';
import { mountExample } from '../../../components/primitive-example/mount-example';

export function mount(root: HTMLElement): () => void {
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
	return () => portal.destroy();
}

mountExample('portal', mount);
