import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { docsNav, type ContentNavGroup } from '@/lib/content-nav';

import { Banner } from '@/components/banner/banner';
import { BaseLayout } from '@/layouts/base-layout';
import { getGroupIcon } from './get-group-icon';

export type DocsLayoutProps = {
	children: JsxRenderable;
	class?: string;
};

const DocsNavigation = ({ groups }: { groups: ContentNavGroup[] }) => {
	return (
		<nav aria-label="Main Navigation">
			<ul class="docs-layout__nav-list">
				{groups.map((group, index) => (
					<>
						{index > 0 && <li class="docs-layout__nav-separator" />}
						<li>
							<div class="docs-layout__nav-group">
								<span class="docs-layout__nav-group-icon">{getGroupIcon(group.name)}</span>
								<span>{group.name}</span>
							</div>
							<ul class="docs-layout__nav-group-list">
								{group.items.map((item) => (
									<li>
										<a href={item.href} data-nav-link>
											{item.title}
										</a>
									</li>
								))}
							</ul>
						</li>
					</>
				))}
			</ul>
		</nav>
	);
};

export const DocsLayout = eco.component<DocsLayoutProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./docs-layout.css'],
		scripts: ['./docs-layout.script.tsx'],
		components: [BaseLayout, Banner],
	},
	render: async ({ children, class: className }) => {
		return (
			<BaseLayout class={`docs-layout ${className ?? ''}`.trim()} showBurger showDocsLink={false}>
				<>
					<radiant-navigation
						class="docs-layout__aside hidden md:block"
						data-eco-persist="docs-sidebar"
						data-testid="docs-sidebar"
					>
						<DocsNavigation groups={docsNav.groups} />
					</radiant-navigation>
					<div class="docs-layout__content">
						<div class="prose">{children}</div>
						<radiant-docs-pagination class="docs-layout__pagination"></radiant-docs-pagination>
					</div>
					<radiant-toc class="docs-layout__toc"></radiant-toc>
				</>
			</BaseLayout>
		);
	},
});
