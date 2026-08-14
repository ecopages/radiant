import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { codeToHtml } from 'shiki';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import {
	RuiFeed,
	RuiFeedArticle,
	RuiFeedArticleActions,
	RuiFeedArticleContent,
	RuiFeedArticleHeader,
} from '@ecopages/radiant-ui/feed';
import { RuiHeading, RuiHeadingDescription, RuiHeadingEyebrow, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { BaseLayout } from '@/layouts/base-layout';
import { CodeTabs } from '@/components/code-tabs';
import { RadiantJsxCounter as RadiantCounterDemo } from '@/components/radiant-counter/radiant-jsx-counter';
import { counterElementExampleCode } from '@/data/home-code-examples';

const counterElementExample = await codeToHtml(counterElementExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

function highlightedCodeFigure(html: string): string {
	return `<figure data-rehype-pretty-code-figure class="home-code-block">${html}</figure>`;
}

const INSTALL_TABS = [
	{ id: 'npm', label: 'npm', code: 'npm install @ecopages/radiant @ecopages/jsx' },
	{ id: 'pnpm', label: 'pnpm', code: 'pnpm add @ecopages/radiant @ecopages/jsx' },
	{ id: 'bun', label: 'bun', code: 'bun add @ecopages/radiant @ecopages/jsx' },
];

const COUNTER_EXAMPLE_TABS = [
	{
		id: 'radiant-counter',
		label: 'radiant-counter.tsx',
		html: highlightedCodeFigure(counterElementExample),
		content: counterElementExampleCode,
	},
];

type HomeFeedArticleData = {
	href: string;
	label: string;
	title: string;
	description: string;
};

const EXPLORE_ARTICLES: HomeFeedArticleData[] = [
	{
		href: '/docs/getting-started/introduction',
		label: 'Get Started',
		title: 'Learn the model',
		description:
			'See how RadiantElement and RadiantController share one reactive host surface. Signals comes with Radiant; JSX is the TSX layer.',
	},
	{
		href: '/docs/components/radiant-element',
		label: 'Components',
		title: 'Choose the right host',
		description:
			'Use RadiantElement for custom-element hosts. Reach for RadiantController when existing markup should stay authored outside the host class.',
	},
	{
		href: '/docs/decorators/prop',
		label: 'Decorators',
		title: 'Add intent without boilerplate',
		description:
			'Typed decorators for public inputs, local state, DOM queries, events, and lifecycle across both host types.',
	},
	{
		href: '/docs/packages/signals-overview',
		label: 'Packages',
		title: 'Understand the package layers',
		description:
			'Signals ships with radiant; jsx installs alongside radiant for TSX. Both sit on the shared reactive host model.',
	},
];

const PATH_STEPS = [
	'Read the overview, then install `@ecopages/radiant` and `@ecopages/jsx` for the standard setup.',
	'Start with RadiantElement when you own the custom-element contract, then learn when RadiantController is a better fit for authored DOM.',
	'Learn how signals, JSX bindings, and host decorators fit together.',
	'Use the examples to see element-owned and controller-owned flows assembled end to end.',
];

type HomePathCardData = {
	href: string;
	title: string;
	description: string;
};

const PATH_CARDS: HomePathCardData[] = [
	{
		href: '/docs/getting-started/installation',
		title: 'Install the ecosystem',
		description: 'Install radiant and jsx for the standard setup. Signals comes with radiant automatically.',
	},
	{
		href: '/docs/context/context',
		title: 'Share state with context',
		description: 'Use the same context model across custom-element hosts and DOM-attached controllers.',
	},
	{
		href: '/docs/examples/todo-app',
		title: 'Study a complete example',
		description:
			'The todo app shows a render-owning RadiantElement host, child elements, context, and JSX working together.',
	},
];

const AGENT_LINKS = [
	{ href: '/skill.txt', label: 'skill.txt' },
	{ href: '/skill/SKILL.md', label: 'SKILL.md' },
	{ href: '/llms.txt', label: 'llms.txt' },
];

const ECOSYSTEM_PACKAGES = ['@ecopages/radiant', '@ecopages/jsx', '@ecopages/signals'];

type HomeFooterLink = {
	label: string;
	href?: string;
	external?: boolean;
};

type HomeFooterColumnData = {
	title: string;
	links: HomeFooterLink[];
};

const HOME_FOOTER_COLUMNS: HomeFooterColumnData[] = [
	{
		title: 'Ecosystem',
		links: [
			{ label: 'Ecopages', href: 'https://ecopages.app', external: true },
			{ label: 'Radiant' },
			{ label: 'Radiant UI', href: 'https://radiant-ui.ecopages.app', external: true },
			{ label: 'Scripts Injector', href: 'https://scripts-injector.ecopages.app', external: true },
			{ label: 'Logger', href: 'https://github.com/ecopages/logger', external: true },
		],
	},
	{
		title: 'Guides',
		links: [
			{ label: 'Introduction', href: '/docs/getting-started/introduction' },
			{ label: 'Installation', href: '/docs/getting-started/installation' },
			{ label: 'Signals', href: '/docs/packages/signals-overview' },
			{ label: 'JSX', href: '/docs/packages/jsx-overview' },
		],
	},
	{
		title: 'Hosts',
		links: [
			{ label: 'RadiantElement', href: '/docs/components/radiant-element' },
			{ label: 'RadiantController', href: '/docs/components/radiant-controller' },
			{ label: 'Slots', href: '/docs/components/slots' },
		],
	},
	{
		title: 'Packages',
		links: [
			{ label: '@ecopages/radiant', href: 'https://www.npmjs.com/package/@ecopages/radiant', external: true },
			{ label: '@ecopages/signals', href: 'https://www.npmjs.com/package/@ecopages/signals', external: true },
			{ label: '@ecopages/jsx', href: 'https://www.npmjs.com/package/@ecopages/jsx', external: true },
			{
				label: '@ecopages/radiant-ui',
				href: 'https://www.npmjs.com/package/@ecopages/radiant-ui',
				external: true,
			},
			{
				label: '@ecopages/vite-plugin-radiant',
				href: 'https://www.npmjs.com/package/@ecopages/vite-plugin-radiant',
				external: true,
			},
		],
	},
];

const HomeIcon = ({ children }: { children: JsxRenderable }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{children}
	</svg>
);

const GitHubIcon = () => (
	<HomeIcon>
		<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
	</HomeIcon>
);

const LockIcon = () => (
	<HomeIcon>
		<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
		<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
	</HomeIcon>
);

const HomeFeedArticle = ({
	href,
	label,
	title,
	description,
	position,
	setsize,
}: HomeFeedArticleData & { position: number; setsize: number }) => (
	<RuiFeedArticle posinset={position} setsize={setsize} tabindex={-1}>
		<RuiFeedArticleHeader>
			<RuiHeading size="sm">
				<RuiHeadingEyebrow>{label}</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h2">{title}</RuiHeadingTitle>
			</RuiHeading>
		</RuiFeedArticleHeader>
		<RuiFeedArticleContent>
			<p>{description}</p>
		</RuiFeedArticleContent>
		<RuiFeedArticleActions class="mt-auto">
			<RuiButton href={href} variant="link" size="none">
				Explore {label}
			</RuiButton>
		</RuiFeedArticleActions>
	</RuiFeedArticle>
);

const HomePathCard = ({ href, title, description }: HomePathCardData) => (
	<a
		href={href}
		class="flex flex-col gap-1 rounded-sm border border-border bg-background p-4 text-on-background no-underline transition-colors hover:bg-secondary-container/30"
	>
		<p class="text-sm font-semibold">{title}</p>
		<p class="text-sm text-on-background/70">{description}</p>
	</a>
);

const HomeFooterNavItem = ({ link }: { link: HomeFooterLink }) => (
	<li>
		{link.href ? (
			<a href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
				{link.label}
			</a>
		) : (
			<span aria-current="page">{link.label}</span>
		)}
	</li>
);

const HomeFooterColumn = ({ title, links }: HomeFooterColumnData) => (
	<div class="home-footer__col">
		<p class="home-footer__label">{title}</p>
		<ul class="home-footer__list">
			{links.map((link) => (
				<HomeFooterNavItem link={link} />
			))}
		</ul>
	</div>
);

const HomeFooterBar = () => (
	<div class="home-footer__bar">
		<p>
			Created by{' '}
			<a href="https://github.com/andeeplus" target="_blank" rel="noopener noreferrer">
				andeeplus
			</a>
		</p>
		<p>
			Built with{' '}
			<a href="https://github.com/ecopages/ecopages" target="_blank" rel="noopener noreferrer">
				Ecopages
			</a>
			© {new Date().getFullYear()}
		</p>
	</div>
);

const HomeFooter = () => (
	<footer class="home-footer">
		<nav class="home-footer__nav" aria-label="Ecopages ecosystem">
			{HOME_FOOTER_COLUMNS.map((column) => (
				<HomeFooterColumn title={column.title} links={column.links} />
			))}
		</nav>
		<HomeFooterBar />
	</footer>
);

const HomeSidebarSection = ({ label, children }: { label: string; children: JsxRenderable }) => (
	<div class="home-sidebar__section">
		<p class="home-sidebar__label">{label}</p>
		{children}
	</div>
);

const HomeSidebar = () => (
	<aside class="home-sidebar">
		<HomeSidebarSection label="Repository">
			<a href="https://github.com/ecopages/radiant" class="home-sidebar__value home-sidebar__link">
				<GitHubIcon />
				ecopages/radiant
			</a>
		</HomeSidebarSection>
		<HomeSidebarSection label="License">
			<p class="home-sidebar__value">
				<LockIcon />
				MIT
			</p>
		</HomeSidebarSection>
		<HomeSidebarSection label="For agents">
			<div class="home-sidebar__tags">
				{AGENT_LINKS.map((link) => (
					<RuiButton href={link.href} variant="outline" size="sm" class="font-mono">
						{link.label}
					</RuiButton>
				))}
			</div>
		</HomeSidebarSection>
		<HomeSidebarSection label="Ecosystem">
			<div class="home-sidebar__tags">
				{ECOSYSTEM_PACKAGES.map((name) => (
					<RuiChip class="font-mono">{name}</RuiChip>
				))}
			</div>
		</HomeSidebarSection>
	</aside>
);

const HomeHero = () => (
	<header class="home-header">
		<div class="home-hero">
			<div class="home-hero__text">
				<RuiHeading size="xl" class="home-header__heading">
					<RuiHeadingEyebrow>Radiant</RuiHeadingEyebrow>
					<RuiHeadingTitle as="h1">Build reactive hosts with JSX and Signals.</RuiHeadingTitle>
					<RuiHeadingDescription>
						Radiant gives you one reactive host model for both custom elements and DOM-attached controllers.
						Use RadiantElement when the host owns its contract, or RadiantController when the HTML should
						stay authored outside the class. Signals ships with Radiant. JSX stays the optional companion
						for TSX.
					</RuiHeadingDescription>
				</RuiHeading>
				<CodeTabs
					label="Package managers"
					tabs={INSTALL_TABS}
					copyLabel="Copy install command"
					defaultSelectedKey="npm"
				/>
				<div class="home-header__actions">
					<RuiButton href="/docs/getting-started/introduction">Read the overview</RuiButton>
					<RuiButton href="/docs/components/radiant-element" variant="outline">
						Start with RadiantElement
					</RuiButton>
				</div>
			</div>
			<div class="home-hero__code">
				<CodeTabs
					label="Example"
					tabs={COUNTER_EXAMPLE_TABS}
					copyLabel="Copy code"
					defaultSelectedKey="radiant-counter"
				/>
				<div class="home-hero__demo">
					<RadiantCounterDemo value={0} />
				</div>
			</div>
		</div>
	</header>
);

const HomeExplore = () => (
	<section>
		<RuiFeed label="Explore Radiant" class="home-cards">
			{EXPLORE_ARTICLES.map((article, index) => (
				<HomeFeedArticle
					href={article.href}
					label={article.label}
					title={article.title}
					description={article.description}
					position={index + 1}
					setsize={EXPLORE_ARTICLES.length}
				/>
			))}
		</RuiFeed>
	</section>
);

const HomePath = () => (
	<section class="home-path">
		<RuiHeading as="header" size="sm">
			<RuiHeadingEyebrow>Suggested path</RuiHeadingEyebrow>
			<RuiHeadingTitle as="h2">Build confidence step by step</RuiHeadingTitle>
		</RuiHeading>
		<ol class="home-path__list">
			{PATH_STEPS.map((step) => (
				<li>{step}</li>
			))}
		</ol>
		<div class="mt-8 grid gap-3">
			{PATH_CARDS.map((card) => (
				<HomePathCard href={card.href} title={card.title} description={card.description} />
			))}
		</div>
	</section>
);

const HomePage = () => (
	<div class="home-layout not-prose">
		<HomeHero />
		<main class="home-main">
			<HomeExplore />
			<HomePath />
		</main>
		<HomeSidebar />
		<HomeFooter />
	</div>
);

export default eco.page({
	layout: BaseLayout,
	dependencies: {
		components: [CodeTabs, RadiantCounterDemo],
		stylesheets: ['./index.css'],
	},
	render: HomePage,
});
