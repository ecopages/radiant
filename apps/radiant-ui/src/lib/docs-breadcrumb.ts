import type { ComponentCategory } from '@/lib/playground';
import type { DocsBreadcrumbItem } from '@/components/docs-breadcrumb/docs-breadcrumb';

export function buildComponentDocsBreadcrumb(category: ComponentCategory, title: string): DocsBreadcrumbItem[] {
	return [
		{ label: 'Components', href: '/components/button' },
		{ label: category },
		{ label: title },
	];
}

export function buildIntroductionBreadcrumb(): DocsBreadcrumbItem[] {
	return [{ label: 'Getting started' }, { label: 'Introduction' }];
}
