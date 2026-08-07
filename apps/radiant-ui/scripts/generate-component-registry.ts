import { writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'src/pages/components');
const registryPath = path.join(root, 'src/lib/component-docs/registry.ts');
const navRegistryPath = path.join(root, 'src/lib/component-docs/nav-registry.ts');

function slugToDocVar(slug: string): string {
	return slug.replace(/-([a-z])/g, (_, char) => char.toUpperCase()) + 'Doc';
}

const slugs = readdirSync(pagesDir)
	.filter((file) => file.endsWith('.doc.ts'))
	.map((file) => file.replace(/\.doc.ts$/, ''));

const docImports = slugs
	.map((slug) => `import { componentDoc as ${slugToDocVar(slug)} } from '@/pages/components/${slug}.doc';`)
	.join('\n');

const docEntries = slugs.map((slug) => slugToDocVar(slug)).join(',\n\t');

const registrySource = `import type { ComponentDoc } from '@/lib/playground';

${docImports}

export const componentDocs: ComponentDoc[] = [
\t${docEntries},
];

export function getComponentDoc(slug: string): ComponentDoc | undefined {
\treturn componentDocs.find((entry) => entry.slug === slug);
}
`;

writeFileSync(registryPath, registrySource);

const navEntries: { slug: string; title: string; category: string }[] = [];

for (const slug of slugs) {
	const docUrl = pathToFileURL(path.join(pagesDir, `${slug}.doc.ts`)).href;
	const module = await import(docUrl);
	const doc = module.componentDoc as { slug: string; title: string; category: string };
	navEntries.push({ slug: doc.slug, title: doc.title, category: doc.category });
}

const navSource = `import type { ComponentCategory } from '@/lib/playground';

export type ComponentNavEntry = {
\tslug: string;
\ttitle: string;
\tcategory: ComponentCategory;
};

export const componentNavEntries: ComponentNavEntry[] = ${JSON.stringify(navEntries, null, '\t').replace(
	/\n/g,
	'\n',
)};
`;

writeFileSync(navRegistryPath, navSource);
console.log(`Generated registry and nav metadata for ${slugs.length} components.`);
