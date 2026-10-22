---
'@ecopages/radiant-ui': patch
'@ecopages/radiant-themes': patch
---

Make the optional themes match the systems they reference.

- Windows 95 gains a flat menu bar with navy menu highlights, a trackbar slider, raised arrow buttons on drop-downs and combo boxes, sunken list boxes and tree views with plus/minus boxes, pale yellow tooltips, and a dark mode whose bevels read as relief. The calendar title text is no longer navy on navy.
- Mac OS Classic styles table and tree headers, menus, tooltips, tags, sliders and progress bars as Platinum, and unselected tabs in dark mode meet 4.5:1.
- macOS follows Sonoma AppKit: SF Pro at 13px, hairline-outlined push buttons, accent-filled default buttons, pop-up buttons, segmented tabs above their panel, and translucent menus and popovers.
- GitHub uses Primer's roles: blue for links, focus and selected states, green limited to the primary button, the meter and success states, and Primer's grey and danger buttons.
- Vercel uses current Geist colors and menus, VS Code follows Light Modern and Dark Modern (26px controls at 13px, secondary buttons, editor-style tabs), Cloudflare no longer uses orange for selected items and has Kumo's 26, 36 and 40px controls, Material uses the Material 3 baseline scheme, and High Contrast keeps radios round and muted text above 7:1.
- Popovers, toasts and table headers are styled on the elements that draw them in the themes that style them: `.rui-popover`, `.rui-toast` and `.rui-table__column`.
- The sidebar stylesheet is layered in `@layer components`, so themes can style the active item.
