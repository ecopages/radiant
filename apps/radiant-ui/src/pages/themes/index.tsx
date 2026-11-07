import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import Canvas from '@/components/component-docs/canvas';
import { ThemeKit } from '@/components/theme-lab/theme-kit';
import { ThemeLabPicker } from '@/components/theme-lab/theme-lab-picker';
import { BaseLayout } from '@/layouts/base-layout';
import { COMPONENT_CATEGORY_ORDER, componentNavEntries } from '@/lib/component-nav';
import { themeLabStories } from '@/lib/theme-lab/theme-lab-stories';

const storiesBySlug = new Map(themeLabStories.map((entry) => [entry.slug, entry]));

const sections = COMPONENT_CATEGORY_ORDER.map((category) => ({
	category,
	id: category.toLowerCase().replaceAll(' ', '-'),
	items: componentNavEntries
		.filter((entry) => entry.category === category)
		.flatMap((entry) => {
			const story = storiesBySlug.get(entry.slug);
			return story ? [{ ...entry, ...story }] : [];
		}),
})).filter((section) => section.items.length > 0);

export default eco.page<{}, JsxRenderable>({
	layout: BaseLayout,
	dependencies: {
		stylesheets: ['./themes.css'],
		components: [ThemeLabPicker, ThemeKit, Canvas],
	},
	metadata: () => ({
		title: 'Themes | Radiant UI',
		description: 'Pick a Radiant theme and see every component in it at once.',
	}),
	render: () => (
		<div class="theme-lab unstyled">
			<aside class="theme-lab__aside" aria-label="Theme controls">
				<h1 class="theme-lab__title">Themes</h1>
				<p class="theme-lab__lede">
					Choose a theme and every component updates. Use the header toggle for light and dark.
				</p>
				<ThemeLabPicker />
				<nav class="theme-lab__jump" aria-label="Jump to a section">
					<ul>
						<li>
							<a href="#your-theme">Your theme</a>
						</li>
						{sections.map((section) => (
							<li>
								<a href={`#${section.id}`}>{section.category}</a>
							</li>
						))}
					</ul>
				</nav>
			</aside>
			<div class="theme-lab__content">
				<section class="theme-lab__kit" id="your-theme" aria-labelledby="theme-kit-title">
					<h2 class="theme-lab__section-title" id="theme-kit-title">
						Your theme
					</h2>
					<p class="theme-lab__lede">
						Start from any theme in the sidebar, tune its colors, pick fonts, then save it or copy the code.
						Your choice applies to every page of these docs until you reset it.
					</p>
					<ThemeKit />
				</section>
				{sections.map((section) => (
					<section class="theme-lab__section" id={section.id} aria-labelledby={`${section.id}-heading`}>
						<h2 class="theme-lab__section-title" id={`${section.id}-heading`}>
							{section.category}
						</h2>
						<div class="theme-lab__grid">
							{section.items.map((item) => (
								<article class="theme-lab__card" data-component={item.slug}>
									<header class="theme-lab__card-header">
										<h3>{item.title}</h3>
										<a href={item.href}>Docs</a>
									</header>
									<div class="theme-lab__card-body">
										<Canvas of={item.story} meta={item.meta} />
									</div>
								</article>
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	),
});
