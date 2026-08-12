import { eco, type HtmlTemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

const themeScript = `(function(){try{const r=document.documentElement,s=localStorage.getItem('theme'),p=s==='light'||s==='dark'||s==='system'?s:'system',t=p==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p,v=localStorage.getItem('radiant-ui-docs:theme'),d=v?JSON.parse(v):{},c=d.colors==='basalt'||d.colors==='ember'||d.colors==='glacier'?d.colors:'glacier',g=d.spacing==='compact'||d.spacing==='wide'?d.spacing:'default',a=d.radius==='soft'||d.radius==='sharp'?d.radius:'default';r.setAttribute('data-theme',t);r.classList.toggle('dark',t==='dark');r.dataset.ruiColors=c;r.dataset.ruiSpacing=g;r.dataset.ruiRadius=a}catch{}})();`;

const Html = eco.component<HtmlTemplateProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['../styles/tailwind.css'],
		scripts: [{ content: themeScript }],
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
