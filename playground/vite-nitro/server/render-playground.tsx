import type { JsxElement } from '@ecopages/jsx';
import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';

export type SsrCounterPayload = {
	generatedAt: string;
	markup: string;
	tagName: string;
};

export type SsrCounterRender = SsrCounterPayload & {
	preview: JsxElement;
};

export async function getSsrCounterPayload(): Promise<SsrCounterPayload> {
	const { preview: _preview, ...payload } = await getSsrCounterRender();
	return payload;
}

export async function getSsrCounterRender(): Promise<SsrCounterRender> {
	installLightDomShim();
	const { RadiantComponentCounterElement } = await import('../src/components/radiant-component-counter.script');
	const element = new RadiantComponentCounterElement();

	element.count = 6;
	element.label = 'SSR counter rendered in Nitro';
	const preview = element.renderHost();

	return {
		generatedAt: new Date().toISOString(),
		markup: element.renderHostToString({ hydrate: true }),
		preview,
		tagName: 'radiant-component-counter',
	};
}
