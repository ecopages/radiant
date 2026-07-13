import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

/**
 * Unified remark plugin bundle for the docs MDX compile pipeline.
 * `remark-frontmatter` consumes the `---` block so it is not rendered as a
 * stray thematic break; `remark-gfm` enables GitHub-flavored markdown.
 */
export const contentRemarkPlugins = [remarkFrontmatter, remarkGfm];
