import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import Canvas from './canvas';
import Controls from './controls';
import type { DocsMetaAny, DocsStoryAny } from '@/lib/docs-stories';
import { getStoryId } from '@/lib/docs-stories';
import type { DocsDemoElement } from './demo.script';

export type DemoProps = { of: DocsStoryAny; meta: DocsMetaAny };

const Demo = eco.component<DemoProps, JsxRenderable>({
	dependencies: {
		components: [Canvas, Controls],
		scripts: ['./demo.script.tsx', './canvas.script.tsx', './controls.script.tsx'],
		stylesheets: ['./component-docs.css'],
	},
	render: ({ of, meta }: DemoProps & JsxCustomElementAttributes<DocsDemoElement>) => {
		const id = getStoryId(of);
		return (
			<radiant-docs-demo class="docs-story" data={{ storyId: id }}>
				<div class="docs-story__stage">
					<Canvas of={of} meta={meta} />
				</div>
				<Controls of={of} meta={meta} />
			</radiant-docs-demo>
		);
	},
});

export default Demo;
