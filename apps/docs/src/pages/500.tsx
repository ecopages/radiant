import { eco } from '@ecopages/core';
import { DocsLayout } from '@/layouts/docs-layout';
import { Error500View } from '@/components/error-500-view';
import type { Error500TemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

export default eco.page<Error500TemplateProps, JsxRenderable>({
	layout: DocsLayout,
	dependencies: {
		stylesheets: ['./500.css'],
		scripts: ['./500.script.ts'],
	},

	render: ({ message, stack }) => {
		const detail = stack ?? message ?? 'An unexpected error occurred while rendering this page.';

		return <Error500View detail={detail} />;
	},
});
