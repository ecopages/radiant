---
'@ecopages/radiant-ui': patch
---

Add `CopyController` and `MediaRecorderController` to `@ecopages/radiant-ui/controllers`. `createCopyController` copies text to the clipboard on a click and reports `idle`, `copied` or `error` as `data-copy-state`, with an announcement callback. `createMediaRecorderController` records the microphone or camera with permission states, pause, a time limit, a result URL it revokes and a stream other controllers can read.
