import type { ComponentCategory } from '@/content/components';
import type { DocsBreadcrumbItem } from '@/components/docs-breadcrumb/docs-breadcrumb';

export function buildComponentDocsBreadcrumb(category: ComponentCategory, title: string): DocsBreadcrumbItem[] {
	return [{ label: 'Components', href: '/docs/button' }, { label: category }, { label: title }];
}

export function buildIntroductionBreadcrumb(): DocsBreadcrumbItem[] {
	return [{ label: 'Getting started' }, { label: 'Introduction' }];
}
