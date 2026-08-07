import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import Canvas from './canvas';
import Code from './code';
import Controls from './controls';
import type { DocsMetaAny, DocsStoryAny } from '@/lib/docs-stories';

export type DemoProps = { of: DocsStoryAny; meta: DocsMetaAny };

const Demo = eco.component<DemoProps, JsxRenderable>({
	dependencies: {
		components: [Canvas, Controls, Code],
		scripts: ['./canvas.script.tsx', './controls.script.tsx', './code.script.tsx'],
		stylesheets: ['./component-docs.css'],
	},
	render: ({ of, meta }: DemoProps) => (
		<section class="docs-story">
			<div class="docs-story__stage">
				<Canvas of={of} meta={meta} />
			</div>
			<Controls of={of} meta={meta} />
			<Code of={of} meta={meta} />
		</section>
	),
});

export default Demo;
