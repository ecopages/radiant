import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import DocsBreadcrumb from '@/components/docs-breadcrumb/docs-breadcrumb';
import { DocsLayout } from '@/layouts/docs-layout';
import { componentNavEntries } from '@/lib/component-nav';
import { buildIntroductionBreadcrumb } from '@/lib/docs-breadcrumb';

export default eco.page<{}, JsxRenderable>({
	layout: DocsLayout,
	dependencies: {
		components: [DocsBreadcrumb],
		stylesheets: ['../index.css'],
	},
	metadata: () => ({
		title: 'Introduction | Radiant UI',
		description: 'An introduction to Radiant UI and its component documentation.',
	}),
	render: () => (
		<>
			<DocsBreadcrumb items={buildIntroductionBreadcrumb()} />
			<h1>Introduction</h1>
			<p class="docs-lede">
				Radiant UI is a component library for building accessible application interfaces with the Radiant
				reactive model. Import focused modules, compose light-DOM views, and ship interfaces that stay
				consistent across products.
			</p>

			<h2 id="what-you-get">What you get</h2>
			<p>
				Each component exposes a focused module under <code>@ecopages/radiant-ui/&lt;slug&gt;</code>,
				predictable props, and accessible defaults. Documentation pairs implementation guidance with an
				interactive playground that uses the real public API, not a generic placeholder.
			</p>
			<ul>
				<li>
					<strong>{componentNavEntries.length} components</strong> documented with usage examples, guidance,
					and accessibility notes.
				</li>
				<li>
					<strong>Playgrounds</strong> let you adjust real props and copy the resulting code.
				</li>
				<li>
					<strong>Focused imports</strong> keep bundles small — applications only ship the UI they use.
				</li>
			</ul>

			<h2 id="install">Install</h2>
			<pre class="docs-code">
				<code>{`pnpm add @ecopages/radiant-ui @ecopages/radiant`}</code>
			</pre>
			<p>
				Load a theme and the aggregate stylesheet in your app shell. See the main Radiant docs for framework
				integration details.
			</p>

			<h2 id="start-exploring">Start exploring</h2>
			<p>
				Open a component page to review its API, try the playground, and read accessibility guidance. Start with
				actions and forms, then move to navigation and overlays as your interface grows.
			</p>
			<RuiButton href="/components/button">Explore Button</RuiButton>
		</>
	),
});
