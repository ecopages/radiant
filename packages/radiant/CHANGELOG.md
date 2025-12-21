# @ecopages/radiant

## 0.2.0

### Minor Changes

- [#37](https://github.com/ecopages/radiant/pull/37) [`bf7d904`](https://github.com/ecopages/radiant/commit/bf7d9045b5c0ab06e8c111ff2a97e4ab6a278ab7) Thanks [@andeeplus](https://github.com/andeeplus)! - This update introduce the possibility to use stage 3 decorators. This refactor changed the RadiantElement class to be more concise and organised.

## 0.1.8

### Patch Changes

- [`dd0689c`](https://github.com/ecopages/radiant/commit/dd0689c36181be128d393c37e014396373ffda16) - Added @bound decorator to simplify the binding of methods that runs in untracked events

## 0.1.7

### Patch Changes

- [`1504dff`](https://github.com/ecopages/radiant/commit/1504dffb70da7dfd955faf61ea45f03b2427803b) - - Changed the way hydration on context occurs to follow the best practices for web components. Now the hydration data is not passed anymore as an attribute but using a script tag of type json with a `data-hydration` attribute.
    - Refactored `stringifyAttribute` to `stringifyTyped` for better clarity and flexibility. Updated the function to handle both JSON stringification and type preservation based on generic parameters. Now it is possible to return both the type (for jsx usage on atribute) or a string (i.e. for context hydration)

## 0.1.6

### Patch Changes

- [#31](https://github.com/ecopages/radiant/pull/31) [`1af1051`](https://github.com/ecopages/radiant/commit/1af1051af5f119e92690b3aa6a653075faddbc03) Thanks [@andeeplus](https://github.com/andeeplus)! - - added propertyConfigMap and updatesRegistry to keep a more detailed overview of the element.
    - Removed the prefixed property and just kept the base one to simplify the code in @reactiveProp
    - Added observedAttributes to keep track of the dom changes happening via setAttribute

## 0.1.5

### Patch Changes

- [#28](https://github.com/ecopages/radiant/pull/28) [`e6e083f`](https://github.com/ecopages/radiant/commit/e6e083fe6cdb0c021bf435f2e312c0d892c4867f) Thanks [@andeeplus](https://github.com/andeeplus)! - Added debounce decorator

- [#27](https://github.com/ecopages/radiant/pull/27) [`33434fd`](https://github.com/ecopages/radiant/commit/33434fd54342e99670c852709dd9546be13f3f71) Thanks [@andeeplus](https://github.com/andeeplus)! - Added the possibility to listen for window and document events using the onEvent decorator

## 0.1.4

### Patch Changes

- [#21](https://github.com/ecopages/radiant/pull/21) [`de834a6`](https://github.com/ecopages/radiant/commit/de834a6692da41f5c671abeb16ddc325367aca7e) Thanks [@andeeplus](https://github.com/andeeplus)! - Improved type control on reactiveProp decorator

## 0.1.3

### Patch Changes

- [#19](https://github.com/ecopages/radiant/pull/19) [`023e09c`](https://github.com/ecopages/radiant/commit/023e09c48ef4b8d0a34864c847475abf926baace) Thanks [@andeeplus](https://github.com/andeeplus)! - add defaultValue support to @reactiveProp decorator and improve attribute readers

## 0.1.2

### Patch Changes

- [#16](https://github.com/ecopages/radiant/pull/16) [`aeff3d8`](https://github.com/ecopages/radiant/commit/aeff3d827f59c326d130926e14c7060304e99852) Thanks [@andeeplus](https://github.com/andeeplus)! - Enhanced the @event decorator to ensure uniqueness of EventEmitter instances per class field by utilizing Symbol for keys, improving event handling isolation and configuration specificity.

## 0.1.1

### Patch Changes

- [#13](https://github.com/ecopages/radiant/pull/13) [`b1f6fe2`](https://github.com/ecopages/radiant/commit/b1f6fe27f61e4451f66dc2e188d5b6dfabc27d73) Thanks [@andeeplus](https://github.com/andeeplus)! - Updated query decorator logic and added playground to test it in a realenvironment, esbuild now can bundle the lib properly

## 0.1.0

### Minor Changes

- [#7](https://github.com/ecopages/radiant/pull/7) [`da5a521`](https://github.com/ecopages/radiant/commit/da5a52132d1fe3bc198d3d654dbf927c4fc676d2) Thanks [@andeeplus](https://github.com/andeeplus)! - This update prepares the package for public release. It includes necessary configurations and optimizations to ensure the package is ready for distribution.
