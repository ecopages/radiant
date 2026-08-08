import { eco, type Error404TemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { BaseLayout } from '@/layouts/base-layout';

export default eco.page<Error404TemplateProps, JsxRenderable>({
	layout: BaseLayout,
	metadata: () => ({
		title: 'Page not found | Radiant UI',
		description: 'The requested Radiant UI documentation page could not be found.',
	}),
	render: () => (
		<section class="ui-error-page">
			<p class="docs-kicker">404</p>
			<h1>Page not found</h1>
			<p class="docs-lede">The page you requested does not exist or has moved.</p>
			<RuiButton href="/">Return home</RuiButton>
		</section>
	),
});
