# @ecopages/radiant-themes

## 0.3.4

### Patch Changes

- Updated dependencies [[`5f154a0`](https://github.com/ecopages/radiant/commit/5f154a07abb3570e8f31f519b9c6f5c4b52c3155)]:
    - @ecopages/radiant-ui@0.3.4

## 0.3.3

### Patch Changes

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Add the Zed theme, inspired by the Zed editor's One Light and One Dark: flat, dense surfaces, 4px controls, hairline borders, and translucent accent hover and selection fills. Import `@ecopages/radiant-themes/zed` or `@ecopages/radiant-themes/zed/compact`, or the matching `compiled/zed.css` entries. The theme names IBM Plex Sans, IBM Plex Mono, and Lilex but bundles no font files.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Buttons now move down by `--press-shift` (1px) while pressed, the small nudge shadcn uses, using a new `--ease-out-strong` curve, and the button transition drops from 300ms to `--duration-fast` and animates only color, shadow and transform. The icon toggle and clear buttons press the same way. Button hover styling applies only on devices that support hover, and `prefers-reduced-motion` disables the movement. The Windows 95, Mac OS Classic and macOS themes set `--press-shift: 0px` so their controls do not move.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Radiant Default is close to the Zed theme's density, one step larger on the controls: 28, 32, and 36px controls (was 32, 40, and 48px), 14px control text, 10px by 4px control padding, and the 4px-base spacing scale, so control rows are compact inside evenly spaced layouts while hit areas stay well above the 24px WCAG 2.2 minimum. `--rui-density` still scales the sizes and the spacing together. The Vercel theme is also one size step smaller: 28, 32, and 40px controls with 13px control text and trimmed menu, tab, and tooltip padding; its colors, borders, and radii are unchanged.

    The `@ecopages/radiant-ui/tokens/spacing/comfortable` pack keeps the earlier 32/40/48px controls, and every other complete theme in `@ecopages/radiant-themes` imports it, so their sizes do not change. Import it after `themes/default` to restore the earlier Radiant Default density. The `compact` and `wide` packs are unchanged.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - Popups, dialogs and value changes now animate with short, origin-aware motion. Floating popups (select, combobox, menus, popover, date pickers) fade and scale in from the side facing their anchor and leave faster than they arrive; tooltips fade; hover cards and the dialog surface scale in, and the dialog backdrop fades. The toast stack uses `--duration-slow` and `--ease-out-strong` instead of 400ms. The meter fill, slider range fill and thumb, and knob arc ease between values (sliders and knobs skip the transition while dragging through a new `data-dragging` attribute), checkbox and radio marks scale in, and disclosure, tree and treegrid chevrons share the strong ease-out. New `--popup-*`, `--tooltip-duration`, `--hover-card-enter-duration`, `--dialog-*`, `--backdrop-duration` and `--check-duration` tokens tune or disable it, `prefers-reduced-motion` removes the movement, and `PopoverController` keeps a portaled surface mounted until its exit finishes. The Windows 95 and Mac OS Classic themes set these durations to `0ms` so popups appear instantly.

- [#637](https://github.com/ecopages/radiant/pull/637) [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889) Thanks [@andeeplus](https://github.com/andeeplus)! - The toast close button now sits inside the toast, at the end of the row (at the start for toasters positioned at the start of the screen), as a 24px ghost button with a 14px icon instead of a 20px badge on the corner whose icon filled the circle. The knob arc ends follow `--rui-knob-linecap` (`round`, `butt` or `square`, default `round`); the sharp radius pack and the Zed, VS Code, High Contrast, Windows 95 and Mac OS Classic themes set `butt`, and a `--rui-radius-scale` of exactly 0 squares the ends too.

    Tags in `RuiTagGroup` and their remove buttons follow the radius scale (`--radius-control` and `--radius-sm`) instead of staying fully rounded, so a square or lightly rounded theme gets square tags.

- Updated dependencies [[`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889), [`367d225`](https://github.com/ecopages/radiant/commit/367d225ef217a645ab262edbe8f56703f5c032c2), [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889), [`e8bb10e`](https://github.com/ecopages/radiant/commit/e8bb10ec1dd3b4d9e63fde96128d34f71287df13), [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889), [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889), [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889), [`26f6150`](https://github.com/ecopages/radiant/commit/26f61508f3ebba9b643fc93ab457f2e384452667), [`859ac1c`](https://github.com/ecopages/radiant/commit/859ac1c8d4e2dad96d6389670a0bc6edc5a40889), [`311dea5`](https://github.com/ecopages/radiant/commit/311dea533f361dd4a9057f51081774dac27135f7)]:
    - @ecopages/radiant-ui@0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies [[`9dd78b7`](https://github.com/ecopages/radiant/commit/9dd78b7c85550a8b5c6f984dfe58d58249f826a8)]:
    - @ecopages/radiant-ui@0.3.2

## 0.3.1

### Patch Changes

- Updated dependencies [[`0877ec5`](https://github.com/ecopages/radiant/commit/0877ec5a738d7bc9addbb59da2880c10f134be2b), [`26dbfe5`](https://github.com/ecopages/radiant/commit/26dbfe523af7230f95998e99869d8680fd820726), [`dfc9317`](https://github.com/ecopages/radiant/commit/dfc93175c2b794e5a7867cbf34d47dc7bf8cbd15), [`399bb68`](https://github.com/ecopages/radiant/commit/399bb68facb18896f7d4b2c104e280cc8c443a2a), [`48a9e27`](https://github.com/ecopages/radiant/commit/48a9e271ebf26745d88e5acd3e5b3c3b49297a3a), [`b42042d`](https://github.com/ecopages/radiant/commit/b42042dfe959759cd9ad27d2399d326d1c78297c), [`93a35d0`](https://github.com/ecopages/radiant/commit/93a35d0944f35ffd132fd2b337af8021a8842085), [`0c555a6`](https://github.com/ecopages/radiant/commit/0c555a6120961b88380b275ca76a8f18c9eddd71), [`bf2eb5f`](https://github.com/ecopages/radiant/commit/bf2eb5f718d082fbc5c21d10ddc1b22cfdb5796f), [`fe20f16`](https://github.com/ecopages/radiant/commit/fe20f166f19fb8374993ff70a3b388c7fded021e), [`f59e06a`](https://github.com/ecopages/radiant/commit/f59e06a891eaa8e8daef8fca8ac6ad6494889e07), [`506ace3`](https://github.com/ecopages/radiant/commit/506ace361a42f6df767f6d30c9f9d287df8db84b), [`c51327f`](https://github.com/ecopages/radiant/commit/c51327fa3d18f03a51527ed90c6c9671845ee487), [`6c2c8c2`](https://github.com/ecopages/radiant/commit/6c2c8c23d59fe0b83e56fad75aab03b76a2777a7), [`e653858`](https://github.com/ecopages/radiant/commit/e6538588a1c5672394e0d2ce40683ae9553f5bc0), [`73ff9f6`](https://github.com/ecopages/radiant/commit/73ff9f666001d8307c80ea7dbaa8691292b1b45f), [`f7d50d2`](https://github.com/ecopages/radiant/commit/f7d50d299619c7609c6aae12e1571f9ec2621af9), [`a56ca9a`](https://github.com/ecopages/radiant/commit/a56ca9a06b8cfb84d68de276022a3356704eadce), [`770593e`](https://github.com/ecopages/radiant/commit/770593ed18759acc5248b8e41cc3ee19e3954cd1), [`0002ba5`](https://github.com/ecopages/radiant/commit/0002ba5e08e5e4c6735097d942892c9fba9d0d60), [`79f2a05`](https://github.com/ecopages/radiant/commit/79f2a057696a0ac6637cb3899f6235edf0eafd66), [`4a9ee57`](https://github.com/ecopages/radiant/commit/4a9ee571580bbfccdff5b88d695e8efa74377030), [`6e256fc`](https://github.com/ecopages/radiant/commit/6e256fcb188bf665b84a04c1daf1c1a95634f110)]:
    - @ecopages/radiant-ui@0.3.1

## 0.3.0

### Patch Changes

- [#445](https://github.com/ecopages/radiant/pull/445) [`8f08f63`](https://github.com/ecopages/radiant/commit/8f08f63de84be88224d435d4d5752033c60213d1) Thanks [@andeeplus](https://github.com/andeeplus)! - Keep the open navigation menu trigger filled under the pointer in every theme; a theme's ghost-button hover used to replace the fill while the text kept its on-container color, so Windows 95 showed white text on gray. The macOS theme also fills boxed tab panels with the white content surface instead of a gray tint, and keeps pressed ghost buttons filled on hover.

    The Windows 95 theme draws a calendar inside a date popover without its own raised frame, so the popover is one bevel and the calendar title bar sits 3px from it.

    macOS calendar days are circles, and a selected range is one continuous band with a disc on each end instead of a row of separate ovals.

- Updated dependencies [[`af659ff`](https://github.com/ecopages/radiant/commit/af659ff374c7185f6500abb71af22b2ef118dee0), [`1d35d3e`](https://github.com/ecopages/radiant/commit/1d35d3ed090dfbcc2819d03cf6beeae10e9d89ed), [`5e83088`](https://github.com/ecopages/radiant/commit/5e83088ddb39d40a4c4401be77155ae1626e8a20), [`8f08f63`](https://github.com/ecopages/radiant/commit/8f08f63de84be88224d435d4d5752033c60213d1)]:
    - @ecopages/radiant-ui@0.3.0

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
