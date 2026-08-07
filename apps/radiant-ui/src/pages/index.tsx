import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { CodeTabs } from '@/components/code-tabs';
import Demo from '@/components/component-docs/demo';
import { meta as ButtonMeta, Default as ButtonDefault } from '@/content/stories/button';
import { COMPONENT_CATEGORY_ORDER, componentNavEntries } from '@/lib/component-nav';
import { HomeLayout } from '@/layouts/home-layout';

const categoryCards = COMPONENT_CATEGORY_ORDER.map((category) => {
	const items = componentNavEntries.filter((entry) => entry.category === category);
	const first = items[0];
	return {
		category,
		count: items.length,
		href: first ? `/components/${first.slug}` : '/components/button',
		description: `Browse ${items.length} ${category.toLowerCase()} components with interactive playgrounds.`,
	};
});

const suggestedPath = [
	{
		href: '/docs/introduction',
		title: 'Read the introduction',
		description: 'Learn how Radiant UI components fit into Radiant applications.',
	},
	{
		href: '/components/button',
		title: 'Start with Button',
		description: 'Explore variants, sizes, and toggle behavior in the playground.',
	},
	{
		href: '/components/form',
		title: 'Build a form',
		description: 'Compose fields, validation, and submission with RuiForm.',
	},
	{
		href: '/components/dialog',
		title: 'Add overlays',
		description: 'Use Dialog and Popover for focused tasks without leaving context.',
	},
];

export default eco.page<{}, JsxRenderable>({
	layout: HomeLayout,
	dependencies: {
		components: [CodeTabs, Demo],
		scripts: [
			'../components/component-docs/canvas.script.tsx',
			'../components/component-docs/controls.script.tsx',
			'../components/component-docs/code.script.tsx',
		],
		stylesheets: ['./index.css', '../components/component-docs/component-docs.css'],
	},
	metadata: () => ({
		title: 'Radiant UI',
		description:
			'Accessible components for Radiant applications, with interactive documentation and real prop playgrounds.',
	}),
	render: () => (
		<div class="home-layout not-prose">
			<header class="home-header">
				<p class="home-header__subtitle">Radiant UI</p>
				<h1 class="home-header__title">Build interfaces with accessible, composable components.</h1>
				<p class="home-header__description">
					Radiant UI ships focused modules, predictable props, and accessible defaults. Each component page
					pairs implementation guidance with a playground that uses the real public API.
				</p>
				<CodeTabs
					class="home-code-tabs"
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
					defaultSelectedKey="pnpm"
				/>
				<div class="home-header__actions">
					<RuiButton href="/docs/introduction">Read the introduction</RuiButton>
					<RuiButton href="/components/button" variant="outline">
						Explore components
					</RuiButton>
				</div>
			</header>

			<section class="docs-home-workbench" aria-labelledby="try-button">
				<h2 class="home-section__title" id="try-button">
					Try Button
				</h2>
				<p class="docs-lede">
					Adjust real props and copy the resulting example. Every component page follows this pattern.
				</p>
				<Demo of={ButtonDefault} meta={ButtonMeta} />
			</section>

			<section aria-labelledby="browse-by-category">
				<h2 class="home-section__title" id="browse-by-category">
					Browse by category
				</h2>
				<div class="home-cards">
					{categoryCards.map((card) => (
						<a href={card.href} class="home-card">
							<p class="home-card__label">
								{card.category} ({card.count})
							</p>
							<h3 class="home-card__title">{card.category}</h3>
							<p class="home-card__text">{card.description}</p>
						</a>
					))}
				</div>
			</section>

			<section aria-labelledby="suggested-path">
				<h2 class="home-section__title" id="suggested-path">
					Suggested path
				</h2>
				<div class="home-path">
					{suggestedPath.map((step) => (
						<a href={step.href}>
							<strong>{step.title}</strong>
							<span>{step.description}</span>
						</a>
					))}
				</div>
			</section>
		</div>
	),
});
