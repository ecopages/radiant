import {
	RENDERED_COMPONENT_ASSETS_HEADER,
	RENDERED_COMPONENT_FRAGMENT_HEADER,
	RENDERED_COMPONENT_GENERATED_AT_HEADER,
	RENDERED_COMPONENT_TAG_NAME_HEADER,
} from '@ecopages/radiant/server/render-component';
import { defineHandler } from 'nitro';
import { ControllerContextVisualizer } from '@/components/radiant-controller-context-visualizer.script';
import { createServerHost, renderControllerHostToString } from '../../render-controller-host';

export default defineHandler(() => {
	const host = createServerHost('section');
	host.setAttribute('class', 'controller-context-visualizer unstyled');
	host.setAttribute('data-controller', 'controller-context-visualizer');
	const controller = new ControllerContextVisualizer(host);

	return new Response(renderControllerHostToString(controller), {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			[RENDERED_COMPONENT_FRAGMENT_HEADER]: '1',
			[RENDERED_COMPONENT_TAG_NAME_HEADER]: 'section',
			[RENDERED_COMPONENT_GENERATED_AT_HEADER]: new Date().toISOString(),
			[RENDERED_COMPONENT_ASSETS_HEADER]: '[]',
		},
	});
});
