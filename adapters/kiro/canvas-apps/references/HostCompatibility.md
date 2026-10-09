# Canvas Apps host compatibility

This guide changes host integration mechanics only. The create/edit workflows,
specialist instructions, discovery contracts, 44 named QA checks, acceptance
artifacts, user approvals, and compile gates remain authoritative.

## Resolve the installed package

Resolve this guide relative to the installed skill that loaded it:
`skills/<skill-name>/SKILL.md` is two directories below the Canvas package root.
Use the host-provided skill file location, not the current working directory or an
unrelated repository checkout. Verify the root contains a manifest named
`canvas-apps`, `references/QAChecks.md`, and this guide. On an existing host that
already supplies a valid `PLUGIN_ROOT`, retain that exact installed package path.
If the host supplies neither a readable skill path nor an established package root,
ask for the installed Canvas package location and verify it before proceeding.

In all workflow prose, `${PLUGIN_ROOT}` means this verified absolute package path.
It is notation, not a promise that the host interpolates Markdown. Substitute the
verified path explicitly in filesystem/tool arguments. Never infer it from the app
workspace, search for a newer sibling copy, or mix reference generations. Never
write into the installed package as part of app authoring. `$ARGUMENTS` means the
current user request when the host does not supply command arguments.

## Use available host tools

On Claude Code or another host that exposes the named tools, retain the existing
calls. On Kiro or any host with different tool names:

- Use the host's file read, exact edit/write, search, and terminal capabilities for
  `Read`, `Write`, `Edit`, `apply_patch`, `Glob`, `Grep`, `view`, `rg`, and `Bash`.
  Do not call a tool merely because its name appears in legacy frontmatter. An
  unavailable `apply_patch` can be replaced with an available exact file edit/write;
  an actual permission denial must still stop the affected work. Do not evade it.
- Use normal chat or the host's supported question UI for `AskUserQuestion`. Wait
  for the user's reply whenever the workflow requires confirmation. Use native
  planning/task tracking, or an explicit in-conversation checklist, for
  `EnterPlanMode`, `ExitPlanMode`, `TaskCreate`, `TaskUpdate`, and `TaskList`.
  Missing UI widgets never imply approval.
- Treat `allowed-tools`, `model`, and other client-specific frontmatter as host
  hints, not portable API names or a requirement to switch models. Use the model
  selected by the user when the host does not implement that hint.
- Discover Canvas MCP tools by their actual registered server and operation names.
  Kiro namespaces Power MCP servers, so `mcp__canvas-authoring__connect` and related
  names in the source are logical operations, not fixed Kiro identifiers. Choose
  only the Canvas Authoring server exposing the expected operations. If ambiguous,
  ask which installed server to use. Do not register a duplicate MCP server.

## Specialist execution

`agents/canvas-app-planner.md` and `agents/canvas-screen-builder.md` are bundled role
instructions. Portable Powers do not automatically install them as Kiro custom
agents. Where compatible native delegation exists, require the worker to read this compatibility guide first,
then provide the relevant role file and the complete original handoff. Include the
verified absolute package root and state that this guide takes precedence for host
mechanics (including exact edit/write substitutes for unavailable apply_patch). `Task`/`read_agent` mean dispatch and
wait through that host's supported facilities. Do not invent a `Task` API.

When no suitable delegation tool exists, the main agent executes those same roles
sequentially: read and follow the planner file, produce all required artifacts, then
return to the orchestrator's pre-dispatch checks. For each dispatch row, read and
follow the builder file, touch exactly its assigned screen, and produce the full
functional and QA report before accepting that row. One screen is a valid wave;
compile after each such wave. A sequential fallback must not omit discovery,
requirement coverage, briefs, any named QA check, evidence, or compile gates.

Resource discovery and MCP calls remain with the main agent. Preserve logical
ownership: planner writes CREATE App.pa.yaml; the orchestrator writes EDIT
App.pa.yaml; builders write only their assigned screens. Finish every worker before
the finalization barrier. After the last successful final compile, return the
summary without another tool call, exactly as ValidationWorkflow.md requires.

## Synchronization and permissions

This generated package is for Kiro. Existing Claude/Copilot users should keep
using the original plugin directory. The copied hooks are not Kiro hook registrations. Do not copy
their JSON into Kiro configuration or assume the reminder ran. Follow the skill's
explicit initial synchronization and round-trip gates. Sync only into a dedicated
YAML-only directory; never blindly synchronize an app directory containing planning
artifacts or uncompiled local changes. Stop on synchronization failure.

Connection/authentication, data-source additions, compilation and issue publication
retain the host's permission controls and the workflow's user approvals. Installing
a Power is not blanket approval to modify production apps or publish reports.

## Setup completion and authoring readiness

When configure-canvas-mcp succeeds, report connection and read-only discovery as
ready. Its upstream confirmation text suggesting immediate create/edit use is
conditional: check for scripts/validate-canvas-acceptance.cs before recommending
app authoring. If absent, explain that the current bundle lacks the required
acceptance validator and the canvas-app skill will stop before app mutations.
Never present a connected session as a fully validated authoring installation.

## Report issues from Kiro

For `report-issue`, retain all five phases, privacy warnings, environment-collection
consent, full preview, and publication approval. Read the root `plugin.json` for
metadata when present, falling back to `.plugin/plugin.json` for legacy installs.
Ask whether the issue is about this fork's Kiro integration or the upstream Canvas
plugin. Propose `kneely/power-platform-skills` for the former and
`microsoft/power-platform-skills` for the latter, and confirm the exact public
destination in the preview. Never send a Kiro adapter issue upstream automatically.
Ask for Kiro's version from its About UI instead of running `claude --version`;
collect .NET SDK details with consent. Collect PAC CLI details only if relevant.
Confirm `gh` is available/authenticated before publication, check whether the target
labels exist, and omit unsupported labels after showing the final preview. If `gh`
is unavailable, return a reviewable draft rather than claiming the issue was filed.

These conditional host adaptations take precedence over the bundled shared issue
workflow's Claude-specific commands and fixed repository examples. The shared
upstream workflow stays unchanged so its source copy can still be synchronized.

## Sources

- [Kiro Powers](https://kiro.dev/docs/powers/create/)
- [Agent Plugins specification](https://agent-plugins.org/specification)
- [Kiro custom agents](https://kiro.dev/docs/custom-agents/)
- [Kiro hooks](https://kiro.dev/docs/hooks/)
