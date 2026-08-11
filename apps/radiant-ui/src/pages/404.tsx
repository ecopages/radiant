import { eco, type Error404TemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { BaseLayout } from '@/layouts/base-layout';

export default eco.page<Error404TemplateProps, JsxRenderable>({
	layout: BaseLayout,
	dependencies: {
		stylesheets: ['./404.css'],
	},
	metadata: () => ({
		title: 'Page not found | Radiant UI',
		description: 'The requested Radiant UI documentation page could not be found.',
	}),
	render: () => (
		<div class="error404">
			<div class="error404__content">
				<div class="error404__code" aria-hidden="true">
					404
				</div>
				<h1 class="error404__title">Page not found</h1>
				<p class="error404__message">The page you requested does not exist or has moved.</p>
				<div class="error404__actions">
					<RuiButton href="/">Return home</RuiButton>
				</div>
			</div>
		</div>
	),
});
