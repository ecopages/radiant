# @ecopages/vite-plugin-radiant

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
