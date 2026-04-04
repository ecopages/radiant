import type { EcoComponent } from '@ecopages/core';
import { codeToHtml } from 'shiki';
import { BaseLayout } from '@/layouts/base-layout';
import { transformerEscapeHtml } from '@/plugins/transformer-escape-html';
import { rawHtml } from '@/utils/raw-html';
import '../components/home-install-cmd.script';

const counterExample = await codeToHtml(
	`import { RadiantComponent, customElement, prop } from '@ecopages/radiant';

@customElement('radiant-counter')
export class RadiantCounter extends RadiantComponent {
  @prop({ type: Number, reflect: true }) value = 0;

  private readonly decrement = () => {
    if (this.value > 0) this.value -= 1;
  };

  private readonly increment = () => {
    this.value += 1;
  };

  override render() {
    return (
      <>
        <button type="button" on:click={this.decrement}>-</button>
        <span>{this.$.value}</span>
        <button type="button" on:click={this.increment}>+</button>
      </>
    );
  }
}`,
	{
		lang: 'tsx',
		themes: { light: 'light-plus', dark: 'dark-plus' },
		defaultColor: false,
	},
);

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
		<p class="home-card__label">{label}</p>
		<h3 class="home-card__title">{title}</h3>
		<p class="home-card__text">{description}</p>
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

const HomePage: EcoComponent = () => {
	return (
		<div class="home-layout not-prose">
			<header class="home-header">
				<div class="home-hero">
					<div class="home-hero__text">
						<p class="home-header__subtitle">Radiant Docs</p>
						<h1 class="home-header__title">
							Build typed custom elements with WebComponents, JSX, and Signals.
						</h1>
						<p class="home-header__description">
							Start with the core component model, add decorators only when they make intent clearer, and
							bring in JSX and Signals as your rendering and state needs grow, so you can adopt features
							incrementally while staying close to the browser through light DOM and standard web APIs.
						</p>

						<radiant-install-cmd class="home-install-cmd" prop:packages="@ecopages/radiant @ecopages/jsx" />

						<div class="home-header__actions">
							<a href="/docs/getting-started/introduction" class="button button--default">
								Read the overview
							</a>
							<a href="/docs/components/radiant-component" class="button button--outline">
								Start with RadiantComponent
							</a>
						</div>
					</div>

					<div class="home-hero__code">
						{rawHtml(
							`<figure data-rehype-pretty-code-figure class="home-code-block">${counterExample}</figure>`,
						)}
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
							description="Understand the component-first path, installation choices, and the patterns this docs set treats as the default."
						/>
						<HomeCard
							href="/docs/components/radiant-component"
							label="Components"
							title="Build with RadiantComponent"
							description="Use RadiantComponent as the main host API. Reach for RadiantElement when you need lower-level DOM control."
						/>
						<HomeCard
							href="/docs/decorators/prop"
							label="Decorators"
							title="Add intent without boilerplate"
							description="Model public props, local state, querying, events, and utility method behavior with a small set of focused decorators."
						/>
						<HomeCard
							href="/docs/packages/signals-overview"
							label="Packages"
							title="Bring in JSX and Signals"
							description="Use the runtime package for typed JSX rendering and the signals package for renderer-agnostic reactivity."
						/>
					</div>
				</section>

				<section class="home-path">
					<p class="home-card__label">Suggested Path</p>
					<ol class="home-path__list">
						<li>Read the overview and install the package set you need.</li>
						<li>Start with RadiantComponent, then learn the small decorator surface around it.</li>
						<li>Add JSX and Signals once the base component model is clear.</li>
						<li>Use the examples to see the recommended architecture assembled end to end.</li>
					</ol>

					<div class="mt-8 grid gap-3">
						<HomePathCard
							href="/docs/getting-started/installation"
							title="Install the ecosystem"
							description="Pick Radiant alone or pair it with JSX and Signals."
						/>
						<HomePathCard
							href="/docs/context/context"
							title="Share state with context"
							description="Move provider, consumer, and selector patterns into one place."
						/>
						<HomePathCard
							href="/docs/examples/todo-app"
							title="Study a complete example"
							description="The todo app shows RadiantComponent, RadiantElement, context, and JSX together."
						/>
					</div>
				</section>
			</main>

			<aside class="home-sidebar">
				<div class="home-sidebar__section">
					<p class="home-sidebar__label">Repository</p>
					<a href="https://github.com/radiant-org/radiant" class="home-sidebar__value home-sidebar__link">
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
						radiant-org/radiant
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
						<span class="home-sidebar__tag">@radiant/core</span>
						<span class="home-sidebar__tag">@radiant/jsx</span>
						<span class="home-sidebar__tag">@radiant/signals</span>
					</div>
				</div>
			</aside>
		</div>
	);
};

HomePage.config = {
	layout: BaseLayout,
	dependencies: {
		stylesheets: ['./index.css', '../components/home-install-cmd.css'],
		scripts: ['../components/home-install-cmd.script.tsx'],
	},
};

export default HomePage;
