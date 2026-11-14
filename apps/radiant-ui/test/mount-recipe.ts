import { syncExamples } from '../src/components/primitive-example/mount-example';

const pages = import.meta.glob('../src/content/components/recipes/*.mdx', {
	query: '?raw',
	import: 'default',
	eager: true,
}) as Record<string, string>;
const scripts = import.meta.glob('../src/content/components/recipes/*.script.ts');
const elements = import.meta.glob('../src/content/components/recipes/*.element.ts');

/** Mounts the markup a recipe page documents and runs the script it documents. */
export async function mountRecipe(slug: string): Promise<HTMLElement> {
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = page.match(/```html\n([\s\S]*?)\n```/)![1];
	await scripts[`../src/content/components/recipes/${slug}.script.ts`]!();
	syncExamples();
	return document.querySelector<HTMLElement>(`[data-example="${slug}"]`)!;
}

export type Form = 'plain' | 'radiant';

/**
 * Mounts one form of a recipe from its page: the plain form is the first `html` fence plus the `mount` script, the
 * Radiant form is the second `html` fence plus the element script, which needs no mount call. Returns the element the
 * recipe's parts sit under.
 */
export async function mountForm(slug: string, form: Form): Promise<HTMLElement> {
	if (form === 'plain') {
		return mountRecipe(slug);
	}
	const page = pages[`../src/content/components/recipes/${slug}.mdx`]!;
	document.body.innerHTML = [...page.matchAll(/```html\n([\s\S]*?)\n```/g)][1]![1];
	await elements[`../src/content/components/recipes/${slug}.element.ts`]!();
	return document.querySelector<HTMLElement>(`recipe-${slug}`)!;
}
