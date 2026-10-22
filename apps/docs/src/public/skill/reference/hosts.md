# Hosts

## Contents

- RadiantElement vs RadiantController
- Public props vs internal bindings

## RadiantElement vs RadiantController

Default to `RadiantElement` when the host should own a custom-element view.

Choose `RadiantController` when behavior should attach to existing DOM without defining a custom element.

Both share the same decorator-driven reactive model. `@event` and `@querySlot` need a `RadiantElement`; a controller cannot use them.

Choose a simpler `RadiantElement` shape when the host is mainly authored light DOM, string-template based, or a lower-level custom element embedded inside another JSX tree. Copy fields onto that DOM with `@bindTo`. `this.$` is for hosts that override `render()`. `@onUpdated` is for procedures, not those copies.

## Public props vs internal bindings

Separate surfaces:

- **Public props** — what consumers may pass from JSX or attributes
- **Internal bindings** — what `this.$`, `this.bindings`, and `this.bind(...)` expose inside the component

If the external API and internal reactive surface differ, use separate types.

```tsx
import { RadiantElement, prop, state } from '@ecopages/radiant';

export type UserCardProps = {
	name?: string;
	avatarUrl?: string;
};

type UserCardBindings = UserCardProps & {
	isExpanded: boolean;
};

export class UserCard extends RadiantElement<UserCardBindings> {
	@prop({ type: String, defaultValue: 'Anonymous' }) name!: string;
	@prop({ type: String, defaultValue: '' }) avatarUrl!: string;
	@state isExpanded = false;
}
```

If the component never uses `this.$`, `this.bindings`, or `this.bind(...)`, omit the generic.
