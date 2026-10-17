# @ecopages/radiant-themes

Optional complete themes for [`@ecopages/radiant-ui`](../radiant-ui/README.md). Radiant UI exports one accessible
default theme; this package adds a curated set of ready-to-use visual presets.

Install both packages when using an optional theme:

```bash
pnpm add @ecopages/radiant-ui @ecopages/radiant-themes
```

## Tailwind CSS applications

Import a complete theme and the component stylesheet:

```css
@import 'tailwindcss';
@import '@ecopages/radiant-themes/github';
@import '@ecopages/radiant-ui/styles.css';
```

Themes include GitHub, Cloudflare, VS Code, Vercel, Material Design, High Contrast, Windows 95, Mac OS Classic, and macOS. Each
owns its shape, typography, spacing, semantic colors, and any component-specific styling. Theme source remains
composable internally, while the public API stays at one import per complete theme.

Theme entries define font-family stacks but do not bundle font files. An app can load properly licensed font files
separately and override `--font-sans`, `--font-heading`, or `--font-mono` after the theme import.

Compact variants have their own export, for example:

```css
@import 'tailwindcss';
@import '@ecopages/radiant-themes/github/compact';
@import '@ecopages/radiant-ui/styles.css';
```

Each compact entry applies the theme's shared compact spacing composition while keeping the same theme-owned palette,
font stacks, shape, and component treatment. The full and compact entries follow the document's `.dark` class.

Radiant Default (`@ecopages/radiant-ui/themes/default`) uses three OKLCH seed colors plus density, corner radius, and
border opacity inputs. The docs tuner shows the six values and produces copyable CSS. Those controls only apply to
Radiant Default; branded themes keep their own values.

High Contrast targets at least 7:1 contrast for published semantic text pairs in both modes and uses prominent focus
indicators. Radiant UI's shared foundation supports reduced motion, increased contrast, visible keyboard focus, and
Windows forced colors. Verify non-text boundaries and application content after custom overrides.

Windows 95 draws every control with the two-tone 2px bevel: gray push buttons with a black frame on the default
action, sunken white fields, check boxes, and radio wells, raised property tabs joined to their page, navy title bars,
and navy selection. Mac OS Classic is Mac OS 9 Platinum, built from the Mac OS 8 Human Interface Guidelines and the Appearance Manager's
default theme: the seven system greys `#eeeeee` to `#202020`, grey push buttons with a black outline and a two-pixel
bevel, a three-layer ring around the default button, 12px bevelled check boxes, shaded radio spheres, sunken white
fields, trapezoid tabs that merge into a black-framed page, and 1px striped title bars. Selection and focus use the
default `#6666cc` accent. Both
dark modes keep the same bevel structure on darker faces and fields, since neither system shipped one. macOS uses
moderate control corners, grouped tab segments, softer layered surfaces, and accent-blue push buttons with white text
in dark mode. Material Design uses tonal surfaces, a purple accent family, and rounded action
controls. These are original implementations written with Radiant semantic roles, Tailwind `@apply`, and catalog
selectors; they do not copy third-party CSS.

The Cloudflare theme leads with Cloudflare orange on restrained neutral layers inspired by Cloudflare Kumo. Dark mode
uses the brand orange `#f6821f` with dark text; light mode uses a deeper orange so primary text and fills keep AA
contrast on white. Links and focus stay blue, and warnings use a yellow amber that stays distinct from the primary.
GitHub maps Primer's functional roles: green marks the primary action, blue is for links and focus, the selected tab
uses Primer's coral underline, and neutral surfaces are used for secondary actions.

The Vercel theme uses Background 2 for the light canvas and Background 1 for primary surfaces. Its component colors
drive hover and active fills, Colors 4–6 drive default, hover, and active borders, and blue stays focused on links and
keyboard focus. Control boundaries are strengthened for visibility. VS Code maps editor surfaces and accent states,
with Dark Modern's `#0078d4` button fill. In dark mode, the product themes fill primary and destructive buttons with
the product's own saturated color and white text, while `--primary` and `--error` stay the lighter tones used for
text. These palettes adapt product cues to Radiant UI roles without reproducing the products pixel for pixel.

## Design references

The themes draw on public guidance for role mapping and component behavior: [Material Design 3 color
roles](https://m3.material.io/styles/color/the-color-system), [Primer's color token layers](https://primer.style/product/getting-started/foundations/color-usage/), [Vercel Geist colors](https://vercel.com/geist/colors), [VS Code theme color roles](https://code.visualstudio.com/api/references/theme-color), [Cloudflare Kumo](https://github.com/cloudflare/kumo), [Apple's Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/), [the Mac OS 8 Platinum guidelines](https://dev.os9.ca/techpubs/mac/pdf/HIGOS8Guidelines.pdf), and [Microsoft property sheet guidance](https://learn.microsoft.com/en-us/windows/win32/controls/property-sheets). These sources informed the design decisions; all theme CSS is authored for Radiant's tokens and components.

Radiant Themes is an independent project. It is not affiliated with, sponsored by, or endorsed by GitHub, Cloudflare,
Vercel, Microsoft, Apple, or Google. Product names such as GitHub, Cloudflare, Vercel, VS Code, Windows 95, Mac OS, macOS,
and Material Design are trademarks of their respective owners and are used only to describe the design inspiration.

## Browser-ready CSS

For applications that consume compiled CSS rather than Tailwind theme sources, load the base bundle, one compiled
theme, and component styles:

```css
@import '@ecopages/radiant-ui/radiant-ui.css';
@import '@ecopages/radiant-themes/compiled/github.css';
@import '@ecopages/radiant-ui/styles.css';
```

Use `compiled/github/compact.css` for the compact variant. Matching compiled entries exist for every full theme and
compact variant. Override semantic CSS properties after the imports when an application needs local adjustments.
