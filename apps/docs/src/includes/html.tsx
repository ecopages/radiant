import type { EcoComponent, HtmlTemplateProps } from '@ecopages/core';
import { Head } from '@/includes/head';
import { rawHtml } from '@/utils/raw-html';

const themeScript = `(function(){const t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}})();`;

const HtmlTemplate: EcoComponent<HtmlTemplateProps> = ({ children, metadata, headContent, language = 'en' }) => {
	return (
		<html lang={language}>
			<Head metadata={metadata}>{rawHtml(`<script>${themeScript}</script>${headContent ?? ''}`)}</Head>
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
