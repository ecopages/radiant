# @ecopages/radiant-themes

## 0.2.5

### Patch Changes

- Updated dependencies [[`138e059`](https://github.com/ecopages/radiant/commit/138e0593b3e33026834663deb9661240deff9e44), [`a806505`](https://github.com/ecopages/radiant/commit/a806505a57bd6f0b36b9eafbb16a61c985f487d0), [`a28be28`](https://github.com/ecopages/radiant/commit/a28be2820c65923727be2a93eae6fcb75a06dce7)]:
    - @ecopages/radiant-ui@0.2.5

## 0.2.4

### Patch Changes

- Updated dependencies [[`b2bce55`](https://github.com/ecopages/radiant/commit/b2bce5517d10fc846b8a05885f7d5bf9f0ea6a1b)]:
    - @ecopages/radiant-ui@0.2.4

## 0.2.3

### Patch Changes

- [#384](https://github.com/ecopages/radiant/pull/384) [`c56c0ee`](https://github.com/ecopages/radiant/commit/c56c0ee2533292f0663c7252ca50c35524545845) Thanks [@andeeplus](https://github.com/andeeplus)! - macOS tabs render as a 24px segmented control at 13px in both tab variants, and boxed tabs sit on the top edge of their panel, as `NSTabView` does. The catalog's variant styles no longer override the theme's tab size, padding and font.
- Updated dependencies [[`6a097db`](https://github.com/ecopages/radiant/commit/6a097db52875b557ca267146f91ea7f43324b883), [`1a08f6d`](https://github.com/ecopages/radiant/commit/1a08f6d040c27dbdaed14343facc6511fab40611)]:
    - @ecopages/radiant-ui@0.2.3

## 0.2.2

### Patch Changes

- [#381](https://github.com/ecopages/radiant/pull/381) [`a33c600`](https://github.com/ecopages/radiant/commit/a33c60099eb614df9880d1b0a105f13f85143609) Thanks [@andeeplus](https://github.com/andeeplus)! - Make the optional themes match the systems they reference.

    - Windows 95 gains a flat menu bar with navy menu highlights, a trackbar slider, raised arrow buttons on drop-downs and combo boxes, sunken list boxes and tree views with plus/minus boxes, pale yellow tooltips, and a dark mode whose bevels read as relief. The calendar title text is no longer navy on navy.
    - Mac OS Classic styles table and tree headers, menus, tooltips, tags, sliders and progress bars as Platinum, and unselected tabs in dark mode meet 4.5:1.
    - macOS follows Sonoma AppKit: SF Pro at 13px, hairline-outlined push buttons, accent-filled default buttons, pop-up buttons, segmented tabs above their panel, and translucent menus and popovers.
    - GitHub uses Primer's roles: blue for links, focus and selected states, green limited to the primary button, the meter and success states, and Primer's grey and danger buttons.
    - Vercel uses current Geist colors and menus, VS Code follows Light Modern and Dark Modern (26px controls at 13px, secondary buttons, editor-style tabs), Cloudflare no longer uses orange for selected items and has Kumo's 26, 36 and 40px controls, Material uses the Material 3 baseline scheme, and High Contrast keeps radios round and muted text above 7:1.
    - Popovers, toasts and table headers are styled on the elements that draw them in the themes that style them: `.rui-popover`, `.rui-toast` and `.rui-table__column`.
    - The sidebar stylesheet is layered in `@layer components`, so themes can style the active item.

- Updated dependencies [[`c7b9520`](https://github.com/ecopages/radiant/commit/c7b9520b8c3e81383432f31eac3f5b08e6a66cd5), [`a33c600`](https://github.com/ecopages/radiant/commit/a33c60099eb614df9880d1b0a105f13f85143609)]:
    - @ecopages/radiant-ui@0.2.2

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
