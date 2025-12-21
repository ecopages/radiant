import { Seo } from '@/includes/seo.kita';
import type { EcoComponent, PageHeadProps } from '@ecopages/core';

export const Head: EcoComponent<PageHeadProps> = ({ metadata, children }) => {
	return (
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
			<link
				href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600;700&family=Cambay:wght@400;700&display=swap"
				rel="stylesheet"
			/>
			<Seo {...metadata} />
			{children as 'safe'}
		</head>
	);
};

Head.config = {
	dependencies: {
		stylesheets: ['../styles/tailwind.css'],
	},
};
