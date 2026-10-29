import { eco, type ErrorPageTemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { DocsLayout } from '@/layouts/docs-layout';
import { Error500View } from '@/components/error-500-view';

export default eco.page<ErrorPageTemplateProps, JsxRenderable>({
	layout: DocsLayout,
	dependencies: {
		stylesheets: ['./500.css'],
		scripts: ['./500.script.ts'],
	},
	metadata: () => ({
		title: 'Something went wrong | Radiant UI',
		description: 'Radiant UI could not render the requested page.',
	}),
	render: ({ message, stack }) => {
		const detail = stack ?? message ?? 'The page could not be rendered. Please try again.';

		return <Error500View detail={detail} />;
	},
});
