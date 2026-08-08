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

export type DocsBreadcrumbItem = {
	label: string;
	href?: string;
};

export type DocsBreadcrumbProps = {
	items: DocsBreadcrumbItem[];
};

const DocsBreadcrumb = eco.component<DocsBreadcrumbProps, JsxRenderable>({
	dependencies: { stylesheets: ['./docs-breadcrumb.css'] },
	render: ({ items }) => {
		if (items.length === 0) return null;

		return (
			<RuiBreadcrumb class="docs-breadcrumb unstyled" label="Breadcrumb">
				<RuiBreadcrumbList>
					{items.map((item, index) => {
						const isLast = index === items.length - 1;

						return (
							<>
								{index > 0 ? <RuiBreadcrumbSeparator /> : null}
								<RuiBreadcrumbItem>
									{isLast ? (
										<RuiBreadcrumbPage>{item.label}</RuiBreadcrumbPage>
									) : item.href ? (
										<RuiBreadcrumbLink href={item.href}>{item.label}</RuiBreadcrumbLink>
									) : (
										<span class="rui-breadcrumb__segment">{item.label}</span>
									)}
								</RuiBreadcrumbItem>
							</>
						);
					})}
				</RuiBreadcrumbList>
			</RuiBreadcrumb>
		);
	},
});

export default DocsBreadcrumb;
