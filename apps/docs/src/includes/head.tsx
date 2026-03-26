import { Seo } from '@/includes/seo';
import type { EcoComponent, PageHeadProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

type DocsHeadProps = Omit<PageHeadProps, 'children'> & {
	children?: JsxRenderable;
};

export const Head: EcoComponent<DocsHeadProps, JsxRenderable> = ({ metadata, children }) => {
	return (
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />

			<Seo {...metadata} />
			{children}
		</head>
	);
};

Head.config = {
	dependencies: {
		stylesheets: ['../styles/tailwind.css'],
	},
};
