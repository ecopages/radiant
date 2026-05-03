import type { EcoComponent, HtmlTemplateProps } from '@ecopages/core';
import { unsafeHtml, type JsxRenderable } from '@ecopages/jsx';
import { Head } from '@/includes/head';

type DocsHtmlTemplateProps = Omit<HtmlTemplateProps, 'children' | 'headContent'> & {
	children: JsxRenderable;
	headContent?: JsxRenderable;
};

const themeScript = `(function(){const t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}})();`;

const HtmlTemplate: EcoComponent<DocsHtmlTemplateProps, JsxRenderable> = ({
	children,
	metadata,
	headContent,
	language = 'en',
}) => {
	return (
		<html lang={language}>
			<Head metadata={metadata}>
				<script>{unsafeHtml(themeScript)}</script>
				{headContent ?? ''}
			</Head>
			{children}
		</html>
	);
};

HtmlTemplate.config = {
	dependencies: {
		components: [Head],
	},
};

export default HtmlTemplate;
