import { eco } from '@ecopages/core';
import { codeToHtml } from 'shiki';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { BaseLayout } from '@/layouts/base-layout';
import { CodeTabs } from '@/components/code-tabs';
import { RadiantJsxCounter as RadiantCounterDemo } from '@/components/radiant-counter/radiant-jsx-counter';
import { counterControllerExampleCode, counterElementExampleCode } from '@/data/home-code-examples';

const counterElementExample = await codeToHtml(counterElementExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

const counterControllerExample = await codeToHtml(counterControllerExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

const HomeCard = ({
	href,
	label,
	title,
	description,
}: {
	href: string;
	label: string;
	title: string;
	description: string;
}) => (
	<a href={href} class="home-card group">
		<article>
			<p class="home-card__label">{label}</p>
			<h1 class="home-card__title">{title}</h1>
			<p class="home-card__text">{description}</p>
		</article>
	</a>
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

const HomePage = () => {
	return (
		<div class="home-layout not-prose">
			<header class="home-header">
				<div class="home-hero">
					<div class="home-hero__text">
						<p class="home-header__subtitle">Radiant</p>
						<h1 class="home-header__title">Build reactive hosts with JSX and Signals.</h1>
						<p class="home-header__description">
							Radiant gives you one reactive host model for both custom elements and DOM-attached
							controllers. Use RadiantElement when the host owns its contract, or RadiantController when
							the HTML should stay authored outside the class. JSX and Signals stay optional companions.
						</p>

						<CodeTabs
							label="Package managers"
							tabs={[
								{
									id: 'npm',
									label: 'npm',
									code: 'npm install @ecopages/radiant @ecopages/jsx',
								},
								{
									id: 'pnpm',
									label: 'pnpm',
									code: 'pnpm add @ecopages/radiant @ecopages/jsx',
								},
								{
									id: 'bun',
									label: 'bun',
									code: 'bun add @ecopages/radiant @ecopages/jsx',
								},
							]}
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
							label="Host models"
							tabs={[
								{
									id: 'radiant-element',
									label: 'radiant-element.tsx',
									html: `<figure data-rehype-pretty-code-figure class="home-code-block">${counterElementExample}</figure>`,
									content: counterElementExampleCode,
								},
								{
									id: 'radiant-controller',
									label: 'radiant-controller.tsx',
									html: `<figure data-rehype-pretty-code-figure class="home-code-block">${counterControllerExample}</figure>`,
									content: counterControllerExampleCode,
								},
							]}
							copyLabel="Copy code"
							defaultSelectedKey="radiant-element"
						/>

						<div class="home-hero__demo">
							<RadiantCounterDemo value={0} />
						</div>
					</div>
				</div>
			</header>

			<main class="home-main">
				<section>
					<div class="home-cards">
						<HomeCard
							href="/docs/getting-started/introduction"
							label="Get Started"
							title="Learn the model"
							description="See how RadiantElement and RadiantController share one reactive host surface, and where JSX and Signals fit."
						/>
						<HomeCard
							href="/docs/components/radiant-element"
							label="Components"
							title="Choose the right host"
							description="Use RadiantElement for custom-element hosts. Reach for RadiantController when existing markup should stay authored outside the host class."
						/>
						<HomeCard
							href="/docs/decorators/prop"
							label="Decorators"
							title="Add intent without boilerplate"
							description="Typed decorators for public inputs, local state, DOM queries, events, and lifecycle across both host types."
						/>
						<HomeCard
							href="/docs/packages/signals-overview"
							label="Packages"
							title="Understand the package layers"
							description="Signals ships with radiant; jsx installs alongside radiant for TSX. Both sit on the shared reactive host model."
						/>
					</div>
				</section>

				<section class="home-path">
					<p class="home-card__label">Suggested Path</p>
					<ol class="home-path__list">
						<li>
							Read the overview, then install `@ecopages/radiant` and `@ecopages/jsx` for the standard
							setup.
						</li>
						<li>
							Start with RadiantElement when you own the custom-element contract, then learn when
							RadiantController is a better fit for authored DOM.
						</li>
						<li>Learn how signals, JSX bindings, and host decorators fit together.</li>
						<li>Use the examples to see element-owned and controller-owned flows assembled end to end.</li>
					</ol>

					<div class="mt-8 grid gap-3">
						<HomePathCard
							href="/docs/getting-started/installation"
							title="Install the ecosystem"
							description="Install radiant and jsx for the standard setup. Signals comes with radiant automatically."
						/>
						<HomePathCard
							href="/docs/context/context"
							title="Share state with context"
							description="Use the same context model across custom-element hosts and DOM-attached controllers."
						/>
						<HomePathCard
							href="/docs/examples/todo-app"
							title="Study a complete example"
							description="The todo app shows a render-owning RadiantElement host, child elements, context, and JSX working together."
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
					<p class="home-sidebar__label">Ecosystem</p>
					<div class="home-sidebar__tags">
						<span class="home-sidebar__tag">@ecopages/radiant</span>
						<span class="home-sidebar__tag">@ecopages/jsx</span>
						<span class="home-sidebar__tag">@ecopages/signals</span>
					</div>
				</div>
			</aside>
		</div>
	);
};

export default eco.page({
	layout: BaseLayout,
	dependencies: {
		components: [CodeTabs, RadiantCounterDemo],
		stylesheets: ['./index.css'],
	},
	render: HomePage,
});
