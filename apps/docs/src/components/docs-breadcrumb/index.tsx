import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import {
	RuiBreadcrumb,
	RuiBreadcrumbItem,
	RuiBreadcrumbLink,
	RuiBreadcrumbList,
	RuiBreadcrumbPage,
	RuiBreadcrumbSeparator,
} from '@ecopages/radiant-ui/breadcrumb';
import type { Entry } from 'ecopages:content/docs';
import { docsNav } from '@/lib/content-nav';

export const DocsBreadcrumb = eco.component<{ entry: Entry }, JsxRenderable>({
	render: ({ entry }) => {
		const group = docsNav.groups.find((navGroup) => navGroup.items.some((item) => item.slug === entry.slug));
		const groupLink = group?.items[0];
		const docsHref = docsNav.groups[0]?.items[0]?.href ?? '/';

		return (
			<div class="unstyled">
				<RuiBreadcrumb label="Page location">
					<RuiBreadcrumbList>
						<RuiBreadcrumbItem>
							<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
						</RuiBreadcrumbItem>
						<RuiBreadcrumbSeparator />
						<RuiBreadcrumbItem>
							<RuiBreadcrumbLink href={docsHref}>Docs</RuiBreadcrumbLink>
						</RuiBreadcrumbItem>
						{group && groupLink ? (
							<>
								<RuiBreadcrumbSeparator />
								<RuiBreadcrumbItem>
									<RuiBreadcrumbLink href={groupLink.href}>{group.name}</RuiBreadcrumbLink>
								</RuiBreadcrumbItem>
							</>
						) : null}
						<RuiBreadcrumbSeparator />
						<RuiBreadcrumbItem>
							<RuiBreadcrumbPage>{entry.title}</RuiBreadcrumbPage>
						</RuiBreadcrumbItem>
					</RuiBreadcrumbList>
				</RuiBreadcrumb>
			</div>
		);
	},
});
