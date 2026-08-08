import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { listResolvedControls, renderDocsControls, type DocsMetaAny, type DocsStoryAny } from '@/lib/docs-stories';
import { getStoryArgs, getStoryId } from '@/lib/docs-stories';
import type { DocsControlsElement } from './controls.script';

export type ControlsProps = { of: DocsStoryAny; meta: DocsMetaAny };

const Controls = eco.component<ControlsProps, JsxRenderable>({
	dependencies: { scripts: ['./controls.script.tsx'], stylesheets: ['./component-docs.css'] },
	render: ({ of, meta }: ControlsProps & JsxCustomElementAttributes<DocsControlsElement>) => {
		const args = getStoryArgs(meta, of);
		const id = getStoryId(of);
		const controls = listResolvedControls(meta);
		return (
			<radiant-docs-controls data={{ storyId: id }}>
				<aside class="docs-story-controls" aria-label="Story controls">
					{renderDocsControls(controls, args)}
				</aside>
			</radiant-docs-controls>
		);
	},
});

export default Controls;
