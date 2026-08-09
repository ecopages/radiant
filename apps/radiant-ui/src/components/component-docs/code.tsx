import { eco } from '@ecopages/core';
import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { getStoryArgs, getStoryId, resolveExampleCode, type DocsMetaAny, type DocsStoryAny } from '@/lib/docs-stories';
import { highlightExampleCode } from '@/lib/docs-stories/highlight-code';
import type { DocsCodeElement } from './code.script';

export type CodeProps = { of: DocsStoryAny; meta: DocsMetaAny };

const Code = eco.component<CodeProps, JsxRenderable>({
	dependencies: { scripts: ['./code.script.tsx'], stylesheets: ['./component-docs.css'] },
	render: ({ of, meta }: CodeProps & JsxCustomElementAttributes<DocsCodeElement>) => {
		const code = resolveExampleCode(meta, getStoryArgs(meta, of), of);
		if (!code) return null;
		const id = getStoryId(of);
		const highlighted = highlightExampleCode(code);
		return (
			<radiant-docs-code class="docs-story-code" data={{ storyId: id }}>
				<div class="docs-story-code__panel">
					<div class="docs-story-code__toolbar">
						<span class="docs-story-code__tab" aria-current="page">
							Example
						</span>
						<RuiButton size="sm" variant="outline" data-docs-copy="" aria-label="Copy example">
							Copy
						</RuiButton>
					</div>
					<div class="docs-story-code__body" data-docs-code-highlight="">
						<figure data-rehype-pretty-code-figure="" class="docs-story-code__figure">
							{unsafeHtml(highlighted)}
						</figure>
					</div>
				</div>
			</radiant-docs-code>
		);
	},
});

export default Code;
