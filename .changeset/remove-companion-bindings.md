---
'@ecopages/radiant': minor
---

Remove `$name` companion bindings and the `bind` option on reactive members and decorators. Replace `{this.$count}` with `{this.$.count}` and declare the binding shape with `RadiantElement<{ count: number }>`. When `bind` supplied a custom name, use the reactive field's name in `this.$`.

Remove `ReactiveBindingOption` from `@ecopages/radiant/core/radiant-element` and remove the host's `defineReactiveBinding` and `shouldAutoBindReactiveMembers` methods. Use the host's binding namespace for reactive members.
