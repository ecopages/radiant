import '@ecopages/radiant/server/install-light-dom-shim';
import { defineHandler } from 'nitro';
import { ControllerContextVisualizer } from '@/components/radiant-controller-context-visualizer.script';

export default defineHandler(async () => {
	const { renderSsrControllerResponse } = await import('../../../vite-plugin-radiant/nitro/render');
	return renderSsrControllerResponse(ControllerContextVisualizer, {
		host: {
			class: 'controller-context-visualizer unstyled',
		},
		tagName: 'section',
	});
});
