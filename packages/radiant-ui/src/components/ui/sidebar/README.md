# Sidebar

`rui-sidebar-trigger` uses its `controls` id to target one `rui-sidebar`. If that specified id is missing or names another element, the trigger stays unattached and clicking it does not toggle a different sidebar. Only a trigger without `controls` falls back to its closest sidebar. Clearing `controls` also clears a stale `aria-controls` when no sidebar is nearby.

The trigger mirrors the attached sidebar's state, mobile mode, and collapse mode through one observer. Its view owns the button markup; the behavior host writes the button's ARIA state and the trigger host's `data-sidebar-*` attributes.

The provider's `layout="docs"` site header uses the `--surface` background role and `--border` divider, matching site chrome that uses the surface role. The docs sidebar pane and inset use `--background`.

`sidebar.css` is layered in `@layer components` like the other components, so themes can restyle the sidebar, including its active item (`aria-current='page'` or `.rui-sidebar__menu-button--active`). The optional `sidebar.docs.css` skin stays unlayered and keeps its own active indicator: primary-colored text and a left bar.

## Mobile drawer motion

Below the breakpoint the pane keeps a fixed width (`w-72`, capped at `85vw`) and slides with `transform: translateX()` from its edge (`-100%` for `side="left"`, `100%` for `right`, flipped under RTL); width, `left` and `right` are never animated. The scrim fades with `opacity`. Enter takes `--duration-slow` with `--ease-out`; exit takes `--duration-normal` with `--ease-in`. The shell stays `visibility: visible` through the exit by a delayed `visibility` transition, with pointer events off and the pane `inert` from the moment it closes. Transitions are plain CSS transitions, so a toggle mid-flight reverses from the current position. Override `--rui-sidebar-enter` and `--rui-sidebar-exit` on `.rui-sidebar` for custom timing.

Every mobile transition is gated on `[data-motion]` on the shell. The host adds it two frames after connect and removes it for the same span when the viewport crosses the breakpoint, so neither plays an animation. With `prefers-reduced-motion: reduce` the pane stays put and cross-fades with the scrim over `--duration-fast`. The scrim is always in the DOM (never `hidden`); CSS shows it only in mobile mode, and `visibility: hidden` on the closed shell keeps it out of the tab order and accessibility tree.
