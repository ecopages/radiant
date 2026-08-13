import { eco } from '@ecopages/core';
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

const HomeFeedArticle = ({
	href,
	label,
	title,
	description,
	position,
}: {
	href: string;
	label: string;
	title: string;
	description: string;
	position: number;
}) => (
	<RuiFeedArticle posinset={position} setsize={4} tabindex={-1}>
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

const HomePathCard = ({ href, title, description }: { href: string; title: string; description: string }) => (
	<a
		href={href}
		class="flex flex-col gap-1 rounded-sm border border-border bg-background p-4 text-on-background no-underline transition-colors hover:bg-secondary-container/30"
	>
		<p class="text-sm font-semibold">{title}</p>
		<p class="text-sm text-on-background/70">{description}</p>
	</a>
);

const HomePreviewCluster = () => (
	<div class="home-cluster">
		<RuiButton>Save</RuiButton>
		<RuiButton variant="outline">Cancel</RuiButton>
		<RuiChip variant="primary">light DOM</RuiChip>
		<RuiSwitch checked={true}>Notifications</RuiSwitch>
		<RuiInput id="home-preview-name" placeholder="Andrea" aria-label="Name" />
	</div>
);

const HomePage = () => {
	return (
		<div class="home-layout">
			<header class="home-header">
				<div class="home-hero">
					<div class="home-hero__text">
						<RuiHeading size="xl" class="home-header__heading">
							<RuiHeadingEyebrow>Radiant UI</RuiHeadingEyebrow>
							<RuiHeadingTitle as="h1">
								Accessible light-DOM components for Radiant hosts.
							</RuiHeadingTitle>
							<RuiHeadingDescription>
								Import focused modules, compose views in the document tree, and theme through semantic
								roles. Components ship accessible defaults; the document tree stays yours.
							</RuiHeadingDescription>
						</RuiHeading>

						<CodeTabs
							label="Package managers"
							tabs={[
								{
									id: 'npm',
									label: 'npm',
									code: 'npm install @ecopages/radiant-ui @ecopages/radiant',
								},
								{
									id: 'pnpm',
									label: 'pnpm',
									code: 'pnpm add @ecopages/radiant-ui @ecopages/radiant',
								},
								{
									id: 'bun',
									label: 'bun',
									code: 'bun add @ecopages/radiant-ui @ecopages/radiant',
								},
							]}
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
							tabs={[
								{
									id: 'preview',
									label: 'preview.tsx',
									html: `<figure data-rehype-pretty-code-figure class="home-code-block">${previewExample}</figure>`,
									content: previewExampleCode,
								},
								{
									id: 'styles',
									label: 'styles.css',
									html: `<figure data-rehype-pretty-code-figure class="home-code-block">${previewStyles}</figure>`,
									content: previewStylesExample,
								},
							]}
							copyLabel="Copy code"
							defaultSelectedKey="preview"
						/>

						<div class="home-hero__demo">
							<HomePreviewCluster />
						</div>
					</div>
				</div>
			</header>

			<main class="home-main">
				<section>
					<RuiFeed label="Explore Radiant UI" class="home-cards">
						<HomeFeedArticle
							href="/docs/getting-started/introduction"
							label="Get started"
							title="Learn the model"
							description="Import focused modules, compose light-DOM views, and keep the public contract on the custom element."
							position={1}
						/>
						<HomeFeedArticle
							href="/docs/getting-started/theming"
							label="Theming"
							title="Compose packs, not palettes"
							description="Choose a colour profile, then layer spacing and radius. Components consume semantic roles."
							position={2}
						/>
						<HomeFeedArticle
							href="/docs/getting-started/tokens"
							label="Tokens"
							title="See what components consume"
							description="Colour roles, spacing, and radius scales with live swatches for every semantic token."
							position={3}
						/>
						<HomeFeedArticle
							href={firstActionsHref}
							label="Components"
							title={`${componentCount} documented parts`}
							description="Each page pairs usage guidance with a playground that uses the real public API."
							position={4}
						/>
					</RuiFeed>
				</section>

				<section class="home-theme" aria-labelledby="home-theme-title">
					<RuiHeading size="sm">
						<RuiHeadingEyebrow>Theming</RuiHeadingEyebrow>
						<RuiHeadingTitle id="home-theme-title" as="h2">
							Remap this page
						</RuiHeadingTitle>
						<RuiHeadingDescription>
							Colour, spacing, and radius are packs. They restyle this document; the hero JSX stays the
							same.
						</RuiHeadingDescription>
					</RuiHeading>
					<HomeThemePicker />
				</section>

				<section class="home-specimen" aria-labelledby="home-specimen-title">
					<RuiHeading size="sm">
						<RuiHeadingEyebrow>Library</RuiHeadingEyebrow>
						<RuiHeadingTitle id="home-specimen-title" as="h2">
							{componentCount} components
						</RuiHeadingTitle>
					</RuiHeading>
					{groupedComponentNavEntries.map((group) => (
						<div class="home-specimen__group">
							<p class="home-specimen__category">{group.category}</p>
							<ul class="home-specimen__list">
								{group.items.map((item) => (
									<li>
										<a href={item.href}>{item.title}</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</section>

				<section class="home-path">
					<RuiHeading as="header" size="sm">
						<RuiHeadingEyebrow>Suggested path</RuiHeadingEyebrow>
						<RuiHeadingTitle as="h2">Build confidence step by step</RuiHeadingTitle>
					</RuiHeading>
					<ol class="home-path__list">
						<li>Read the overview, then install `@ecopages/radiant-ui` and `@ecopages/radiant`.</li>
						<li>
							Load a theme and the component stylesheet. Start with Glacier, then compose spacing and
							radius packs.
						</li>
						<li>Import a focused module and compose the public JSX helpers in light DOM.</li>
						<li>Use the playgrounds to inspect props, states, and accessibility notes.</li>
					</ol>

					<div class="mt-8 grid gap-3">
						<HomePathCard
							href="/docs/getting-started/theming"
							title="Compose a theme"
							description="Import the default foundation, then layer the spacing and radius packs the product needs."
						/>
						<HomePathCard
							href="/docs/getting-started/tokens"
							title="Read the token scales"
							description="Components consume semantic roles and geometry roles, not palette steps."
						/>
						<HomePathCard
							href={firstActionsHref}
							title="Start with a control"
							description="Open a component page and use the playground against the real public API."
						/>
					</div>
				</section>
			</main>

			<aside class="home-sidebar">
				<div class="home-sidebar__section">
					<p class="home-sidebar__label">Repository</p>
					<a href="https://github.com/ecopages/radiant" class="home-sidebar__value home-sidebar__link">
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
							<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
						</svg>
						ecopages/radiant
					</a>
				</div>

				<div class="home-sidebar__section">
					<p class="home-sidebar__label">License</p>
					<p class="home-sidebar__value">
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
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
						</svg>
						MIT
					</p>
				</div>

				<div class="home-sidebar__section">
					<p class="home-sidebar__label">For agents</p>
					<div class="home-sidebar__tags">
						<RuiButton href="/skill.txt" variant="outline" size="sm" class="font-mono">
							skill.txt
						</RuiButton>
						<RuiButton href="/skill/SKILL.md" variant="outline" size="sm" class="font-mono">
							SKILL.md
						</RuiButton>
						<RuiButton href="/llms.txt" variant="outline" size="sm" class="font-mono">
							llms.txt
						</RuiButton>
					</div>
				</div>

				<div class="home-sidebar__section">
					<p class="home-sidebar__label">Ecosystem</p>
					<div class="home-sidebar__tags">
						<RuiChip class="font-mono">@ecopages/radiant-ui</RuiChip>
						<RuiChip class="font-mono">@ecopages/radiant</RuiChip>
						<RuiChip class="font-mono">@ecopages/jsx</RuiChip>
					</div>
				</div>
			</aside>

			<footer class="home-footer">
				<p>
					Made with{' '}
					<a href="https://github.com/ecopages/ecopages" target="_blank" rel="noopener noreferrer">
						Ecopages
					</a>
					© {new Date().getFullYear()}
				</p>
			</footer>
		</div>
	);
};

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
	}),
	render: HomePage,
});
