import { z } from 'zod';
import type { ComponentCategory } from '@/lib/playground';

const componentCategories = [
	'Actions',
	'Forms',
	'Layout',
	'Navigation',
	'Overlays',
	'Feedback',
	'Data display',
] as const satisfies readonly ComponentCategory[];

export const componentDocsFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	category: z.enum(componentCategories),
});

export type ComponentDocsFrontmatter = z.infer<typeof componentDocsFrontmatterSchema>;
