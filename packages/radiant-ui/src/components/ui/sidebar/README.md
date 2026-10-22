# Sidebar

`rui-sidebar-trigger` uses its `controls` id to target one `rui-sidebar`. If that specified id is missing or names another element, the trigger stays unattached and clicking it does not toggle a different sidebar. Only a trigger without `controls` falls back to its closest sidebar. Clearing `controls` also clears a stale `aria-controls` when no sidebar is nearby.

The trigger mirrors the attached sidebar's state, mobile mode, and collapse mode through one observer. Its view owns the button markup; the behavior host writes the button's ARIA state and the trigger host's `data-sidebar-*` attributes.

The provider's `layout="docs"` site header uses the `--surface` background role and `--border` divider, matching site chrome that uses the surface role. The docs sidebar pane and inset use `--background`.

`sidebar.css` is layered in `@layer components` like the other components, so themes can restyle the sidebar, including its active item (`aria-current='page'` or `.rui-sidebar__menu-button--active`). The optional `sidebar.docs.css` skin stays unlayered and keeps its own active indicator: primary-colored text and a left bar.
