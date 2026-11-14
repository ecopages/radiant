import { RovingController } from '@ecopages/radiant-ui/controllers';

const toolbar = document.querySelector<HTMLElement>('[data-example="roving"] [role="toolbar"]')!;

const roving = new RovingController({
	getItems: () => [...toolbar.querySelectorAll('button')],
	getTarget: () => toolbar,
});
roving.attach();
roving.sync();
