import { eco, type Error500TemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { HomeLayout } from '@/layouts/home-layout';

export default eco.page<Error500TemplateProps, JsxRenderable>({
	layout: HomeLayout,
	metadata: () => ({
		title: 'Something went wrong | Radiant UI',
		description: 'Radiant UI could not render the requested page.',
	}),
	render: ({ message }) => (
		<section class="ui-error-page">
			<p class="docs-kicker">500</p>
			<h1>Something went wrong</h1>
			<p class="docs-lede">{message ?? 'The page could not be rendered. Please try again.'}</p>
			<RuiButton href="/">Return home</RuiButton>
		</section>
	),
});
