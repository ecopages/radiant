import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { getComponentDoc } from '@/lib/component-docs/registry';
import { buildExampleCode, resolvePlaygroundState } from '@/lib/playground';
import type { ComponentPlaygroundElement } from './component-playground.script';
import { renderPlaygroundControlsStatic } from './playground-controls.script';
import { renderPlaygroundPreview } from './playground-previews';
import { renderPlaygroundCodePanel, renderPlaygroundWorkbench } from './playground-shell';

export type ComponentPlaygroundProps = {
	slug: string;
};

/**
 * Docs playground shell.
 *
 * @remarks
 * Server-renders the full workbench (preview, controls, example code) so the
 * page is usable without waiting on the interactive script. The client host
 * hydrates and swaps in reactive stage/code panels for live prop updates.
 */
const ComponentPlayground = eco.component<ComponentPlaygroundProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./component-playground.css'],
		scripts: ['./component-playground.script.tsx'],
	},
	render: ({ slug }: ComponentPlaygroundProps & JsxCustomElementAttributes<ComponentPlaygroundElement>) => {
		const doc = getComponentDoc(slug);
		if (!doc) {
			return (
				<radiant-component-playground prop:slug={slug}>
					<section class="workbench" aria-label="Component playground">
						<p class="workbench__fallback">Unknown component playground.</p>
					</section>
				</radiant-component-playground>
			);
		}

		const state = resolvePlaygroundState(doc);
		const example = buildExampleCode(doc.exportName, doc.slug, state.props, state.children);
		const controlCount =
			doc.playground.scenarios.length > 1 ? state.controls.length + 1 : state.controls.length;

		return (
			<radiant-component-playground prop:slug={slug}>
				{renderPlaygroundWorkbench({
					doc,
					stage: renderPlaygroundPreview(doc.slug, state.props, state.children),
					code: renderPlaygroundCodePanel(example),
					controls: renderPlaygroundControlsStatic(
						doc.playground.scenarios,
						state.scenarioId,
						state.controls,
					),
					controlCount,
				})}
			</radiant-component-playground>
		);
	},
});

export default ComponentPlayground;
