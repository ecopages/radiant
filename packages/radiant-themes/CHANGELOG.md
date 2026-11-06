# @ecopages/radiant-themes

## 0.3.1

### Patch Changes

- Updated dependencies [[`a88dd8d`](https://github.com/ecopages/radiant/commit/a88dd8d53a7dbcb2712efdcf7a85d4d55fd36e9b), [`ed2c0e6`](https://github.com/ecopages/radiant/commit/ed2c0e670f3ad3c282d0be79168c82d231aad542), [`060f6f4`](https://github.com/ecopages/radiant/commit/060f6f4391f0c902bc5f676093f5fa07b39ad81d), [`b746410`](https://github.com/ecopages/radiant/commit/b7464103bc6aa4f851146944d46b8fbc84318bcc), [`2ac1aed`](https://github.com/ecopages/radiant/commit/2ac1aed193acc184c3f76788060707ff38ce4b0f), [`a5ba176`](https://github.com/ecopages/radiant/commit/a5ba1764cf7817d3d5b2ae6f972fb89c6f442e75), [`1484d65`](https://github.com/ecopages/radiant/commit/1484d65ea15e0e6429126dc690e602f3fdbae8a4), [`4db66c3`](https://github.com/ecopages/radiant/commit/4db66c31468bc02c125c5d61d49eff9e4f23a1bf), [`d6c0f12`](https://github.com/ecopages/radiant/commit/d6c0f124386d70e73fa2fcb0a6f44957312a0fca), [`637f890`](https://github.com/ecopages/radiant/commit/637f890bf45a0bc16825d23a6169d8defc25f41f), [`15d2ba8`](https://github.com/ecopages/radiant/commit/15d2ba8e7f36036450158b9de22e501f65ba7822), [`dfd2f59`](https://github.com/ecopages/radiant/commit/dfd2f59c0966aac9bc05928475f97426510046b1), [`2f69f74`](https://github.com/ecopages/radiant/commit/2f69f74a860e2ad7d8b3d95990274684d6c38e57), [`f3da2d2`](https://github.com/ecopages/radiant/commit/f3da2d2b88c4838f69eed9a8e94a3d7bc24348b8), [`af5bc82`](https://github.com/ecopages/radiant/commit/af5bc82dc65dd96f9e7ca9b279812b3e3c5a3076), [`753fd1a`](https://github.com/ecopages/radiant/commit/753fd1affe10fb64525a9d8e2a734771631ba2c3), [`d08c888`](https://github.com/ecopages/radiant/commit/d08c888cb357b822b7141d89bf69493c1f10249e), [`95bd029`](https://github.com/ecopages/radiant/commit/95bd029d69dede3bf0349b66e6afaba7412cfc1b), [`a7de91c`](https://github.com/ecopages/radiant/commit/a7de91cf1c572571497964abc18bc37a311c33ce), [`e0edd9c`](https://github.com/ecopages/radiant/commit/e0edd9c5e90a214b2a96f597015221f5aeee8e18), [`7620740`](https://github.com/ecopages/radiant/commit/7620740e6a6f6491d4f1ea941deb18223c0101e7), [`9e0e162`](https://github.com/ecopages/radiant/commit/9e0e1621bc4fb914627773ba54dc658ba6267162), [`945bf3c`](https://github.com/ecopages/radiant/commit/945bf3c3858e6074acc3d3306e910e91d424def2)]:
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
