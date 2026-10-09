# Canvas Apps in Kiro IDE

This folder is an Agent Plugins-format Power: `plugin.json` identifies it, `mcp.json`
launches Microsoft's Canvas Authoring MCP server, and `skills/` contains four
workflows. It shares the original Canvas references and specialist instructions
with the original Canvas plugin through a deterministic build. The original
`plugins/canvas-apps` package and all its client registrations remain unchanged. No legacy `POWER.md` conversion is needed.

## Current readiness

**The upstream acceptance validator is missing.** The source
`references/ValidationWorkflow.md` requires `scripts/validate-canvas-acceptance.cs`,
but that file and its claimed regression fixtures were absent at upstream commit
`25e30a29ffb3f0a638ee3f017bb7f2623230072c`. This Power preserves that gate and reports
`Status: Acceptance Validator Unavailable` before synchronization or app mutations.
Do not create a placeholder validator, remove the gate, or treat packaging tests as
app validation. Restore and verify the genuine validator and its dependencies before
attempting a create/edit smoke test.

You can install the Power and use connection setup, read-only control/connector
discovery, and the user-assisted add-data-source flow. Live Kiro activation, MCP
authentication, and Power Apps behavior require testing on your own authorized
nonproduction app; this conversion does not claim they have passed.

## Prerequisites

- A current Kiro version supporting Agent Plugins-format Powers
- .NET 10 SDK or later, including `dnx`; check `dotnet --list-sdks`
- An approved NuGet source containing `Microsoft.PowerApps.CanvasAuthoring.McpServer`
- An organizational account allowed to edit the intended Power Apps environment/app
- An existing saved Canvas App with coauthoring enabled and its Studio tab kept open

The MCP launcher is unchanged: `dnx Microsoft.PowerApps.CanvasAuthoring.McpServer --yes`.
The agent cannot create the initial app record or enable coauthoring. Credentials and
MCP permissions remain under Kiro and the official Microsoft authentication flow.
Never put credentials or real environment identifiers into this public repository.

## Install the exact folder

For an unmerged branch, clone this fork and check out the branch containing the
adapter. In Kiro, open **Powers → Add Custom Power → Import power from a folder**
and select `<checkout>/powers/canvas-apps`, the folder containing `plugin.json`.
Do not select the repository root or `.plugin` subfolder. Review the MCP integration
before enabling it. This does not require modifying user-level MCP settings.

After the adapter is merged, Kiro also supports **Import power from GitHub** with
`https://github.com/kneely/power-platform-skills`. Select Canvas Apps if Kiro offers
multiple packages. If your Kiro version does not expose the nested folder, use the
local-folder method above rather than inventing a repository URL parameter.

Current instructions: [install Powers](https://kiro.dev/docs/powers/installation/)
and [create Powers](https://kiro.dev/docs/powers/create/).

## Connect and discover

1. Open the saved app in Power Apps Studio and enable Settings → Updates → Coauthoring.
2. Keep the Studio browser tab open throughout the session.
3. Ask Kiro: “Connect the Canvas Apps MCP server to my app.”
4. Supply the Studio URL when asked and complete Microsoft's sign-in flow.
5. Ask: “List available Canvas App controls.” Verify results come from Canvas Authoring.

Kiro namespaces server names; tools may not have the literal names shown in the
original skill frontmatter. The compatibility guide tells the agent to use actual
registered Canvas operations. If tools are missing, verify Power activation, .NET,
NuGet access, and Kiro's server error before creating any manual MCP configuration.

## Workflow mapping

| Skill | Kiro behavior |
| --- | --- |
| `configure-canvas-mcp` | Connect to an existing Studio coauthoring session |
| `add-data-source` | Guide the user through Studio, wait for confirmation, verify schema |
| `canvas-app` | Original create/simple-edit/complex-edit workflows; blocked if acceptance validator is absent |
| `report-issue` | Preview and approve a public report; confirm fork versus upstream destination |

Every skill loads `references/HostCompatibility.md`. It resolves the installed
package path, maps legacy tool names to available host capabilities, and preserves
all approvals and validation. Specialist instructions run through supported native
delegation or sequentially in the main agent. The portable Power does not install
Kiro custom agents or hooks. The copied Claude/Copilot files are provenance only
in this Kiro distribution. Existing Claude/Copilot users should continue installing
`plugins/canvas-apps`; do not replace that install with this Kiro-only adapter.

## Verification

From the repository root, with Node.js 20 or later:

```bash
node powers/canvas-apps/scripts/validate-package.js
node --test powers/canvas-apps/scripts/tests/*.test.js
node scripts/validate-legacy-compatibility.js
node scripts/validate-skill-descriptions.js
```

Packaging checks exercise metadata parity, launch configuration, skill/reference
closure, host guidance, and missing-validator reporting. They do not launch the MCP
server, authenticate, compile an app, or prove Kiro UI behavior. Node is needed for
these developer checks, not for the Power's .NET MCP launcher.

```bash
node powers/canvas-apps/scripts/validate-package.js --authoring
```

This command exits nonzero while the required validator is missing. Its presence
alone does not establish correctness; run its regression suite when it is restored.

### Manual smoke-test checklist

- Import this exact folder and confirm the Canvas Power and its four skills load
- Trigger setup, verify the namespaced MCP operations, and connect to a disposable app
- List controls and existing sources; verify the live descriptions are used
- Ask to add a source; verify the agent waits for Studio completion and checks schema
- Ask for an edit with the validator missing; verify it reports the blocker before app mutations
- Once the genuine validator is restored and tested: exercise blank-app creation,
  a simple edit, and a complex multi-screen edit, including sequential role fallback
- Verify all named QA checks, acceptance validation, compile waves, server round trip,
  and the final compile barrier; inspect desktop and phone behavior in Studio
- Test issue reporting as a draft/preview only unless you intend to publish an issue

Keep `Runtime evaluation: NOT RUN` unless an actual runtime evaluation was performed
and its evidence recorded. Compilation and static conformance cannot prove visible
controls, reachable actions, or connector writes.

## Maintenance

Do not edit generated files under `powers/canvas-apps` directly. Source workflows
remain in `plugins/canvas-apps`; host-specific additions live in
`adapters/kiro/canvas-apps`. Rebuild from the repository root:

```bash
node scripts/build-canvas-kiro-power.js
node scripts/build-canvas-kiro-power.js --check
```

The generator copies the complete upstream Canvas bundle as regular files, adds
host guidance and readiness checks, emits canonical manifests, and bundles the MIT
license. It preserves the source workflow/reference bodies; the adapter guidance
only changes host mechanics and explicitly blocks the missing acceptance gate.
No symlinks or references outside the installed Power are needed. The generated
version adds a `-kiro.1` prerelease suffix to the source plugin version.

Commit the source/adapter changes and regenerated Power together. CI rejects drift
and runs package checks; it does not run the unavailable app acceptance validator.
The copied legacy manifests/MCP launcher are checked for consistency inside the
Power, while the original plugin directory retains its original loading behavior.
Retain [Microsoft's MIT license](../LICENSE) with standalone distributions.
