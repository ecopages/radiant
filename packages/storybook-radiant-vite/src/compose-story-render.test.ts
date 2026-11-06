import { describe, expect, test } from 'vitest';
import { CUSTOM_ELEMENT_TAG_NAME } from '@ecopages/jsx/jsx-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { composeStoryRender } from './compose-story-render';

/** Node-env stand-in for a RadiantElement constructor (no `HTMLElement` global here). */
function makeElement() {
	const Host = class RuiHost {} as unknown as CustomElementConstructor;
	Object.assign(Host, { [CUSTOM_ELEMENT_TAG_NAME]: 'rui-host' });
	return Host;
}

describe('composeStoryRender', () => {
	test('renders a custom-element constructor used as meta.component without a render', async () => {
		const storyModule = {
			default: { component: makeElement() },
			Default: {},
		};

		const markup = await renderToString(composeStoryRender(storyModule, 'Default', { id: 'storage' })(), {
			mode: 'plain',
		});

		expect(markup).toBe('<rui-host id="storage"></rui-host>');
	});

	test('prefers the story render over meta.component', async () => {
		const storyModule = {
			default: { component: makeElement() },
			Default: { render: (args: Record<string, unknown>) => `rendered ${String(args.label)}` },
		};

		const markup = await renderToString(composeStoryRender(storyModule, 'Default', { label: 'Storage' })(), {
			mode: 'plain',
		});

		expect(markup).toBe('rendered Storage');
	});
});
