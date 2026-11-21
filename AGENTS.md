# AGENTS.md

Homey app (SDK v3, JavaScript) for the Timeular Tracker. Read `README.md` first — it is the hub.

- **Edit the compose sources**, never `app.json` by hand: `.homeycompose/`, `drivers/tracker/driver.compose.json`, `driver.flow.compose.json`. Run `homey app build` after.
- **Validate before committing:** `homey app validate --level publish`.
- **Protocol facts** live in `lib/protocol.js`. They were verified against a real tracker; change them only with a new observation.
- **Language:** English for code, docs and commits (published artefact). Every user-facing string in `en` and `fr`, completely — the App Store rejects partial translations.
- **Store text** (`README.txt`, `README.fr.txt`): plain text, one or two paragraphs, no Markdown, no URLs.
- **Testing on the bench:** the tracker can be probed from a Linux machine with `bleak`; it sleeps when still — ask the human to move it. Only one BLE central at a time: disconnect the bench before Homey connects.
- **Personal scene mappings** (which face does what) do not belong here: they live in the user's own Homey Flows.
