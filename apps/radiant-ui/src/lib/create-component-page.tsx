import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import ComponentPlayground from '@/components/component-playground/component-playground';
import type { ComponentDoc } from '@/lib/playground';
import { DocsLayout } from '@/layouts/docs-layout';

export function createComponentPage(doc: ComponentDoc) {
	return eco.page<{ slug: string }, JsxRenderable>({
		layout: DocsLayout,
		dependencies: {
			components: [ComponentPlayground],
			stylesheets: ['../pages/index.css'],
		},
		metadata: () => ({
			title: `${doc.title} | Radiant UI`,
			description: doc.lede,
		}),
		render: () => (
			<>
				<p class="docs-kicker">Components / {doc.category}</p>
				<h1>{doc.title}</h1>
				<p class="docs-lede">{doc.lede}</p>

				<h2 id="try-it">Try it</h2>
				<p>Adjust the controls to explore this component&apos;s props before adding it to your interface.</p>
				<ComponentPlayground slug={doc.slug} />

				<h2 id="usage">Usage</h2>
				<p>{doc.usage.intro}</p>
				<pre class="docs-code">
					<code>{doc.usage.example}</code>
				</pre>

				{doc.guidance.map((section) => (
					<>
						<h3 id={section.id}>{section.title}</h3>
						{section.paragraphs.map((paragraph) => (
							<p>{paragraph}</p>
						))}
						{section.bullets ? (
							<ul>
								{section.bullets.map((item) => (
									<li>{item}</li>
								))}
							</ul>
						) : null}
					</>
				))}

				<h2 id="accessibility">Accessibility</h2>
				<ul>
					{doc.accessibility.map((item) => (
						<li>{item}</li>
					))}
				</ul>
			</>
		),
	});
}
