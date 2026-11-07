# @ecopages/vite-plugin-radiant

## 0.2.2

### Patch Changes

- [#638](https://github.com/ecopages/radiant/pull/638) [`4e8cc2d`](https://github.com/ecopages/radiant/commit/4e8cc2de239ff9fc433e5086eec073bedcbe4a61) Thanks [@andeeplus](https://github.com/andeeplus)! - The `nitro` peer range is now `^3` instead of `^3.0.260311-beta`. Nitro 3 publishes dated prereleases, and a prerelease range only matches its own version tuple, so the old range could not select a fixed release. Any Nitro 3 release is accepted, including the one that fixes the open redirect and the route-rule proxy scope bypass.
- Updated dependencies [[`2abd106`](https://github.com/ecopages/radiant/commit/2abd106079f005b388d49337da87118e5f51dabe)]:
    - @ecopages/radiant@0.8.1
    - @ecopages/jsx@0.8.1
    - @ecopages/signals@0.8.1

## 0.2.1

### Patch Changes

- Updated dependencies [[`786847b`](https://github.com/ecopages/radiant/commit/786847bf357488d556ae55246d065d3e6bbebc71), [`cabe09e`](https://github.com/ecopages/radiant/commit/cabe09ed8aa153864d40b2f04ac21dfafbfb9428), [`1f83249`](https://github.com/ecopages/radiant/commit/1f832490e487ef0f775a939d3f084b33902c9c39), [`c51327f`](https://github.com/ecopages/radiant/commit/c51327fa3d18f03a51527ed90c6c9671845ee487), [`bdd45b5`](https://github.com/ecopages/radiant/commit/bdd45b53ef136b0af26e30cd41357960f61dd32e), [`29500e8`](https://github.com/ecopages/radiant/commit/29500e818f8295e3496a408f326df48fb4f7067a), [`7455450`](https://github.com/ecopages/radiant/commit/7455450bcd1207303991cd74e8ad69c67873032d), [`df5747b`](https://github.com/ecopages/radiant/commit/df5747ba1ed3d69ac7a0aa59cd9085647ad97b65), [`77d430e`](https://github.com/ecopages/radiant/commit/77d430e864a4570b2b9c0af242fbc0de449e4094), [`985768c`](https://github.com/ecopages/radiant/commit/985768c652634565ffc5f2611e9b2b923085457f), [`61c48dc`](https://github.com/ecopages/radiant/commit/61c48dc4641d2a65414f931995ab33460963f242), [`27d5705`](https://github.com/ecopages/radiant/commit/27d57053c4a0124b867025bc6894bc1ee63c42f4), [`c05f033`](https://github.com/ecopages/radiant/commit/c05f0330e0ac37d6a48efb06875d68f6f55d1c85), [`28baef3`](https://github.com/ecopages/radiant/commit/28baef3940b6a6a5d4993d3909f787c2d3ef07f0)]:
    - @ecopages/jsx@0.7.0
    - @ecopages/radiant@0.7.0
    - @ecopages/signals@0.7.0

## 0.2.0

### Minor Changes

- [#502](https://github.com/ecopages/radiant/pull/502) [`21883b1`](https://github.com/ecopages/radiant/commit/21883b183f4b982beb0dc7fb41b77cda748854ab) Thanks [@andeeplus](https://github.com/andeeplus)! - **Breaking:** Remove the deprecated `radiantNitroExternals` alias. Import `radiantNitro` from the same entry instead.

### Patch Changes

- [#468](https://github.com/ecopages/radiant/pull/468) [`0197e16`](https://github.com/ecopages/radiant/commit/0197e16dbd34e70755807051b29c5ed868f6cb58) Thanks [@andeeplus](https://github.com/andeeplus)! - Strip `declare` class fields, such as `declare readonly [JSX_PROPS]?: Props`, before decorator lowering, so a decorated class that declares one compiles.

- [#464](https://github.com/ecopages/radiant/pull/464) [`ab9404f`](https://github.com/ecopages/radiant/commit/ab9404ff953a66222c6aa7a472ebf6b9adde7228) Thanks [@andeeplus](https://github.com/andeeplus)! - Use a registered custom-element class directly as a JSX element type (`<UserCard name="Ada" />`). Declare its public props with `declare readonly [JSX_PROPS]?: Props` (`import type { JSX_PROPS } from '@ecopages/jsx'`); a tag listed in `HTMLElementTagNameMap` gets the same props. JSX finds the tag from `@customElement(...)` metadata or `customElements.getName()`, on the server too. Rendering an unregistered class, or one that extends a built-in element other than `HTMLElement`, throws a `TypeError` naming the class. `CUSTOM_ELEMENT_TAG_NAME` and `getCustomElementTagName()` are exported from `@ecopages/jsx`. Existing `JsxCustomIntrinsicElements` augmentations keep working. `getCustomElementTagName()` resolves a class's own `@customElement(...)` tag, else its `customElements` registration (on the server too), so a subclass defined with `customElements.define()` renders, and server-renders, under its own tag instead of its parent's.
- Updated dependencies [[`4058bf9`](https://github.com/ecopages/radiant/commit/4058bf9c4a2cf98db9a50938c5ee0fdca7915ffd), [`1d35d3e`](https://github.com/ecopages/radiant/commit/1d35d3ed090dfbcc2819d03cf6beeae10e9d89ed), [`ab9404f`](https://github.com/ecopages/radiant/commit/ab9404ff953a66222c6aa7a472ebf6b9adde7228), [`977785f`](https://github.com/ecopages/radiant/commit/977785fc73b327648642d4eb3a317c6e19b7ffbb), [`817a98d`](https://github.com/ecopages/radiant/commit/817a98dd64b93d9fe08c2604b68d76949e61c669), [`a2789eb`](https://github.com/ecopages/radiant/commit/a2789ebb21f5c077fbb393a0fddae89d22d38477), [`719b466`](https://github.com/ecopages/radiant/commit/719b466308b749d2864b8e184dff1583e8c476dc), [`64010bf`](https://github.com/ecopages/radiant/commit/64010bf58e782ad78439f378d1e6aef9c234e87d), [`9234d6b`](https://github.com/ecopages/radiant/commit/9234d6bef0b29f4081a7b174aff240c3db703864), [`b5d2dad`](https://github.com/ecopages/radiant/commit/b5d2dade53815a474c11cddf7e32d3ea8fb87338), [`df1b225`](https://github.com/ecopages/radiant/commit/df1b2250e54f7245edcebc81e6207d96d226599d), [`f48dc1a`](https://github.com/ecopages/radiant/commit/f48dc1adbd1e43f6bfa3e0aa1ba2f28e3f3f3a4b), [`a7409b7`](https://github.com/ecopages/radiant/commit/a7409b7b8573d28c656230b5870dee7c6aed0dd3), [`828dd15`](https://github.com/ecopages/radiant/commit/828dd15882a04e81b98e152a4d5dbd78716f5393), [`76b8c27`](https://github.com/ecopages/radiant/commit/76b8c27e8e73db1b69ed1ba056c10b41232d43b1)]:
    - @ecopages/radiant@0.6.0
    - @ecopages/jsx@0.6.0
    - @ecopages/signals@0.6.0

## 0.1.1

### Patch Changes

- [#435](https://github.com/ecopages/radiant/pull/435) [`d78d2d0`](https://github.com/ecopages/radiant/commit/d78d2d08e438cfa89acc0c1d4d9da13ae796944d) Thanks [@andeeplus](https://github.com/andeeplus)! - Load server-discovered Radiant element modules before creating the app JSX so page-level hosts hydrate without late-definition rebuilds. The `bootstrap` callback now runs after those modules load and the hosts upgrade; move code that must run before a host connects into a module loaded earlier.
- Updated dependencies [[`49fb7bc`](https://github.com/ecopages/radiant/commit/49fb7bc6047677635cb54bca72d1407bc4736024), [`cf99195`](https://github.com/ecopages/radiant/commit/cf99195398fcea80d4fe305f5478635d56fb15a7), [`6c0c391`](https://github.com/ecopages/radiant/commit/6c0c391f9304fda1156f3241c4d3fdbff68d6c50), [`a212331`](https://github.com/ecopages/radiant/commit/a2123318f90aa39d759de50047ba816bb3653532), [`eb9bbde`](https://github.com/ecopages/radiant/commit/eb9bbde483950e544fdc490c4cf0a660a9cd5a28), [`9ee89f9`](https://github.com/ecopages/radiant/commit/9ee89f964fdffc0f7ae3e9a727a02cff3a306115), [`4f73e51`](https://github.com/ecopages/radiant/commit/4f73e51003ad801448614461528930e2e2b5036d), [`7a8d32b`](https://github.com/ecopages/radiant/commit/7a8d32b97e9fb883be3b05c13814d2a45b81d91f), [`78b36b6`](https://github.com/ecopages/radiant/commit/78b36b6ec11f2213136db1d911546139fa0860b3), [`f1bbbf6`](https://github.com/ecopages/radiant/commit/f1bbbf6b8edd833e2b934779857338c5013c83d1), [`a806505`](https://github.com/ecopages/radiant/commit/a806505a57bd6f0b36b9eafbb16a61c985f487d0)]:
    - @ecopages/radiant@0.5.1
    - @ecopages/jsx@0.5.1
    - @ecopages/signals@0.5.1

## 0.1.0

First stable of the Radiant Vite 8 plugin: deterministic registry HMR, AST-based component discovery, and structural SSR document usage scanning. Requires Vite 8+. Registry changes trigger a full dev-server reload.

### Minor Changes

- [#75](https://github.com/ecopages/radiant/pull/75) [`77ab12f`](https://github.com/ecopages/radiant/commit/77ab12ff9910aa2d9d035054914c395836bf792c) Thanks [@andeeplus](https://github.com/andeeplus)! - First publishable Vite 8 plugin with registry HMR, AST component discovery, and SSR document usage scanning.

### Patch Changes

- Updated dependencies:
    - `@ecopages/radiant@0.3.0`
    - `@ecopages/jsx@0.3.0`
    - `@ecopages/signals@0.3.0`
