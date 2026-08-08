import { eco, type HtmlTemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

const themeScript = `(function(){const t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}})();`;

const Html = eco.component<HtmlTemplateProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['../styles/tailwind.css'],
		scripts: [{ content: themeScript, attributes: { defer: '' } }],
	},
	render: ({ children, metadata, headContent, language = 'en' }) => (
		<html lang={language}>
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{metadata.title}</title>
				<meta name="description" content={metadata.description} />
				{headContent as 'safe'}
			</head>
			{children as 'safe'}
		</html>
	),
});

export default Html;
