# @ecopages/storybook-radiant-vite

## 0.2.0

### Patch Changes

- [#464](https://github.com/ecopages/radiant/pull/464) [`ab9404f`](https://github.com/ecopages/radiant/commit/ab9404ff953a66222c6aa7a472ebf6b9adde7228) Thanks [@andeeplus](https://github.com/andeeplus)! - Use a registered custom-element class directly as a JSX element type (`<UserCard name="Ada" />`). Declare its public props with `declare readonly [JSX_PROPS]?: Props` (`import type { JSX_PROPS } from '@ecopages/jsx'`); a tag listed in `HTMLElementTagNameMap` gets the same props. JSX finds the tag from `@customElement(...)` metadata or `customElements.getName()`, on the server too. Rendering an unregistered class, or one that extends a built-in element other than `HTMLElement`, throws a `TypeError` naming the class. `CUSTOM_ELEMENT_TAG_NAME` and `getCustomElementTagName()` are exported from `@ecopages/jsx`. Existing `JsxCustomIntrinsicElements` augmentations keep working. `getCustomElementTagName()` resolves a class's own `@customElement(...)` tag, else its `customElements` registration (on the server too), so a subclass defined with `customElements.define()` renders, and server-renders, under its own tag instead of its parent's.

- [#502](https://github.com/ecopages/radiant/pull/502) [`db4b297`](https://github.com/ecopages/radiant/commit/db4b297aebbe76657c45d52ce7fbd34319969796) Thanks [@andeeplus](https://github.com/andeeplus)! - Remove the unused internal `inferScriptModuleFromViewModule` helper. It was not a package export.
- Updated dependencies [[`0197e16`](https://github.com/ecopages/radiant/commit/0197e16dbd34e70755807051b29c5ed868f6cb58), [`4058bf9`](https://github.com/ecopages/radiant/commit/4058bf9c4a2cf98db9a50938c5ee0fdca7915ffd), [`1d35d3e`](https://github.com/ecopages/radiant/commit/1d35d3ed090dfbcc2819d03cf6beeae10e9d89ed), [`ab9404f`](https://github.com/ecopages/radiant/commit/ab9404ff953a66222c6aa7a472ebf6b9adde7228), [`977785f`](https://github.com/ecopages/radiant/commit/977785fc73b327648642d4eb3a317c6e19b7ffbb), [`817a98d`](https://github.com/ecopages/radiant/commit/817a98dd64b93d9fe08c2604b68d76949e61c669), [`a2789eb`](https://github.com/ecopages/radiant/commit/a2789ebb21f5c077fbb393a0fddae89d22d38477), [`719b466`](https://github.com/ecopages/radiant/commit/719b466308b749d2864b8e184dff1583e8c476dc), [`64010bf`](https://github.com/ecopages/radiant/commit/64010bf58e782ad78439f378d1e6aef9c234e87d), [`9234d6b`](https://github.com/ecopages/radiant/commit/9234d6bef0b29f4081a7b174aff240c3db703864), [`21883b1`](https://github.com/ecopages/radiant/commit/21883b183f4b982beb0dc7fb41b77cda748854ab), [`b5d2dad`](https://github.com/ecopages/radiant/commit/b5d2dade53815a474c11cddf7e32d3ea8fb87338), [`df1b225`](https://github.com/ecopages/radiant/commit/df1b2250e54f7245edcebc81e6207d96d226599d), [`f48dc1a`](https://github.com/ecopages/radiant/commit/f48dc1adbd1e43f6bfa3e0aa1ba2f28e3f3f3a4b), [`a7409b7`](https://github.com/ecopages/radiant/commit/a7409b7b8573d28c656230b5870dee7c6aed0dd3), [`828dd15`](https://github.com/ecopages/radiant/commit/828dd15882a04e81b98e152a4d5dbd78716f5393), [`76b8c27`](https://github.com/ecopages/radiant/commit/76b8c27e8e73db1b69ed1ba056c10b41232d43b1)]:
    - @ecopages/vite-plugin-radiant@0.2.0
    - @ecopages/radiant@0.6.0
    - @ecopages/jsx@0.6.0
    - @ecopages/signals@0.6.0

## 0.1.1

### Patch Changes

- [#435](https://github.com/ecopages/radiant/pull/435) [`d78d2d0`](https://github.com/ecopages/radiant/commit/d78d2d08e438cfa89acc0c1d4d9da13ae796944d) Thanks [@andeeplus](https://github.com/andeeplus)! - Load server-discovered Radiant element modules before creating the app JSX so page-level hosts hydrate without late-definition rebuilds. The `bootstrap` callback now runs after those modules load and the hosts upgrade; move code that must run before a host connects into a module loaded earlier.
- Updated dependencies [[`49fb7bc`](https://github.com/ecopages/radiant/commit/49fb7bc6047677635cb54bca72d1407bc4736024), [`cf99195`](https://github.com/ecopages/radiant/commit/cf99195398fcea80d4fe305f5478635d56fb15a7), [`6c0c391`](https://github.com/ecopages/radiant/commit/6c0c391f9304fda1156f3241c4d3fdbff68d6c50), [`a212331`](https://github.com/ecopages/radiant/commit/a2123318f90aa39d759de50047ba816bb3653532), [`eb9bbde`](https://github.com/ecopages/radiant/commit/eb9bbde483950e544fdc490c4cf0a660a9cd5a28), [`9ee89f9`](https://github.com/ecopages/radiant/commit/9ee89f964fdffc0f7ae3e9a727a02cff3a306115), [`4f73e51`](https://github.com/ecopages/radiant/commit/4f73e51003ad801448614461528930e2e2b5036d), [`7a8d32b`](https://github.com/ecopages/radiant/commit/7a8d32b97e9fb883be3b05c13814d2a45b81d91f), [`78b36b6`](https://github.com/ecopages/radiant/commit/78b36b6ec11f2213136db1d911546139fa0860b3), [`f1bbbf6`](https://github.com/ecopages/radiant/commit/f1bbbf6b8edd833e2b934779857338c5013c83d1), [`d78d2d0`](https://github.com/ecopages/radiant/commit/d78d2d08e438cfa89acc0c1d4d9da13ae796944d), [`a806505`](https://github.com/ecopages/radiant/commit/a806505a57bd6f0b36b9eafbb16a61c985f487d0)]:
    - @ecopages/radiant@0.5.1
    - @ecopages/jsx@0.5.1
    - @ecopages/vite-plugin-radiant@0.1.1
    - @ecopages/signals@0.5.1

## 0.1.0

First stable of the Storybook Vite framework for Radiant (client and SSR → hydrate story modes).

### Minor Changes

- First publish of the Storybook Vite framework for Radiant.

### Patch Changes

- [#214](https://github.com/ecopages/radiant/pull/214) [`90304d9`](https://github.com/ecopages/radiant/commit/90304d98a4146a05a0c8e3a864794c8d42ec5073) Thanks [@andeeplus](https://github.com/andeeplus)! - Install required Storybook preview packages on Node `globalThis` during Vite SSR so `ssrLoadModule` can evaluate stories and shared helper modules that import `storybook/test` and sibling preview packages.

- Updated dependencies:
    - `@ecopages/radiant@0.3.0`
    - `@ecopages/jsx@0.3.0`
    - `@ecopages/vite-plugin-radiant@0.1.0`
    - `@ecopages/signals@0.3.0`
