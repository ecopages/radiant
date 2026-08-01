import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiFeedProps } from './feed.script';
import { RuiFeed as RuiFeedElement } from './feed.script';

export type RuiFeedArticle = { id: string; title: string; children: JsxRenderable };

export const RuiFeed = defineRadiantView(
	RuiFeedElement,
	({ articles, ...props }: JsxHtmlProps<RuiFeedProps & { slot?: string; articles: RuiFeedArticle[] }>) => (
		<rui-feed {...props}>
			{articles.map((article, index) => (
				<article
					class="rui-feed__article"
					aria-labelledby={`feed-${article.id}`}
					aria-posinset={index + 1}
					aria-setsize={articles.length}
				>
					<h3 id={`feed-${article.id}`}>{article.title}</h3>
					{article.children}
				</article>
			))}
		</rui-feed>
	),
	{ stylesheets: ['./feed.css'] },
);
