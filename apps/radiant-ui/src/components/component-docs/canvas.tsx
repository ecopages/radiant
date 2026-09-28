import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { getStoryArgs, getStoryId, renderStory, type DocsMetaAny, type DocsStoryAny } from '@/lib/docs-stories';
import type { DocsCanvasElement } from './canvas.script';

export type CanvasProps = { of: DocsStoryAny; meta: DocsMetaAny };

const Canvas = eco.component<CanvasProps, JsxRenderable>({
	dependencies: { scripts: ['./canvas.script.tsx'], stylesheets: ['./component-docs.css'] },
	render: ({ of, meta }: CanvasProps & JsxCustomElementAttributes<DocsCanvasElement>) => {
		const id = getStoryId(of);
		return (
			<radiant-docs-canvas class="unstyled" data={{ storyId: id }} aria-live="polite">
				<div class="docs-story__preview">
					<div class="docs-story__preview-mount" data-docs-preview="">
						{renderStory(meta, of, getStoryArgs(meta, of))}
					</div>
				</div>
			</radiant-docs-canvas>
		);
	},
});

export default Canvas;
