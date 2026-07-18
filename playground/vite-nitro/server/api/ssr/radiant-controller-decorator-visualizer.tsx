import '@ecopages/radiant/server/install-ssr-runtime';
import { defineHandler } from 'nitro';
import {
	ControllerDomFlowVisualizer,
	INITIAL_DECORATOR_VISUALIZER_STATE,
} from '@/components/radiant-controller-decorator-visualizer.script';

export default defineHandler(async () => {
	const { renderSsrControllerResponse } = await import('../../../vite-plugin-radiant/nitro/render');
	return renderSsrControllerResponse(ControllerDomFlowVisualizer, {
		host: {
			class: 'controller-decorator-visualizer unstyled',
			data: {
				signal: INITIAL_DECORATOR_VISUALIZER_STATE.signal,
			},
		},
		tagName: 'section',
	});
});
