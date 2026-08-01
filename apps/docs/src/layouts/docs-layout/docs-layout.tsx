import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import {
	RuiSidebar,
	RuiSidebarContent,
	RuiSidebarGroup,
	RuiSidebarGroupHeader,
	RuiSidebarMenu,
	RuiSidebarMenuButton,
	RuiSidebarMenuItem,
	RuiSidebarProvider,
	RuiSidebarSeparator,
} from '@ecopages/radiant-ui/sidebar';
import { RuiToc } from '@ecopages/radiant-ui/toc';
import { docsNav, type ContentNavGroup } from '@/lib/content-nav';

import { Banner } from '@/components/banner/banner';
import { CodeTabs } from '@/components/code-tabs';
import { BaseLayout } from '@/layouts/base-layout';
import { getGroupIcon } from './get-group-icon';

export type DocsLayoutProps = {
	children: JsxRenderable;
	class?: string;
};

const ECO_NAVIGATION_EVENTS = 'eco:page-load,eco:after-swap';

const DocsNavigation = ({ groups }: { groups: ContentNavGroup[] }) => {
	return (
		<>
			{groups.map((group, index) => (
				<>
					{index > 0 && <RuiSidebarSeparator aria-label="Section divider" />}
					<RuiSidebarGroup aria-label={group.name}>
						<RuiSidebarGroupHeader
							label={
								<>
									{getGroupIcon(group.name)}
									<span>{group.name}</span>
								</>
							}
						/>
						<RuiSidebarMenu
							aria-label={`${group.name} links`}
							matchActive
							scrollActiveOnMount={index === 0}
							navigationEvents={ECO_NAVIGATION_EVENTS}
						>
							{group.items.map((item) => (
								<RuiSidebarMenuItem>
									<RuiSidebarMenuButton as="a" href={item.href}>
										{item.title}
									</RuiSidebarMenuButton>
								</RuiSidebarMenuItem>
							))}
						</RuiSidebarMenu>
					</RuiSidebarGroup>
				</>
			))}
		</>
	);
};

export const DocsLayout = eco.component<DocsLayoutProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./docs-layout.css'],
		scripts: ['./docs-layout.script.tsx'],
		components: [BaseLayout, Banner, CodeTabs],
	},
	render: async ({ children, class: className }) => {
		return (
			<BaseLayout class={className} showDocsLink={false} sidebarId="docs-sidebar">
				<RuiSidebarProvider
					class="docs-layout"
					sidebar={
						<RuiSidebar
							id="docs-sidebar"
							collapsible="full"
							defaultOpen
							resizable={false}
							label="Documentation navigation"
							class="docs-layout__sidebar"
						>
							<RuiSidebarContent aria-label="Documentation navigation">
								<DocsNavigation groups={docsNav.groups} />
							</RuiSidebarContent>
						</RuiSidebar>
					}
				>
					<div class="docs-layout__content">
						<div class="prose">{children}</div>
						<radiant-docs-pagination class="docs-layout__pagination"></radiant-docs-pagination>
					</div>
					<RuiToc
						class="docs-layout__toc"
						target=".docs-layout__content"
						headingSelector="h2,h3"
						label="On this page"
						scrollOffset={120}
						navigationEvents={ECO_NAVIGATION_EVENTS}
					/>
				</RuiSidebarProvider>
			</BaseLayout>
		);
	},
});
