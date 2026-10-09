---
name: report-issue
description: >
  Use this skill when the user wants to "report a bug", "file an issue",
  "report an issue", "submit a bug report", or report any problem
  with the canvas-apps plugin to the GitHub repository.
user-invocable: true
argument-hint: "[optional: brief description of the bug]"
allowed-tools: Read, Bash, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList
model: sonnet
---

## Host compatibility (read first)

Read [HostCompatibility.md](../../references/HostCompatibility.md), resolved relative
to this installed SKILL.md, before following this workflow. It defines package-path
resolution, host tool equivalents, and the sequential specialist fallback. Preserve
every workflow and QA gate below. This guide takes precedence for host mechanics and
the setup-completion message; missing validation never implies authoring readiness.


**Workflow: [report-issue-workflow.md](${PLUGIN_ROOT}/skills/report-issue/report-issue-workflow.md)** — Read and follow all phases defined in that bundled file.
