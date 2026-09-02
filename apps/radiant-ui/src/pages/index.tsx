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
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { CodeTabs } from '@/components/code-tabs';
import { HomeThemePicker } from '@/components/home-theme-picker/home-theme-picker';
import { previewExampleCode } from '@/data/home-code-examples';
import { BaseLayout } from '@/layouts/base-layout';
import { componentNavEntries, firstComponentHref, groupedComponentNavEntries } from '@/lib/component-nav';

const previewStylesExample = `@import '@ecopages/radiant-ui/themes/default';
@import '@ecopages/radiant-ui/styles.css';`;

const previewExample = await codeToHtml(previewExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

const previewStyles = await codeToHtml(previewStylesExample, {
	lang: 'css',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

const componentCount = componentNavEntries.length;
const firstActionsHref = firstComponentHref('Actions');

function highlightedCodeFigure(html: string): string {
	return `<figure data-rehype-pretty-code-figure class="home-code-block">${html}</figure>`;
}

const INSTALL_TABS = [
	{ id: 'npm', label: 'npm', code: 'npm install @ecopages/radiant-ui' },
	{ id: 'pnpm', label: 'pnpm', code: 'pnpm add @ecopages/radiant-ui' },
	{ id: 'bun', label: 'bun', code: 'bun add @ecopages/radiant-ui' },
];

const PREVIEW_TABS = [
	{
		id: 'preview',
		label: 'preview.tsx',
		html: highlightedCodeFigure(previewExample),
		content: previewExampleCode,
	},
	{
		id: 'styles',
		label: 'styles.css',
		html: highlightedCodeFigure(previewStyles),
		content: previewStylesExample,
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
		label: 'Get started',
		title: 'Learn the model',
		description:
			'Import focused modules, compose light-DOM views, and keep the public contract on the custom element.',
	},
	{
		href: '/docs/getting-started/theming',
		label: 'Theming',
		title: 'Compose packs, not palettes',
		description: 'Choose a colour profile, then layer spacing and radius. Components consume semantic roles.',
	},
	{
		href: '/docs/getting-started/tokens',
		label: 'Tokens',
		title: 'See what components consume',
		description: 'Colour roles, spacing, and radius scales with live swatches for every semantic token.',
	},
	{
		href: firstActionsHref,
		label: 'Components',
		title: `${componentCount} documented parts`,
		description: 'Each page pairs usage guidance with a playground that uses the real public API.',
	},
];

const PATH_STEPS = [
	'Read the overview, then install `@ecopages/radiant-ui`. Radiant, JSX, and Signals come along as peers.',
	'Load a theme and the component stylesheet. Start with Glacier, then compose spacing and radius packs.',
	'Import a focused module and compose the public JSX helpers in light DOM.',
	'Use the playgrounds to inspect props, states, and accessibility notes.',
];

type HomePathCardData = {
	href: string;
	title: string;
	description: string;
};

const PATH_CARDS: HomePathCardData[] = [
	{
		href: '/docs/getting-started/theming',
		title: 'Compose a theme',
		description: 'Import the default foundation, then layer the spacing and radius packs the product needs.',
	},
	{
		href: '/docs/getting-started/tokens',
		title: 'Read the token scales',
		description: 'Components consume semantic roles and geometry roles, not palette steps.',
	},
	{
		href: firstActionsHref,
		title: 'Start with a control',
		description: 'Open a component page and use the playground against the real public API.',
	},
];

const AGENT_LINKS = [
	{ href: '/skill.txt', label: 'skill.txt' },
	{ href: '/skill/SKILL.md', label: 'SKILL.md' },
	{ href: '/llms.txt', label: 'llms.txt' },
];

const ECOSYSTEM_PACKAGES = ['@ecopages/radiant-ui', '@ecopages/radiant', '@ecopages/jsx', '@ecopages/signals'];

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
			{ label: 'Radiant', href: 'https://radiant.ecopages.app', external: true },
			{ label: 'Radiant UI' },
			{ label: 'Scripts Injector', href: 'https://scripts-injector.ecopages.app', external: true },
			{ label: 'Logger', href: 'https://github.com/ecopages/logger', external: true },
		],
	},
	{
		title: 'Guides',
		links: [
			{ label: 'Introduction', href: '/docs/getting-started/introduction' },
			{ label: 'Theming', href: '/docs/getting-started/theming' },
			{ label: 'Tokens', href: '/docs/getting-started/tokens' },
		],
	},
	{
		title: 'Library',
		links: [
			{ label: 'Actions', href: firstActionsHref },
			{ label: 'Forms', href: firstComponentHref('Forms') },
			{ label: 'Layout', href: firstComponentHref('Layout') },
			{ label: 'Navigation', href: firstComponentHref('Navigation') },
		],
	},
	{
		title: 'Packages',
		links: [
			{
				label: '@ecopages/radiant-ui',
				href: 'https://www.npmjs.com/package/@ecopages/radiant-ui',
				external: true,
			},
			{ label: '@ecopages/radiant', href: 'https://www.npmjs.com/package/@ecopages/radiant', external: true },
			{ label: '@ecopages/jsx', href: 'https://www.npmjs.com/package/@ecopages/jsx', external: true },
			{ label: '@ecopages/signals', href: 'https://www.npmjs.com/package/@ecopages/signals', external: true },
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

const HomePreviewCluster = () => (
	<div class="home-cluster">
		<RuiButton>Save</RuiButton>
		<RuiButton variant="ghost">Cancel</RuiButton>
		<RuiChip variant="primary">light DOM</RuiChip>
		<RuiSwitch checked={true}>Notifications</RuiSwitch>
		<RuiInput id="home-preview-name" placeholder="Andrea" aria-label="Name" />
	</div>
);

const HomeHero = () => (
	<header class="home-header">
		<div class="home-hero">
			<div class="home-hero__text">
				<RuiHeading size="xl" class="home-header__heading">
					<RuiHeadingEyebrow>Radiant UI</RuiHeadingEyebrow>
					<RuiHeadingTitle as="h1">Accessible light-DOM components for Radiant hosts.</RuiHeadingTitle>
					<RuiHeadingDescription>
						Import focused modules, compose views in the document tree, and theme through semantic roles.
						Components ship accessible defaults; the document tree stays yours.
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
					<RuiButton href={firstActionsHref} variant="outline">
						Browse components
					</RuiButton>
				</div>
			</div>
			<div class="home-hero__code">
				<CodeTabs
					label="Preview source"
					tabs={PREVIEW_TABS}
					copyLabel="Copy code"
					defaultSelectedKey="preview"
				/>
				<div class="home-hero__demo">
					<HomePreviewCluster />
				</div>
			</div>
		</div>
	</header>
);

const HomeExplore = () => (
	<section>
		<RuiFeed label="Explore Radiant UI" class="home-cards">
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

const HomeTheme = () => (
	<section class="home-theme" aria-labelledby="home-theme-title">
		<RuiHeading size="sm">
			<RuiHeadingEyebrow>Theming</RuiHeadingEyebrow>
			<RuiHeadingTitle id="home-theme-title" as="h2">
				Remap this page
			</RuiHeadingTitle>
			<RuiHeadingDescription>
				Colour, spacing, and radius are packs. They restyle this document; the hero JSX stays the same.
			</RuiHeadingDescription>
		</RuiHeading>
		<HomeThemePicker />
	</section>
);

const HomeSpecimenGroup = ({ category, items }: { category: string; items: { href: string; title: string }[] }) => (
	<div class="home-specimen__group">
		<p class="home-specimen__category">{category}</p>
		<ul class="home-specimen__list">
			{items.map((item) => (
				<li>
					<a href={item.href}>{item.title}</a>
				</li>
			))}
		</ul>
	</div>
);

const HomeSpecimen = () => (
	<section class="home-specimen" aria-labelledby="home-specimen-title">
		<RuiHeading size="sm">
			<RuiHeadingEyebrow>Library</RuiHeadingEyebrow>
			<RuiHeadingTitle id="home-specimen-title" as="h2">
				{componentCount} components
			</RuiHeadingTitle>
		</RuiHeading>
		{groupedComponentNavEntries.map((group) => (
			<HomeSpecimenGroup category={group.category} items={group.items} />
		))}
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
	<div class="home-layout">
		<HomeHero />
		<main class="home-main">
			<HomeExplore />
			<HomeTheme />
			<HomeSpecimen />
			<HomePath />
		</main>
		<HomeSidebar />
		<HomeFooter />
	</div>
);

export default eco.page({
	layout: BaseLayout,
	dependencies: {
		components: [CodeTabs, HomeThemePicker],
		scripts: ['./index.script.ts'],
		stylesheets: ['./index.css'],
	},
	metadata: () => ({
		title: 'Radiant UI',
		description: 'Accessible light-DOM components for building interfaces with Radiant hosts.',
		url: '/',
	}),
	render: HomePage,
});
