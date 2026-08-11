import { eco, type Error500TemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { DocsLayout } from '@/layouts/docs-layout';

export default eco.page<Error500TemplateProps, JsxRenderable>({
	layout: DocsLayout,
	dependencies: {
		stylesheets: ['./500.css'],
	},
	metadata: () => ({
		title: 'Something went wrong | Radiant UI',
		description: 'Radiant UI could not render the requested page.',
	}),
	render: ({ message, stack }) => (
		<div class="error500">
			<div class="error500__content">
				<div class="error500__code" aria-hidden="true">
					500
				</div>
				<h1 class="error500__title">Something went wrong</h1>
				<p class="error500__message">{message ?? 'The page could not be rendered. Please try again.'}</p>
				{stack ? <pre class="error500__stack">{stack}</pre> : null}
				<div class="error500__actions">
					<RuiButton href="/" variant="outline">
						Return home
					</RuiButton>
				</div>
			</div>
		</div>
	),
});
