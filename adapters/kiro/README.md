# Kiro Power adapters

Canvas Apps is generated separately so installing a canonical Kiro manifest cannot
change how existing Claude/Copilot clients load `plugins/canvas-apps`.

- `plugins/canvas-apps/`: original upstream plugin, unchanged by this adaptation
- `adapters/kiro/canvas-apps/`: Kiro host guidance, docs, and packaging checks
- `scripts/build-canvas-kiro-power.js`: deterministic copy/metadata/bootstrap adapter
- `powers/canvas-apps/`: complete generated installable Kiro Power; do not edit directly

From the repository root, using Node.js 20 or later:

```bash
node scripts/build-canvas-kiro-power.js
node scripts/build-canvas-kiro-power.js --check
node powers/canvas-apps/scripts/validate-package.js
node --test powers/canvas-apps/scripts/tests/*.test.js
```

Commit adapter/source changes and regenerated output together. All original skill
workflow bodies, role instructions, and reference documents remain bundled. Host
API substitutions and an explicit missing-validator preflight are additive.
Package copies are regular files so standalone and Windows installs do not depend
on symlinks. The generator overwrites only `powers/canvas-apps`.

The required upstream app acceptance validator is missing; authoring mode must fail
closed. This adapter does not implement a substitute. Do not claim that packaging
checks prove Kiro activation, MCP authentication, compilation, or app behavior.

Install from `powers/canvas-apps` following its `docs/kiro.md`. To update metadata,
change the source plugin or generator as appropriate, then rebuild. The generated
package retains upstream MIT attribution and identifies its fork-specific origin.
