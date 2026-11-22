---
'@ecopages/radiant': patch
---

Add experimental WebMCP agent tools: `registerAgentTool` registers a tool and returns its unregister function, `createAgentTool(host, config)` ties one to a host's connect and disconnect, and `@agentTool` turns a method into a tool while keeping it callable from the UI. The tool is passed through to `document.modelContext` and registered again after every reconnect or change of `name` or `getEnabled`.
