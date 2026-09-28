# Sidebar

`rui-sidebar-trigger` uses its `controls` id to target one `rui-sidebar`. If that specified id is missing or names another element, the trigger stays unattached and clicking it does not toggle a different sidebar. Only a trigger without `controls` falls back to its closest sidebar. Clearing `controls` also clears a stale `aria-controls` when no sidebar is nearby.

The trigger mirrors the attached sidebar's state, mobile mode, and collapse mode through one observer. Its view owns the button markup; the behavior host writes the button's ARIA state and the trigger host's `data-sidebar-*` attributes.
