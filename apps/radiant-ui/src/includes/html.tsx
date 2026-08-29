import { eco } from '@ecopages/core';
import type { HtmlTemplateProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { Head } from '@/includes/head';
import { readDocsTokenPackCss } from '@/lib/docs-token-pack-css';
import { createDocsThemeBootScript } from '@/lib/docs-theme-preview';

const themeScript = createDocsThemeBootScript(readDocsTokenPackCss());

const HtmlTemplate = eco.component<HtmlTemplateProps<JsxRenderable>, JsxRenderable>({
	dependencies: {
		components: [Head],
		scripts: [
			{
				content: themeScript,
			},
		],
	},

	render: ({ children, metadata, headContent = '', language = 'en' }) => {
		return (
			<html lang={language}>
				<Head metadata={metadata}>{headContent}</Head>
				{children as 'safe'}
			</html>
		);
	},
});

export default HtmlTemplate;
