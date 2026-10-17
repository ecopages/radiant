# @ecopages/radiant-themes

## 0.2.1

### Patch Changes

- [#322](https://github.com/ecopages/radiant/pull/322) [`09b2088`](https://github.com/ecopages/radiant/commit/09b208841fca88373ae77c3c9e7db4e4436af225) Thanks [@andeeplus](https://github.com/andeeplus)! - Refine the theme catalog released in 0.2.0.

    - Composite fields draw one frame in every theme, including the classic-theme field treatments, and the standalone `rui-date-input` surface follows the same rule.
    - Treegrids read as trees in every theme: no divider under each row, only the header rule. VS Code, GitHub, macOS, Mac OS Classic and Windows 95 add per-level indentation and their native disclosure affordances.
    - Cloudflare's primary orange is `#cc3a00` in light and dark mode (5:1 against white) instead of switching to the brighter orange in dark mode.
    - Polish theme catalog controls across the optional themes.

- Updated dependencies [[`09b2088`](https://github.com/ecopages/radiant/commit/09b208841fca88373ae77c3c9e7db4e4436af225)]:
    - @ecopages/radiant-ui@0.2.1

## 0.2.0

### Minor Changes

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Radiant UI now ships one OKLCH-derived Radiant Default theme with stronger control boundaries and shared accessibility support. `@ecopages/radiant-themes` adds High Contrast, Windows 95, Mac OS Classic, macOS, and Material Design alongside GitHub, VS Code, and Vercel. Each optional theme includes its own font stacks, a compact variant, and component-specific styling where needed.

    If your app used an earlier Radiant palette or preset export, switch to the single default theme and tune `--rui-primary`, `--rui-secondary`, and `--rui-neutral`, or install `@ecopages/radiant-themes/<theme>` for a complete visual system. For compact spacing, import `@ecopages/radiant-ui/tokens/spacing/compact` after Radiant Default, or use a complete theme's `/compact` export, such as `@ecopages/radiant-themes/github/compact`. See the [theme migration guide](https://radiant.ecopages.app/docs/getting-started/theming).

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Rework Windows 95 around its native two-tone bevels, and Mac OS Classic as Mac OS 9 Platinum, using the Mac OS 8 Human Interface Guidelines metrics: seven system greys, black-outlined push buttons with a default ring, bevelled check boxes, shaded radios, trapezoid tabs, and striped title bars. Their dark modes now use dark fields, which fixes white-on-white select and input text. Button treatments vary by theme: Cloudflare uses a contrast-safe orange primary fill, VS Code uses its blue fill for dark-mode filled buttons, and Cloudflare, GitHub, and Vercel use saturated fills with white text for dark-mode destructive buttons. Switch tracks are visible again in Cloudflare, Vercel, and macOS, and alerts keep their tone colors.

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Add Cloudflare, led by Cloudflare orange on Kumo-inspired neutral layers, with blue links and a yellow amber warning.
  Align GitHub's semantic roles with Primer: green primary actions and success, neutral secondary surfaces, blue links,
  and the coral selected-tab underline.

- [#306](https://github.com/ecopages/radiant/pull/306) [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821) Thanks [@andeeplus](https://github.com/andeeplus)! - Make decorative borders recede. Radiant Default's semantic border alpha drops from 40% to 20%, and GitHub, VS Code, Material Design, and macOS use their subtle divider colors for `--border` instead of the strong control-border color. Control borders stay solid for accessible contrast.

### Patch Changes

- Updated dependencies [[`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821), [`a3a8234`](https://github.com/ecopages/radiant/commit/a3a8234c107b5955ce3cd983ba4edcc3fae18821)]:
    - @ecopages/radiant-ui@0.2.0
