import { create } from 'storybook/theming';

/** Same path as `apps/radiant-ui` `Logo` — inlined so the manager can paint it with `currentColor`. */
const logoMark = `<svg height="22" viewBox="0 0 35 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8.95038 19.0355C8.73635 19.7972 10.4934 24.8245 18.2298 23.3884C25.3299 22.0704 24.7298 10.8884 18.2298 13.8884C14.2596 15.7208 12.2883 33.409 22.2298 31.8884C29.9216 30.7119 28.75 6.88572 31.434 1.38842C28.4393 4.49823 5.89504 5.06009 2.22981 17.8884C1.27183 21.2414 3.22979 26.8884 8.95036 28.3884L2.22981 38.3884" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`;

export const radiantUiTheme = create({
	base: 'light',
	brandTitle: `<span style="display:inline-flex;align-items:center;gap:0.25rem;font-family:Karla,ui-sans-serif,system-ui,sans-serif;font-size:1.125rem;font-weight:600;letter-spacing:-0.025em">${logoMark}Radiant UI</span>`,
	brandUrl: './',
	brandTarget: '_self',
	colorPrimary: 'hsl(225 85% 55%)',
	colorSecondary: 'hsl(225 85% 55%)',
	fontBase: '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"Inconsolata", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});
