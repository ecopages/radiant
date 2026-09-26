# Controller decorator visualizer

The server view composes `RuiRadioGroup`, but that server import does not register its custom element in the browser. The client script imports `@ecopages/radiant-ui/radio-group` so the host can give every radio the same name and synchronize its selected value. The controller listens to the resulting native `change` events and updates the authored status nodes.

The browser test clicks Ready, Focus, and Alert as a user would, and checks that only one radio remains selected. Dispatching a synthetic click event without changing native input state would miss this regression.
