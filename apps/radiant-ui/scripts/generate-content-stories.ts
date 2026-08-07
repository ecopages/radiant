import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ComponentDoc, PlaygroundControl } from '../src/lib/playground/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'src/pages/components');
const storiesDir = path.join(root, 'src/content/stories');
const mdxDir = path.join(root, 'src/content/components');

const SKIP_SLUGS = new Set(['alert', 'button', 'chip', 'switch']);

function slugToPascal(slug: string): string {
	return slug
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

function slugToCamel(slug: string): string {
	const pascal = slugToPascal(slug);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function propKey(prop: string): string {
	return prop.includes('-') ? `'${prop}'` : prop;
}

function tsTypeForControl(control: PlaygroundControl): string {
	switch (control.kind) {
		case 'boolean':
			return 'boolean';
		case 'number':
			return 'number';
		default:
			return 'string';
	}
}

function argTypeForControl(control: PlaygroundControl): string {
	const key = propKey(control.prop);
	if (control.kind === 'boolean') {
		return `${key}: { control: { type: 'boolean' } }`;
	}
	if (control.kind === 'select') {
		const options = control.options.map((option) => `'${option.value}'`).join(', ');
		return `${key}: { control: { type: 'select' }, options: [${options}] as const }`;
	}
	if (control.kind === 'number') {
		return `${key}: { control: { type: 'text' } }`;
	}
	return `${key}: { control: { type: 'text' } }`;
}

function defaultArgValue(control: PlaygroundControl): string {
	const key = propKey(control.prop);
	if (control.kind === 'boolean') {
		return `${key}: ${control.defaultValue}`;
	}
	if (control.kind === 'number') {
		return `${key}: ${control.defaultValue}`;
	}
	return `${key}: '${String(control.defaultValue).replace(/'/g, "\\'")}'`;
}

/** Escape `{` so MDX does not treat inline text as expressions. */
function escapeMdxExpr(text: string): string {
	return text.replace(/\{/g, '\\{');
}

function generateStoryFile(doc: ComponentDoc): string {
	const pascal = slugToPascal(doc.slug);
	const controls = doc.playground.scenarios[0]?.controls ?? [];
	const argsType =
		controls.length > 0
			? controls.map((control) => `\t${propKey(control.prop)}: ${tsTypeForControl(control)};`).join('\n')
			: '\t[key: string]: unknown;';

	const argsDefaults =
		controls.length > 0
			? controls.map((control) => `\t\t${defaultArgValue(control)},`).join('\n')
			: '';

	const argTypes =
		controls.length > 0 ? controls.map((control) => `\t\t${argTypeForControl(control)},`).join('\n') : '';

	const childrenArg =
		doc.playground.scenarios[0]?.children != null
			? `\n\t\tchildren: '${String(doc.playground.scenarios[0].children).replace(/'/g, "\\'")}',`
			: '';

	const childrenType = doc.playground.scenarios[0]?.children != null ? '\n\tchildren: string;' : '';

	const childrenArgType = doc.playground.scenarios[0]?.children != null ? "\n\t\tchildren: { control: { type: 'text' } }," : '';

	const renderChildren = doc.playground.scenarios[0]?.children != null ? ', args.children' : '';

	return `import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ${pascal}Args = {
${argsType}${childrenType}
};

export const meta = {
\tcomponent: '${doc.slug}',
\texportName: '${doc.exportName}',
\targs: {
${argsDefaults}${childrenArg}
\t},
\targTypes: {
${argTypes}${childrenArgType}
\t},
\texampleCode: (args) => buildExampleCode('${doc.exportName}', '${doc.slug}', args${renderChildren ? renderChildren : ''}),
\trender: (args) => renderPlaygroundPreview('${doc.slug}', args${renderChildren ? ', args.children' : ''}),
} satisfies DocsMeta<${pascal}Args>;

type Story = DocsStory<${pascal}Args>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: '${doc.slug}/default' } } });
`;
}

function generateMdxFile(doc: ComponentDoc): string {
	const pascal = slugToPascal(doc.slug);
	const metaName = `${pascal}Meta`;

	const guidanceSections = doc.guidance
		.map((section) => {
			const paragraphs = section.paragraphs.map((paragraph) => `<p>${escapeMdxExpr(paragraph)}</p>`).join('\n\n');
			const bullets = section.bullets
				? `\n\n<ul>\n${section.bullets.map((item) => `\t<li>${escapeMdxExpr(item)}</li>`).join('\n')}\n</ul>`
				: '';
			return `## ${section.title}\n\n${paragraphs}${bullets}`;
		})
		.join('\n\n');

	const accessibility = doc.accessibility.map((item) => `- ${escapeMdxExpr(item)}`).join('\n');

	return `---
title: ${doc.title}
description: ${doc.lede}
category: ${doc.category}
---

import { meta as ${metaName}, Default } from '@/content/stories/${doc.slug}';
import Canvas from '@/components/component-docs/canvas';
import Demo from '@/components/component-docs/demo';

export const config = {
\tdependencies: {
\t\tcomponents: [Canvas, Demo],
\t\tscripts: [
\t\t\t'../../components/component-docs/canvas.script.tsx',
\t\t\t'../../components/component-docs/controls.script.tsx',
\t\t\t'../../components/component-docs/code.script.tsx',
\t\t],
\t},
};

# ${doc.title}

<p class="docs-lede">${escapeMdxExpr(doc.lede)}</p>

## Try it

<Demo of={Default} meta={${metaName}} />

## Usage

${escapeMdxExpr(doc.usage.intro)}

\`\`\`tsx
${doc.usage.example}
\`\`\`

${guidanceSections}

## Accessibility

${accessibility}
`;
}

async function main(): Promise<void> {
	mkdirSync(storiesDir, { recursive: true });
	mkdirSync(mdxDir, { recursive: true });

	const slugs = readdirSync(pagesDir)
		.filter((file) => file.endsWith('.doc.ts'))
		.map((file) => file.replace(/\.doc.ts$/, ''))
		.filter((slug) => !SKIP_SLUGS.has(slug))
		.sort();

	const indexImports: string[] = ["import './alert';", "import './button';", "import './chip';", "import './switch';"];

	for (const slug of slugs) {
		const docUrl = pathToFileURL(path.join(pagesDir, `${slug}.doc.ts`)).href;
		const module = await import(docUrl);
		const doc = module.componentDoc as ComponentDoc;

		writeFileSync(path.join(storiesDir, `${slug}.tsx`), generateStoryFile(doc));
		writeFileSync(path.join(mdxDir, `${slug}.mdx`), generateMdxFile(doc));
		indexImports.push(`import './${slug}';`);

		console.log(`Generated ${slug}`);
	}

	const indexContent = `${indexImports.join('\n')}\n`;
	writeFileSync(path.join(storiesDir, 'index.ts'), indexContent);

	console.log(`Done — generated ${slugs.length} story and MDX pairs.`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
